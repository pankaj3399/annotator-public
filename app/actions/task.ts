"use server";
import mongoose from "mongoose";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import { Template } from "@/models/Template";
import { User } from "@/models/User";
import { TaskRepeat } from "@/models/TaskRepeat";
import { template } from "../template/page";
import NotificationTemplate from "@/models/NotificationTemplate";
import Rework from "@/models/Rework";
import nodemailer from 'nodemailer';
import { AIJob } from "@/models/aiModel";
import { Project } from "@/models/Project";
import AnnotatorHistory from "@/models/points";
import { Annotator, RepeatTask } from "@/components/taskDialog";
import { sendEmail } from "@/lib/email";
import { getAllAnnotators } from "./annotator";


export async function getTestTemplateTasks() {
  await connectToDatabase();
  try {
    const repeatTasks = await TaskRepeat.find({});

    console.log("repeat tasks from TaskRepeat", repeatTasks);

    if (!repeatTasks.length) {
      return JSON.stringify({
        success: false,
        message: "No tasks found for test template in TaskRepeat",
      });
    }

    return JSON.stringify({
      success: true,
      tasks: repeatTasks,
      count: repeatTasks.length,
    });
  } catch (error) {
    console.error("Error fetching test template tasks:", error);
    return JSON.stringify({
      success: false,
      error: "Failed to fetch test template tasks",
      details: (error as Error).message,
    });
  }
}

export async function updateTask(
  template: template,
  _id: string,
  projectid: string,
  time: number
) {
  await connectToDatabase();

  const res = await Task.findOneAndUpdate(
    { _id },
    {
      ...template,
      content: template.content,
      submitted: true,
      project: projectid,
      timeTaken: time,
    }
  );
  const response = await compareWithGroundTruth(_id, false)
  console.log(response)
  return JSON.stringify(res);
}

