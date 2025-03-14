// app/actions/user.ts
'use server'

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Team } from "@/models/Team";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import EnrolledCourse from "@/models/EnrolledCourse";
import { CustomField } from "@/models/CustomField";
import { Project } from "@/models/Project";
import Task from "@/models/Task";
import { TaskRepeat } from "@/models/TaskRepeat";
import { Template } from "@/models/Template";
import Rework from "@/models/Rework";
import { BenchmarkProposal } from "@/models/BenchmarkProposal";
import { Guideline } from "@/models/Guideline";
import { InvitedUsers } from "@/models/InvitedUsers";
import { Wishlist } from "@/models/Wishlist";
import { ReviewAndRatings } from "@/models/ReviewAndRatings";
import JobPost from "@/models/JobPost";
import JobApplication from "@/models/JobApplication";
import { Group, Message, UserGroup } from "@/models/chat";
import { AIJob, AImodel } from "@/models/aiModel";
import { bankDetail } from "@/models/bank";

export async function updateUserTeam(userId: string, teamId: string) {
  console.log("updateUserTeam action called:", { userId, teamId });
  
  try {
    await connectToDatabase();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      console.error("User not found:", userId);
      return { success: false, error: "User not found" };
    }
    
    console.log("Found user:", user.email);
    
    // Update the user with team ID
    user.team_id = teamId;
    await user.save();
    
    console.log("Updated user with team ID:", teamId);
    
    // Add user to team members
    const team = await Team.findById(teamId);
    
    if (!team) {
      console.error("Team not found:", teamId);
      return { success: true, user: user, teamFound: false };
    }
    
    console.log("Found team:", team.name);
    
    // Add user to team members if not already a member
    if (!team.members.includes(user._id)) {
      team.members.push(user._id);
      await team.save();
      console.log("Added user to team members");
    } else {
      console.log("User already in team members");
    }
    
    // Revalidate dashboard path
    revalidatePath('/dashboard');
    
    return { 
      success: true, 
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        team_id: user.team_id?.toString()
      },
      team: {
        id: team._id.toString(),
        name: team.name
      }
    };
  } catch (error) {
    console.error("Error updating user team:", error);
    return { success: false, error: "Failed to update user team" };
  }
}

