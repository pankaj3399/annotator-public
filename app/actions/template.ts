// app/actions/template.ts
'use server'
import { defaultContent } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import mongoose from "mongoose";
import { template } from "../template/page";
import { Template } from "@/models/Template";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function updateTestTemplate(_id: string, value: boolean) {
    await connectToDatabase();
    // REMOVED try-catch - let errors bubble up
    const updatedTemplate = await Template.findOneAndUpdate(
        { _id },
        { $set: { testTemplate: value } },
        { new: true }
    );

    if (!updatedTemplate) {
        throw new Error('Template not found');
    }

    return JSON.stringify(updatedTemplate);
}

export async function upsertTemplate(projectid: string, template: template, _id: string | undefined, add = false) {
    await connectToDatabase();

    const res = await Template.findOneAndUpdate(
        { _id: _id == undefined ? new mongoose.Types.ObjectId() : _id },
        {
            ...template,
            content: template.content ? template.content : defaultContent,
            project: projectid,
            type: template.type,
        },
        {
            upsert: true,
            new: true
        }
    );

    if (add) {
        await Project.findByIdAndUpdate(projectid, {
            $push: { templates: res._id }
        });
    }
    return JSON.stringify(res);
}

export async function updateTimer(_id: string, timer: number) {
    await connectToDatabase();
    // REMOVED try-catch - let errors bubble up
    const updatedTemplate = await Template.findOneAndUpdate(
        { _id },
        { $set: { timer: timer } },
        { new: true }
    );

    if (!updatedTemplate) {
        throw new Error('Template not found');
    }

    return JSON.stringify(updatedTemplate);
}

export async function getTemplate(pageId: string) {
    await connectToDatabase();
    const res = await Template.findById(pageId);
    return JSON.stringify(res)
}

export async function getATemplate(projectid: string) {
    await connectToDatabase();
    const res = await Template.findOne({ project: projectid });
    return JSON.stringify(res)
}

export async function CopyTemplate(pname: string, tname: string, content: string) {
    await connectToDatabase();
    // REMOVED try-catch - let errors bubble up
    const session = await getServerSession(authOptions)
    const newProject = await Project.create({
        name: pname,
        project_Manager: session?.user.id,
    });

    const defaultTemplate = {
        name: tname,
        project: newProject._id,
        content: content
    }

    const res = await Template.create(defaultTemplate);

    await Project.findByIdAndUpdate(newProject._id, {
        $push: { templates: res._id }
    })

    return { success: true, project: newProject }
}

export async function DeleteTemplate(_id: string) {
    await connectToDatabase();
    // REMOVED try-catch - let errors bubble up
    await Template.findByIdAndDelete(_id);
    return { success: true }
}

export async function UpdateVisibilityTemplate(_id: string, visibility: boolean) {
    await connectToDatabase();
    // REMOVED try-catch - let errors bubble up
    await Template.findByIdAndUpdate(_id, {
        $set: { private: visibility }
    });
    return { success: true }
}