export async function compareWithGroundTruth(taskId: string, throwError: boolean = true) {
  try {
    const task = await Task.findById(taskId);
    const template = await Template.findById(task.template);

    if (!task || !template) {
      throw new Error("Task or template not found");
    }

    if (!template.groundTruthTask) {
      if (throwError) {
        throw new Error("Ground truth not set");
      }
      return { pointsEarned: 0, comparisonResult: false };
    }

    const groundTruthTask = await Task.findById(template.groundTruthTask);

    if (!groundTruthTask) {
      if (throwError) {
        throw new Error("Ground truth task not found");
      }
      return { pointsEarned: 0, comparisonResult: false };
    }

    const projectId = task.project;
    const annotatorId = task.annotator;

    let pointsEarned = 0;
    let comparisonResult = false;

    const extractContent = (content: string) => {
      try {
        const parsedContent = JSON.parse(content);
        const results = {
          inputTexts: [] as string[],
          checkboxes: [] as string[][],
        };

        const processContent = (items: any[]) => {
          items.forEach((item: any) => {
            if (item.content) {
              if (Array.isArray(item.content)) {
                processContent(item.content);
              } else {
                if (item.type === "inputText") {
                  results.inputTexts.push(item.content?.innerText || "");
                } else if (item.type === "checkbox") {
                  results.checkboxes.push(item.content?.selectedCheckbox || []);
                }
              }
            }
          });
        };

        processContent(parsedContent);
        return results;
      } catch (error) {
        console.error("Error parsing content:", error);
        return { inputTexts: [], checkboxes: [] };
      }
    };

    const userContent = extractContent(task.content);
    const groundTruthContent = extractContent(groundTruthTask.content);

    // Compare input texts
    if (userContent.inputTexts.length !== groundTruthContent.inputTexts.length) {
      throw new Error("Mismatch in number of inputText fields");
    }

    for (let i = 0; i < userContent.inputTexts.length; i++) {
      const userInput = userContent.inputTexts[i].trim().toLowerCase();
      const groundTruthInput = groundTruthContent.inputTexts[i].trim().toLowerCase();

      if (userInput === groundTruthInput) {
        pointsEarned++;
        comparisonResult = true;
      }
    }

    // Compare checkboxes
    if (userContent.checkboxes.length !== groundTruthContent.checkboxes.length) {
      throw new Error("Mismatch in number of checkbox fields");
    }

    for (let i = 0; i < userContent.checkboxes.length; i++) {
      const userCheckboxArray = userContent.checkboxes[i].sort();
      const groundTruthCheckboxArray = groundTruthContent.checkboxes[i].sort();

      if (userCheckboxArray.length === groundTruthCheckboxArray.length &&
        userCheckboxArray.every((value, index) => value === groundTruthCheckboxArray[index])) {
        pointsEarned++;
        comparisonResult = true;
      }
    }

    // Update task status based on comparison result
    if (comparisonResult) {
      await Task.findByIdAndUpdate(taskId, { status: "accepted" });
    } else {
      await Task.findByIdAndUpdate(taskId, { status: "rejected" });
    }

    // Handle annotator history
    const annotatorHistory = await AnnotatorHistory.findOne({
      annotator: annotatorId,
      project: projectId,
    });

    // Format answers for history
    const formatAnswer = (content: { inputTexts: string[], checkboxes: string[][] }) => {
      return {
        texts: content.inputTexts.join(", "),
        checkboxes: content.checkboxes.map(cb => cb.join(", ")).join(" | "),
      };
    };

    const userAnswer = formatAnswer(userContent);
    const groundTruthAnswer = formatAnswer(groundTruthContent);

    if (!annotatorHistory) {
      await AnnotatorHistory.create({
        annotator: annotatorId,
        project: projectId,
        totalPoints: pointsEarned,
        history: [
          {
            task: taskId,
            template: template._id,
            pointsEarned,
            submittedAnswer: `Texts: ${userAnswer.texts} | Checkboxes: ${userAnswer.checkboxes}`,
            groundTruthAnswer: `Texts: ${groundTruthAnswer.texts} | Checkboxes: ${groundTruthAnswer.checkboxes}`,
            comparisonResult,
          },
        ],
      });
    } else {
      annotatorHistory.totalPoints += pointsEarned;
      annotatorHistory.history.push({
        task: taskId,
        template: template._id,
        pointsEarned,
        submittedAnswer: `Texts: ${userAnswer.texts} | Checkboxes: ${userAnswer.checkboxes}`,
        groundTruthAnswer: `Texts: ${groundTruthAnswer.texts} | Checkboxes: ${groundTruthAnswer.checkboxes}`,
        comparisonResult,
      });
      await annotatorHistory.save();
    }

    return { pointsEarned, comparisonResult };
  } catch (error) {
    if (throwError) {
      throw error;
    }
    console.error("Error in comparison:", error);
    return { pointsEarned: 0, comparisonResult: false };
  }
}


