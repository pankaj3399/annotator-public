// app/api/projects/[projectId]/labels/route.ts
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import { NextRequest } from 'next/server';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        await connectToDatabase();
        const { labels } = await req.json();

        const updatedProject = await Project.findByIdAndUpdate(
            params.projectId,
            { $set: { labels } },
            { new: true }
        ).exec();

        if (!updatedProject) {
            return Response.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        return Response.json(updatedProject);
    } catch (error) {
        console.error('Error updating project labels:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}