export async function deleteUser(userId: string) {
  console.log("deleteUser action called:", { userId });
  
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, error: "Invalid user ID" };
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await connectToDatabase();
    
    // Find the user to ensure it exists and is an annotator
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: "User not found" };
    }
    
    if (user.role !== "annotator") {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: "Only annotator users can be deleted with this function" };
    }
    
    console.log(`Found annotator: ${user.name} (${user.email})`);
    
    // 1. Handle User Teams
    if (user.team_id) {
      await Team.updateOne(
        { _id: user.team_id },
        { $pull: { members: userId } },
        { session }
      );
      console.log(`Removed user from team: ${user.team_id}`);
    }
    
    // 2. Handle Enrolled Courses
    const enrolledCoursesResult = await EnrolledCourse.deleteMany(
      { user: userId },
      { session }
    );
    console.log(`Deleted ${enrolledCoursesResult.deletedCount} enrolled courses`);
    
    // 3. Handle Projects
    // Note: We don't delete projects since they may be managed by others,
    // but we remove this user's association if they are assigned
    
    // 4. Handle Tasks
    // Option 1: Unassign the user from tasks rather than deleting them
    const tasksResult = await Task.updateMany(
      { annotator: userId },
      { $set: { annotator: null, status: "pending" } },
      { session }
    );
    console.log(`Unassigned user from ${tasksResult.modifiedCount} tasks`);
    
    const reviewTasksResult = await Task.updateMany(
      { reviewer: userId },
      { $set: { reviewer: null } },
      { session }
    );
    console.log(`Unassigned user as reviewer from ${reviewTasksResult.modifiedCount} tasks`);
    
    // 5. Handle Task Repeats
    const taskRepeatsResult = await TaskRepeat.updateMany(
      { annotator: userId },
      { $set: { annotator: null, status: "pending" } },
      { session }
    );
    console.log(`Unassigned user from ${taskRepeatsResult.modifiedCount} task repeats`);
    
    const reviewTaskRepeatsResult = await TaskRepeat.updateMany(
      { reviewer: userId },
      { $set: { reviewer: null } },
      { session }
    );
    console.log(`Unassigned user as reviewer from ${reviewTaskRepeatsResult.modifiedCount} task repeats`);
    
    // 6. Handle Rework
    const reworkResult = await Rework.updateMany(
      { annotator: userId },
      { $set: { annotator: null } },
      { session }
    );
    console.log(`Unassigned user from ${reworkResult.modifiedCount} rework items`);
    
    const reviewReworkResult = await Rework.updateMany(
      { reviewer: userId },
      { $set: { reviewer: null } },
      { session }
    );
    console.log(`Unassigned user as reviewer from ${reviewReworkResult.modifiedCount} rework items`);
    
    // 7. Handle Benchmark Proposals
    // Option: Keep proposals but mark them as orphaned
    const benchmarkProposalsResult = await BenchmarkProposal.updateMany(
      { user: userId },
      { $set: { user: null, status: 'orphaned' } },
      { session }
    );
    console.log(`Updated ${benchmarkProposalsResult.modifiedCount} benchmark proposals to orphaned`);
    
    // 8. Clean up guideline messages
    // Remove user references from guideline messages (keep messages but anonymize them)
    await Guideline.updateMany(
      { "messages.sender": userId },
      { $set: { "messages.$[elem].sender": null } },
      { 
        arrayFilters: [{ "elem.sender": userId }],
        session 
      }
    );
    console.log("Anonymized user's guideline messages");
    
    // 9. Clean up chat-related data
    // Delete messages sent by the user
    const messagesResult = await Message.deleteMany(
      { sender: userId },
      { session }
    );
    console.log(`Deleted ${messagesResult.deletedCount} messages`);
    
    // Remove user from all groups
    await Group.updateMany(
      { members: userId },
      { $pull: { members: userId } },
      { session }
    );
    console.log("Removed user from all groups");
    
    // Handle groups where the user is the project manager
    const managedGroups = await Group.find(
      { projectManager: userId },
      null,
      { session }
    );
    
    if (managedGroups.length > 0) {
      // Option: Delete groups managed by this user
      const groupIds = managedGroups.map(group => group._id);
      
      // Delete all messages in these groups
      await Message.deleteMany(
        { group: { $in: groupIds } },
        { session }
      );
      
      // Delete user-group associations
      await UserGroup.deleteMany(
        { group: { $in: groupIds } },
        { session }
      );
      
      // Delete the groups
      await Group.deleteMany(
        { _id: { $in: groupIds } },
        { session }
      );
      
      console.log(`Deleted ${managedGroups.length} groups managed by the user`);
    }
    
    // Remove user's group memberships
    await UserGroup.deleteMany(
      { user: userId },
      { session }
    );
    console.log("Removed user from all group memberships");
    
    // 10. Handle Invited Users
    // Update invitations where this user was accepted
    await InvitedUsers.updateMany(
      { acceptedBy: userId },
      { $set: { acceptedBy: null, status: "pending" } },
      { session }
    );
    console.log("Reset any invitations accepted by this user");
    
    // 11. Delete user's bank details
    const bankResult = await bankDetail.deleteMany(
      { user: userId },
      { session }
    );
    console.log(`Deleted ${bankResult.deletedCount} bank details`);
    
    // 12. Handle AI models and jobs
    // Delete AI jobs
    const aiJobsResult = await AIJob.deleteMany(
      { user: userId },
      { session }
    );
    console.log(`Deleted ${aiJobsResult.deletedCount} AI jobs`);
    
    // Delete AI models
    const aiModelsResult = await AImodel.deleteMany(
      { user: userId },
      { session }
    );
    console.log(`Deleted ${aiModelsResult.deletedCount} AI models`);
    
    // 13. Handle Wishlist
    const wishlistResult = await Wishlist.deleteMany(
      { expert: userId },
      { session }
    );
    console.log(`Deleted ${wishlistResult.deletedCount} wishlists`);
    
    // Update payment_data where the user paid
    await Wishlist.updateMany(
      { "items.payment_data.paid_by": userId },
      { $set: { "items.$[elem].payment_data.paid_by": null } },
      { 
        arrayFilters: [{ "elem.payment_data.paid_by": userId }],
        session 
      }
    );
    console.log("Anonymized user's payment data in wishlists");
    
    // 14. Handle Review and Ratings
    // Delete review document for this user
    await ReviewAndRatings.deleteMany(
      { userId: userId },
      { session }
    );
    console.log("Deleted user's reviews and ratings");
    
    // Remove this user's ratings from other users' documents
    await ReviewAndRatings.updateMany(
      { "ratings.givenBy": userId },
      { $pull: { ratings: { givenBy: userId } } },
      { session }
    );
    console.log("Removed user's ratings from other users");
    
    // Remove this user's reviews from other users' documents
    await ReviewAndRatings.updateMany(
      { "reviews.givenBy": userId },
      { $pull: { reviews: { givenBy: userId } } },
      { session }
    );
    console.log("Removed user's reviews from other users");
    
    // Recalculate average ratings where needed
    const affectedReviews = await ReviewAndRatings.find(
      { $or: [{ "ratings.givenBy": userId }, { "reviews.givenBy": userId }] },
      null,
      { session }
    );
    
    for (const review of affectedReviews) {
      review.calculateAvgRating();
      review.lastUpdated = new Date();
      await review.save({ session });
    }
    
    // 15. Handle Job Applications
    const jobApplicationsResult = await JobApplication.deleteMany(
      { userId: userId },
      { session }
    );
    console.log(`Deleted ${jobApplicationsResult.deletedCount} job applications`);
    
    // 16. Finally, delete the user
    await User.deleteOne({ _id: userId }, { session });
    console.log("User deleted successfully");
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/users');
    revalidatePath('/teams');
    revalidatePath('/projects');
    revalidatePath('/jobs');
    
    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error("Error deleting user:", error);
    return { 
      success: false, 
      error: "Failed to delete user", 
      details: error instanceof Error ? error.message : String(error) 
    };
  }
}