export async function createTestTasks(
  tasks: {
    project: string;
    name: string;
    content: string;
    timer: number;
    annotator: string;
    reviewer: null;
    project_Manager: string;
    submitted: boolean;
    status: string;
    timeTaken: number;
    feedback: string;
    template: string;
    ai?: null; // Make ai optional but include it
  }[]
) {
  await connectToDatabase();

  try {
    // Ensure all required fields are present before insertion
    const tasksToCreate = tasks.map((task) => ({
      ...task,
      annotator: task.annotator,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);

    return JSON.stringify({
      success: true,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Error creating test tasks:", error);
    throw error;
  }
}

export async function setGroundTruth(id: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  try {
    // Fetch the task to be set as ground truth
    const task = await Task.findOne({ _id: id });
    if (!task) {
      throw new Error('Task not found');
    }

    // Fetch the template associated with the task
    const template = await Template.findOne({ _id: task.template });
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if a ground truth task already exists for this template
    if (template.groundTruthTask) {
      return { message: 'Ground truth task already exists for this template' };
    }

    // Set this task as the ground truth task
    template.groundTruthTask = task._id;
    await template.save();

    // Mark this task as a ground truth task
    task.isGroundTruth = true;
    await task.save();

    // Fetch all submitted tasks before the ground truth
    const submittedTasks = await Task.find({
      template: task.template,
      isGroundTruth: false, // Don't include the current ground truth task
      submitted: true,  // Only include submitted tasks
    });

    for (const submittedTask of submittedTasks) {
      await compareWithGroundTruth(submittedTask._id);  // Pass only the taskId
    }

    return { message: 'Ground truth set and previous tasks compared successfully' };

  } catch (error) {
    console.error(error);
    return { message: 'Error updating task: ' + error };
  }
}

export async function createTasks(
  tasks: {
    project: string;
    name: string;
    content: string;
    timer: number;
    reviewer: string;
    type: string;
    template: string
  }[]
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  for (const task of tasks) {
    if (!mongoose.Types.ObjectId.isValid(task.project)) {
      throw new Error(`Invalid project ID format: ${task.project}`);
    }
  }
  const taskData = tasks.map((task) => ({
    ...task,
    type: task.type,
    project_Manager: session.user.id,
    reviewer: task.reviewer || null,
  }));

  const createdTasks = await Task.insertMany(taskData);

  return JSON.stringify({
    success: true,
    tasks: createdTasks
  });
}

export async function saveRepeatTasks(
  repeatTasks: {
    project: string;
    name: string;
    content: string;
    timer: number;
    reviewer: string;
  }[]
) {
  console.log("Tasks recieved:", repeatTasks);
  const documents = await TaskRepeat.find({});
  console.log("Documents in collection:", documents);

  try {
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Successfully connected to the database.");

    console.log("Fetching session...");
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("Unauthorized: No valid session found.");
      throw new Error("Unauthorized");
    }
    console.log("Session fetched successfully:", session.user);

    console.log("Processing repeat task data...");
    const repeatTaskData = repeatTasks.map((repeatTask, index) => ({
      ...repeatTask,
      project_Manager: session.user.id,
      reviewer: repeatTask.reviewer || null,
    }));
    console.log(
      `Processed ${repeatTaskData.length} repeat tasks:`,
      repeatTaskData
    );

    console.log("Inserting repeat tasks into the database...");
    await TaskRepeat.insertMany(repeatTaskData).catch((error) => {
      console.error("Validation or insertion error:", error);
      throw error;
    });

    console.log("Repeat tasks inserted successfully.");

    return { success: true, message: "Repeat tasks saved successfully" };
  } catch (error) {
    console.error("Error in saveRepeatTasks function:", error);
    throw new Error(
      (error as Error)?.message ||
      "An unknown error occurred while saving repeat tasks."
    );
  }
}

export async function getAllTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid });
  return JSON.stringify(res);
}

export async function getAllUnassignedTasks(projectid: string) {

  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  try {
    const tasks = await Task.find({
      project: projectid,
      reviewer: null // This ensures annotator is not null
    });

    return JSON.stringify(tasks); // Return the tasks with assigned annotators
  } catch (e) {
    console.error(e);
    throw new Error('Error fetching tasks: ' + e); // Return a detailed error message
  }

}

export async function getPaginatedTasks(
  projectid: string,
  page: number,
  activeTab: string,
  type: "test" | "training" | "core" | "" = "",
  pageSize: number = 10
) {
  await connectToDatabase();

  if (!mongoose.Types.ObjectId.isValid(projectid)) {
    return JSON.stringify({
      error: `Invalid project ID format: ${projectid}`,
      tasks: [],
      total: 0,
      page,
      pages: 0
    });
  }
  const skip = (page - 1) * pageSize;

  let tasks = [];
  let total = 0;

  // Base filter object
  const baseFilter: any = { project: projectid };

  // Include type filter if provided
  if (type) {
    baseFilter.type = type;
  }

  // Active tab specific filters
  if (activeTab === "all") {
    tasks = await Task.find(baseFilter).skip(skip).limit(pageSize);
    total = await Task.countDocuments(baseFilter);
  } else if (activeTab === "submitted") {
    tasks = await Task.find({ ...baseFilter, submitted: true }).skip(skip).limit(pageSize);
    total = await Task.countDocuments({ ...baseFilter, submitted: true });
  } else if (activeTab === "unassigned") {
    tasks = await Task.find({
      ...baseFilter,
      $or: [{ annotator: null }],
    }).skip(skip).limit(pageSize);
    total = await Task.countDocuments({
      ...baseFilter,
      $or: [{ annotator: null }],
    });
  }

  return JSON.stringify({
    tasks: tasks || [],
    total,
    page,
    pages: Math.ceil(total / pageSize),
  });
}

