'use server'
import mongoose from 'mongoose'
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import { template } from "../template/page";
import Rework from '@/models/Rework';
import { AIJob } from '@/models/aiModel';

export async function updateTask(template: template, _id: string, projectid: string,time:number) {
  await connectToDatabase();

  const res = await Task.findOneAndUpdate({ _id }, {
    ...template,
    content: template.content,
    submitted: true,
    project: projectid,
    timeTaken:time
  });

  return JSON.stringify(res)
}

export async function createTasks(tasks: {
  project: string;
  name: string;
  content: string;
  timer: number;
}[]) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const task= tasks.map(task => {
    return {
      ...task,
      project_Manager: session?.user.id
    }
  })
  await Task.insertMany(task);
}

export async function getAllTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid });
  return JSON.stringify(res)
}

export async function getATask(projectid: string) {
  await connectToDatabase();
  const res = await Task.findOne({ project: projectid });
  return JSON.stringify(res)
}

export async function getAllAcceptedTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid, status: 'accepted' });
  return JSON.stringify(res)
}

export async function deleteTask(_id: string) {
  await connectToDatabase();
  await AIJob.deleteMany({ taskid: _id });
  const res = await Task.deleteOne({ _id });
  return JSON.stringify(res)
}

export async function changeAnnotator(_id: string, annotator: string, ai?: boolean) {
  await connectToDatabase();
  if(ai) {
    const res = await Task.findOneAndUpdate({ _id }, {
      annotator: null,
      ai: annotator
    },{
      new: true
    });
    return JSON.stringify(res)
  }

  const res = await Task.findOneAndUpdate({ _id }, {
    annotator,
    ai: null
  },{
    new: true
  });
  return JSON.stringify(res)
}

export async function getTasksByProject(id: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  const res = await Task.find({ annotator: annotatorId, project: id });
  return JSON.stringify(res)
}

export async function getTasksOfAnnotator() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  const res = await Task.find({ annotator: annotatorId });
  return JSON.stringify(res)
}

export async function getTask(_id: string) {
  await connectToDatabase();
  const res = await Task.findById(_id);
  return JSON.stringify(res)
}

export async function setTaskStatus(_id: string, status: string,feedback?:string,annotator?:string) {
  await connectToDatabase();
  if (status == 'reassigned') {
    const res = await Task.findOneAndUpdate({ _id }, {
      submitted: false,
      status,
      timeTaken: 0,
      feedback:'',
      annotator,
      ai: false
    })
    return res.status
  }
  if (status == 'rejected') {
    const res = await Task.findOneAndUpdate({ _id }, {
      submitted: false,
      status,
      timeTaken: 0,
      feedback,
      ai: false
    })
    await Rework.create({
      name:res.name,
      created_at:res.created_at,
      project:res.project,
      project_Manager:res.project_Manager,
      annotator:res.annotator,
      task:res._id,
      feedback:res.feedback
    })
    return res.status
  }
  const res = await Task.findOneAndUpdate({ _id }, {
    status,
    feedback: '',
  });
  return res.status
}

export async function getDistinctProjectsByAnnotator() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  try {
      const uniqueProjects = await Task.aggregate([
        { $match: { annotator: new mongoose.Types.ObjectId(annotatorId) } },
        { $group: { _id: "$project" } },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'projectDetails' } },
        { $unwind: "$projectDetails" },
        { $project: { _id: 0, project: "$projectDetails" } }
      ]);
      const pro= uniqueProjects.map(project => project.project)

      return JSON.stringify(pro)
  } catch (error) {
    console.error('Error fetching distinct projects by annotator:', error);
    throw error;
  }
}