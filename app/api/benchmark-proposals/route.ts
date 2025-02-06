// app/api/benchmark-proposals/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BenchmarkProposal } from '@/models/BenchmarkProposal';
import { connectToDatabase } from '@/lib/db';
import { authOptions } from '@/auth';
import Task from '@/models/Task';

interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

// app/api/benchmark-proposals/route.ts
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get all unique projects where the user is a reviewer
        const reviewerProjects = await Task.distinct('project', {
            reviewer: session.user.id
        });

        // Base query for finding proposals
        const query = {
            $or: [
                // User is project manager or admin
                {
                    $expr: {
                        $in: [session.user.role, ['project manager', 'system admin']]
                    }
                },
                // User is a reviewer for the project
                {
                    project: { $in: reviewerProjects }
                }
            ]
        };

        const proposals = await BenchmarkProposal.find(query)
            .populate({
                path: 'user',
                select: 'name email'
            })
            .populate({
                path: 'project',
                select: 'name'
            })
            .populate({
                path: 'reviewedBy',
                select: 'name email'
            })
            .sort({ created_at: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            proposals,
            debug: {
                reviewerProjects,
                userRole: session.user.role,
                sessionUserId: session.user.id
            }
        });

    } catch (error) {
        console.error('Error in GET route:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch benchmark proposals',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
async function canReview(projectId: string, userId: string) {
    try {
        // If user is admin or project manager, they can always review
        const user = await (await getServerSession(authOptions))?.user;
        if (user?.role === 'project manager' || user?.role === 'system admin') {
            return true;
        }

        // Check if user is a reviewer for any task in this project
        const isReviewer = await Task.exists({
            project: projectId,
            reviewer: userId
        });

        return !!isReviewer;
    } catch (error) {
        console.error('Error checking review permissions:', error);
        return false;
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { proposalId, status, reviewNotes } = data;

        // Get the proposal to check project
        const proposal = await BenchmarkProposal.findById(proposalId);
        if (!proposal) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Check if user can review this proposal
        const canReviewProposal = await canReview(proposal.project.toString(), session.user.id);
        if (!canReviewProposal) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const updatedProposal = await BenchmarkProposal.findByIdAndUpdate(
            proposalId,
            {
                status: status,
                reviewNotes: reviewNotes,
                reviewedBy: session.user.id,
                reviewed_at: new Date()
            },
            { new: true }
        ).populate([
            {
                path: 'user',
                select: 'name email'
            },
            {
                path: 'project',
                select: 'name'
            },
            {
                path: 'reviewedBy',
                select: 'name email'
            }
        ]);

        return NextResponse.json({
            success: true,
            proposal: updatedProposal
        });

    } catch (error) {
        console.error('Error in PUT route:', error);
        return NextResponse.json(
            {
                error: 'Failed to update benchmark proposal',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}