export async function getATask(projectid: string) {
  await connectToDatabase();
  const res = await Task.findOne({ project: projectid });
  return JSON.stringify(res);
}

export async function getAllAcceptedTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid, status: "accepted" });
  return JSON.stringify(res);
}

export async function deleteTask(_id: string) {
  await connectToDatabase();
  await AIJob.deleteMany({ taskid: _id });
  const res = await Task.deleteOne({ _id });
  return JSON.stringify(res);
}
export async function changeAnnotator(
  _id: string,
  annotator: string,
  ai: boolean = false,
  isReviewer: boolean = false
) {
  await connectToDatabase();

  // If AI is being assigned
  if (ai) {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        $set: {
          annotator: null,
          ai: annotator,
        },
      },
      {
        new: true,
      }
    );
    return JSON.stringify(res);
  }

  // If assigning a reviewer
  if (isReviewer) {
    // If annotator is being unassigned (empty string)
    if (!annotator) {
      const res = await Task.findOneAndUpdate(
        { _id },
        {
          $set: { reviewer: null },
        },
        {
          new: true,
        }
      );
      return JSON.stringify(res);
    }

    // Check if the reviewer is not the same as the current annotator
    const task = await Task.findById(_id);
    if (task && task.annotator === annotator) {
      throw new Error("Reviewer cannot be the same as annotator");
    }

    const res = await Task.findOneAndUpdate(
      { _id },
      {
        $set: { reviewer: annotator },
      },
      {
        new: true,
      }
    );
    return JSON.stringify(res);
  }

  // If assigning an annotator (default case)
  // First check if the annotator is not the same as current reviewer
  const existingTask = await Task.findById(_id);
  if (existingTask && existingTask.reviewer === annotator) {
    throw new Error("Annotator cannot be the same as reviewer");
  }

  // If annotator is being unassigned (empty string)
  if (!annotator) {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        $set: {
          annotator: null,
          ai: null,
          assignedTime: existingTask.created_at
        },
      },
      {
        new: true,
      }
    );
    return JSON.stringify(res);
  }

  const res = await Task.findOneAndUpdate(
    { _id },
    {
      $set: {
        annotator,
        ai: null,
        assignedTime: Date.now()
      },
    },
    {
      new: true,
    }
  );
  if (res) {
    sendNotificationEmail(res._id, 'assigned')
    console.log("Email sent")
  }
  return JSON.stringify(res);
}

export async function getTasksByProject(id: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  const res = await Task.find({ annotator: annotatorId, project: id });
  return JSON.stringify(res);
}

export async function getTasksOfAnnotator(taskType: 'core' | 'training' | 'test') {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user?.id;

  try {
    const tasks = await Task.find({
      annotator: annotatorId,
      type: taskType
    })
      .populate({
        path: 'template',
        select: 'labels name', // Add any other needed fields
        options: { lean: true }
      })
      .lean();

    console.log('Tasks with templates:', tasks); // Add this for debugging

    return JSON.stringify(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return JSON.stringify([]);
  }
}


export async function getTask(_id: string) {
  await connectToDatabase();
  const res = await Task.findById(_id);
  return JSON.stringify(res);
}


export async function getAssignedTaskByProject(projectId: string) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  try {
    const tasks = await Task.find({
      project: projectId,
      annotator: { $ne: null } // This ensures annotator is not null
    });

    return tasks; // Return the tasks with assigned annotators
  } catch (e) {
    console.error(e);
    throw new Error('Error fetching tasks: ' + e); // Return a detailed error message
  }
}


