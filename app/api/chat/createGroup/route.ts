import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import mongoose from 'mongoose';
import { Group, UserGroup } from "@/models/chat";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  const serverSession = await getServerSession(authOptions)

  const { groupName, members } = await req.json();
  try {
    session.startTransaction();

    const newGroup = await Group.create([{
      name: groupName,
      projectManager: serverSession?.user.id,
      created_at: Date.now()
    }], { new: true, session });

    const groupId = newGroup[0]._id;

    const userGroupDocs = members.map((userId: string) => ({
      user: userId,
      group: groupId,
      joined_at: Date.now()
    }));

    userGroupDocs.push({
      user: serverSession?.user.id as string,
      group: groupId,
      joined_at: Date.now()
    });

    await UserGroup.insertMany(userGroupDocs, { session });

    const group = await Group.findByIdAndUpdate(groupId, {
      $addToSet: { members: { $each: [...members, serverSession?.user.id] } } // Add users and project manager
    }, { new: true, session })
      .populate('members', 'name email');

    await session.commitTransaction();
    session.endSession();

    const updatedUserGroup = await UserGroup.findOne({ group: groupId, user: serverSession?.user.id });

    updatedUserGroup.group = group;

    return NextResponse.json({ success: true, message: 'Group created and users added successfully', userGroups: updatedUserGroup }, { status: 200 });

  } catch (error) {
    console.error('Error creating group and adding users:', error);
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, error: 'Failed to create group and add multiple users' }, { status: 500 });
  }
}