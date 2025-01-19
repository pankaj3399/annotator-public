import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Group, UserGroup } from "@/models/chat";
import mongoose from 'mongoose';
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  const serverSession = await getServerSession(authOptions);
  const { groupId, name, members } = await req.json();

  try {
    session.startTransaction();

    if (name) {
      await Group.findByIdAndUpdate(groupId, { name }, { new: true, session });
    }

    const currentGroup = await Group.findById(groupId)
    const currentMemberIds = currentGroup?.members.map((member: mongoose.Types.ObjectId) => member.toString());


    const membersToRemove = currentMemberIds.filter((id: string) => !members.includes(id));
    const membersToAdd = members.filter((id: string) => !currentMemberIds.includes(id));


    if (membersToRemove.length > 0) {
      await UserGroup.deleteMany({ user: { $in: membersToRemove }, group: groupId }, { session });
    }

    if (membersToAdd.length > 0) {
      const newUserGroupDocs = membersToAdd.map((userId: string) => ({
        user: userId,
        group: groupId,
        joined_at: Date.now(),
      }));

      await UserGroup.insertMany(newUserGroupDocs, { session });
    }

    if (membersToRemove.length > 0) {
      await Group.findByIdAndUpdate(groupId, {
        $pull: { members: { $in: membersToRemove } },
      }, { new: true, session });
    }

    if (membersToAdd.length > 0 || !currentMemberIds.includes(serverSession?.user.id)) {
      await Group.findByIdAndUpdate(groupId, {
        $addToSet: { members: { $each: [...membersToAdd, serverSession?.user.id] } },
      }, { new: true, session });
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      message: 'Group updated successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating group and managing members:', error);
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, error: 'Failed to update group and manage members' }, { status: 500 });
  }
}