export async function setTaskStatus(
  _id: string,
  status: string,
  feedback?: string,
  annotator?: string
) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    throw new Error("Invalid Task ID format.");
  }

  const task = await Task.findById(_id);
  if (!task) {
    throw new Error("Task not found.");
  }

  switch (status) {
    case "reassigned": {
      const res = await Task.findOneAndUpdate(
        { _id },
        {
          submitted: false,
          status,
          timeTaken: 0,
          feedback: "",
          annotator,
          ai: null,
        },
        { new: true }
      );
      return res.status;
    }

    case "rejected": {
      const res = await Task.findOneAndUpdate(
        { _id },
        {
          submitted: false,
          status,
          timeTaken: 0,
          feedback,
          ai: null,
        },
        { new: true }
      );

      await Rework.create({
        name: res.name,
        created_at: res.created_at,
        project: res.project,
        project_Manager: res.project_Manager,
        annotator: res.annotator,
        reviewer: userId,
        task: res._id,
        feedback: res.feedback,
      });

      return res.status;
    }

    default: {
      const sanitizedAI = typeof annotator === "string" ? annotator : null;

      const res = await Task.findOneAndUpdate(
        { _id },
        {
          status,
          feedback: "",
          ...(status === "reassigned" && {
            submitted: false,
            timeTaken: 0,
            annotator,
            ai: sanitizedAI,
          }),
        },
        { new: true }
      );

      return res.status;
    }
  }
}


