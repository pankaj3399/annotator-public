'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Group, Message, UserGroup } from "@/models/chat";
import mongoose from 'mongoose';
import { getServerSession } from "next-auth";

export async function updateLastReadMessage(groupId: string, messageId: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions)
  try {
    await UserGroup.findOneAndUpdate(
      { group: groupId, user: session?.user.id },
      { lastReadMessage: messageId },
    );
  } catch (error) {
    console.error('Error updating last read message:', error);
    return { error: 'Server error' }
  }
};

export async function sendMessage(groupId: string, message: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions)
  try {
    const newMessage = await Message.create({
      group: groupId,
      sender: session?.user.id,
      content: message
    });
    await Group.updateOne({ _id: groupId }, { lastMessage: newMessage });

    return { message: JSON.stringify(newMessage) }
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Server error' }
  }
};

export async function deleteGroup(groupId: string) {
  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Step 1: Delete messages associated with the group
    await Message.deleteMany({ group: groupId }, { session });

    // Step 2: Delete UserGroup entries associated with the group
    await UserGroup.deleteMany({ group: groupId }, { session });

    // Step 3: Delete the group itself
    const deletedGroup = await Group.findByIdAndDelete(groupId, { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    if (!deletedGroup) {
      return { success: false, message: 'Group not found' };
    }

    return { success: true, message: 'Group and associated data deleted successfully' };

  } catch (error) {
    console.error('Error deleting group:', error);
    await session.abortTransaction();
    session.endSession();
    return { success: false, error: 'Failed to delete group and associated data' };
  }
};