export async function sendNotificationEmail(taskId: string, action: string) {
  try {
    // Find the task but don't populate immediately - this avoids the model registration issue
    const task = await Task.findById(taskId).exec();

    if (!task) {
      throw new Error("Task not found");
    }

    // Get project and annotator separately instead of using populate
    const projectId = task.project;
    const annotatorId = task.annotator;

    if (!annotatorId) {
      throw new Error("Task has no assigned annotator");
    }

    const annotator = await User.findById(annotatorId).exec();

    if (!annotator || !annotator.email) {
      throw new Error("Annotator email not found");
    }

    // Fetch notification templates for the project
    const response = await getNotificationTemplatesByProject(projectId);
    const { templates } = response;

    if (!response.success || !templates) {
      throw new Error("Failed to fetch notification templates.");
    }

    const triggerTemplate = templates.find(
      (template: any) =>
        template.triggerName === action && template.active
    );

    if (triggerTemplate) {
      // Send email using our email utility
      const emailResult = await sendEmail({
        to: annotator.email,
        subject: `Task ${action} Notification`,
        html: triggerTemplate.triggerBody
      });

      if (emailResult.success) {
        console.log(`Notification email sent to ${annotator.email} for task ${action}`);
        return { success: true, messageId: emailResult.messageId };
      } else {
        throw new Error(`Failed to send email: ${JSON.stringify(emailResult.error)}`);
      }
    } else {
      console.warn(`No active template found for the ${action} trigger.`);
      return { success: false, reason: 'No active template found' };
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error in sending notification email: ${error.message}`);
    } else {
      console.error("Error in sending notification email:", error);
    }
    throw error;
  }
}

export async function sendCustomNotificationEmail(userIds: string[], projectId: string) {
  console.log("🚀 Starting sendCustomNotificationEmail");
  console.log("📧 Input params:", { userIds, projectId });

  try {
    // Step 1: Fetch notification templates for the project
    console.log("📁 Fetching custom notification template for project:", projectId);
    const response = await getCustomNotificationTemplatesByProject(projectId);
    console.log("📁 Template fetch response:", response);

    if (!response.success || !response.templates) {
      console.error("❌ Failed to fetch custom notification template");
      console.error("❌ Response:", response);
      throw new Error("Failed to fetch custom notification template.");
    }

    // Step 2: Parse the template
    console.log("🔍 Parsing template data");
    const template = JSON.parse(response.templates);
    console.log("🔍 Parsed template:", template);

    if (!template.triggerTitle || !template.triggerBody) {
      console.error("❌ Custom template is incomplete");
      console.error("❌ Template triggerTitle:", template.triggerTitle);
      console.error("❌ Template triggerBody:", template.triggerBody);
      throw new Error("Custom template is incomplete - missing title or body.");
    }

    // Step 3: Fetch the users by their IDs
    console.log("👥 Fetching users with IDs:", userIds);
    const users = await User.find({ '_id': { $in: userIds } }).exec();
    console.log("👥 Found users:", users);

    if (!users || users.length === 0) {
      console.error("❌ No users found with provided IDs");
      throw new Error("No users found with the provided IDs.");
    }

    // Step 4: Send emails to each user
    console.log("📧 Starting email sending process");
    const results = await Promise.all(
      users.map(async (user, index) => {
        console.log(`\n📧 Processing user ${index + 1}/${users.length}:`);
        console.log(`📧 User ID: ${user._id}`);
        console.log(`📧 User email: ${user.email}`);

        if (!user.email) {
          console.warn(`⚠️ No email found for user ${user._id}`);
          return { userId: user._id, success: false, reason: 'No email address' };
        }

        try {
          console.log(`📧 Attempting to send email to: ${user.email}`);
          console.log(`📧 Email subject: ${template.triggerTitle}`);
          console.log(`📧 Email body length: ${template.triggerBody?.length || 0} characters`);

          const emailResult = await sendEmail({
            to: user.email,
            subject: template.triggerTitle,
            html: template.triggerBody
          });

          console.log(`📧 Email result for ${user.email}:`, emailResult);

          return {
            userId: user._id,
            success: emailResult.success,
            messageId: emailResult.messageId,
            email: user.email,
            error: emailResult.success ? undefined : emailResult.error
          };
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${user.email}:`, emailError);
          return {
            userId: user._id,
            success: false,
            reason: emailError instanceof Error ? emailError.message : 'Unknown email error',
            email: user.email,
            error: emailError
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log("\n📊 Final email sending summary:");
    console.log(`📊 Total users: ${users.length}`);
    console.log(`📊 Successful sends: ${successCount}`);
    console.log(`📊 Failed sends: ${failureCount}`);
    console.log("📊 Detailed results:", results);

    return {
      success: successCount > 0,
      results,
      summary: {
        total: users.length,
        sent: successCount,
        failed: failureCount
      }
    };
  } catch (error) {
    console.error("❌ Critical error in sendCustomNotificationEmail:", error);
    console.error("❌ Error stack:", error.stack);
    throw error;
  }
}

export async function getCustomNotificationTemplatesByProject(projectId: string) {
  console.log("🔍 Starting getCustomNotificationTemplatesByProject");
  console.log("🔍 Project ID:", projectId);

  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  if (!userId || !session) {
    console.error("❌ Unauthorized access - no session or user");
    throw new Error("Unauthorized");
  }

  try {
    if (!projectId) {
      console.error("❌ Project ID is required but not provided");
      throw new Error('Project ID is required');
    }

    // Try to find existing custom template
    console.log("🔍 Looking for existing custom template");
    let customTemplate = await NotificationTemplate.findOne({
      project: projectId,
      triggerName: "custom",
    });
    console.log("🔍 Found existing template:", customTemplate);

    // If no custom template exists, create a default one
    if (!customTemplate) {
      console.log("🆕 No existing template found, creating default one");
      customTemplate = await NotificationTemplate.create({
        project: projectId,
        triggerName: "custom",
        triggerTitle: "Custom Notification",
        triggerBody: "<p>Enter your custom email content here...</p>",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("🆕 Created new template:", customTemplate);
    }

    const result = {
      success: true,
      templates: JSON.stringify(customTemplate),
    };
    console.log("✅ Returning result:", result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching custom notification templates:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      error: 'Failed to fetch custom templates',
      templates: null,
    };
  }
}

export async function getNotificationTemplatesByProject(projectId: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  if (!userId || !session) {
    throw new Error("Unauthorized");
  }
  try {

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const templates = await NotificationTemplate.find({ project: projectId });

    return {
      success: true,
      templates,
    };
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return {
      success: false,
      error: 'Failed to fetch templates',
    };
  }
}
export async function getDistinctProjectsByAnnotator(selectedLabels: string[] = []) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  try {
    let matchStage: any = { annotator: new mongoose.Types.ObjectId(annotatorId) };

    const uniqueProjects = await Task.aggregate([
      { $match: matchStage },
      { $group: { _id: "$project" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      // Add a filter for labels if they are provided
      ...(selectedLabels.length > 0 ? [{
        $match: {
          "projectDetails.labels": { $all: selectedLabels }
        }
      }] : []),
      { $project: { _id: 0, project: "$projectDetails" } },
    ]);

    return JSON.parse(JSON.stringify(uniqueProjects.map(p => p.project)));
  } catch (error) {
    console.error("Error fetching distinct projects by annotator:", error);
    throw error;
  }
}

export async function getTasksToReview() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const reviewerId = session?.user.id;

  if (!reviewerId) {
    throw new Error("Unauthorized");
  }

  try {
    // Find tasks where:
    // 1. The user is assigned as reviewer
    // 2. Task status is any valid review status
    // 3. Include both submitted and unsubmitted tasks for better visibility
    const res = await Task.find({
      reviewer: reviewerId,
      // Include tasks that need review or are in review process
      status: {
        $in: ["pending", "accepted", "rejected", "reassigned"],
      },
    })
      .populate([
        {
          path: "project",
          select: "name",
        },
        {
          path: "annotator",
          select: "name email",
        },
      ])
      .sort({
        // Sort by submission status first (submitted tasks first)
        submitted: -1,
        // Then by status (pending first)
        status: 1,
        // Then by creation date (newest first)
        created_at: -1,
      });

    return JSON.stringify(res);
  } catch (error) {
    console.error("Error in getTasksToReview:", error);
    throw new Error("Failed to fetch review tasks");
  }
}

export async function getDistinctProjectsByReviewer() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const reviewerId = session?.user.id;

  try {
    const uniqueProjects = await Task.aggregate([
      { $match: { reviewer: new mongoose.Types.ObjectId(reviewerId) } },
      { $group: { _id: "$project" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      { $project: { _id: 0, project: "$projectDetails" } },
    ]);

    return JSON.stringify(uniqueProjects.map((project) => project.project));
  } catch (error) {
    console.error("Error fetching distinct projects by reviewer:", error);
    throw error;
  }
}

export async function assignReviewer(_id: string, reviewerId: string | null) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find the task to ensure it belongs to the user's project
  const existingTask = await Task.findById(_id);

  if (!existingTask) {
    throw new Error("Task not found");
  }

  // Perform the update
  const res = await Task.findOneAndUpdate(
    { _id },
    {
      reviewer: reviewerId,
      // Ensure AI is set to null when assigning a reviewer
      ai: null,
    },
    {
      new: true,
    }
  );

  return JSON.stringify(res);
}





export async function getReviewerByTaskId(taskId: string) {
  try {
    await connectToDatabase();

    // Find the task by ID and select the reviewer field
    const task = await Task.findById(taskId).select('reviewer').exec();

    if (!task || !task.reviewer) {
      return { error: 'Task or reviewer not found' };
    }

    // Fetch the reviewer details using the reviewer ID
    const reviewer = await User.findById(task.reviewer)
      .select('id name email role') // Include relevant fields
      .exec();

    if (!reviewer) {
      return { error: 'Reviewer details not found' };
    }

    // Return the reviewer details
    return {
      data: JSON.stringify({
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        role: reviewer.role,
      })
    };
  } catch (error) {
    console.error('Error in getReviewerByTaskId:', error);
    return { error: 'Error occurred while fetching the reviewer from taskId' };
  }
}
// Consolidated repeat task creation function
export async function createRepeatTask(repeatTasks: RepeatTask[], filteredAnnotators?: Annotator[]) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    for (const task of repeatTasks) {
      if (!mongoose.Types.ObjectId.isValid(task.project)) {
        throw new Error(`Invalid project ID format: ${task.project}`);
      }
    }

    // Get annotators - use filtered list if provided, otherwise get all
    let annotatorsToAssign: Annotator[];
    if (filteredAnnotators && filteredAnnotators.length > 0) {
      annotatorsToAssign = filteredAnnotators;
    } else {
      // Fallback to getting all annotators if no filtered list provided
      const allAnnotators = await getAllAnnotators(); // You'll need to import this
      annotatorsToAssign = JSON.parse(allAnnotators);
    }

    // Create tasks for each filtered annotator
    const tasksToCreate: any[] = [];

    for (const repeatTask of repeatTasks) {
      for (const annotator of annotatorsToAssign) {
        tasksToCreate.push({
          project: repeatTask.project,
          name: `${repeatTask.name} - ${annotator.name}`,
          content: repeatTask.content,
          timer: repeatTask.timer,
          annotator: annotator._id, // Assign to specific annotator
          reviewer: repeatTask.reviewer || null,
          template: repeatTask.template,
          type: repeatTask.type,
          project_Manager: session.user.id,
          submitted: false,
          status: "pending"
        });
      }
    }

    // Create tasks in TaskRepeat collection
    const createdTasks = await TaskRepeat.insertMany(tasksToCreate);

    return {
      success: true,
      createdTasks: createdTasks.length,
      tasks: createdTasks,
      message: `Repeat tasks created successfully for ${annotatorsToAssign.length} annotators`
    };

  } catch (error) {
    console.error("Error in createRepeatTask:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create repeat tasks',
      error: error
    };
  }
}

// Function to handle taking a test
export async function handleTakeTest(projectId: string, userId: string) {
  try {
    await connectToDatabase();

    // 1. Get repeat tasks for the project and populate project_Manager
    const repeatTasks = await TaskRepeat.find({ project: projectId });
    if (!repeatTasks || repeatTasks.length === 0) {
      return {
        success: false,
        message: "No test tasks available for this project"
      };
    }

    // 2. Create new tasks from repeat tasks
    const tasksToCreate = repeatTasks.map(task => ({
      project: task.project,
      name: task.name,
      content: task.content,
      timer: task.timer,
      reviewer: task.reviewer,
      template: task.template,
      type: "test",
      annotator: userId,
      submitted: false,
      status: "pending",
      project_Manager: task.project_Manager, // Get from repeat task
      feedback: "",
      timeTaken: 0,
      assignedAt: new Date(),
      isGroundTruth: false
    }));

    // 3. Create the actual tasks
    const createdTasks = await Task.insertMany(tasksToCreate);

    return {
      success: true,
      tasks: createdTasks,
      message: "Test tasks created and assigned successfully"
    };

  } catch (error) {
    console.error("Error in handleTakeTest:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create test tasks'
    };
  }
}


// Backend function to assign a user to a task (similar to handleAssignUser)
export async function assignUserToTask(taskId: string, annotatorId: string) {
  if (!taskId || !annotatorId) {
    throw new Error("Task ID and Annotator ID are required");
  }

  try {
    const res = await changeAnnotator(taskId, annotatorId);
    return JSON.parse(res);
  } catch (error) {
    console.error('Error assigning user to task:', error);
    throw error;
  }
}
export async function getProjectsWithRepeatTasks(selectedLabels: string[] = []) {
  await connectToDatabase();
  try {
    // Get unique projects from TaskRepeat collection with label filtering
    const uniqueProjects = await TaskRepeat.aggregate([
      { $group: { _id: "$project" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      // Add a filter for labels if they are provided
      ...(selectedLabels.length > 0 ? [{
        $match: {
          "projectDetails.labels": { $all: selectedLabels }
        }
      }] : []),
      { $project: { _id: 0, project: "$projectDetails" } },
    ]);

    return JSON.parse(JSON.stringify(uniqueProjects.map(project => project.project)));
  } catch (error) {
    console.error("Error fetching projects with repeat tasks:", error);
    throw error;
  }
}