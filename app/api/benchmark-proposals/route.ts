import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BenchmarkProposal } from '@/models/BenchmarkProposal';
import { connectToDatabase } from '@/lib/db';
import { authOptions } from '@/auth';
import Task from '@/models/Task';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

type UserRole = 'project manager' | 'system admin' | 'reviewer' | 'user';

interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

interface ProposalData {
    name: string;
    description: string;
    domain: 'Math' | 'Healthcare' | 'Language' | 'Multimodal' | 'Other';
    customDomain?: string;
    datasetUrl?: string;
    evaluationMethodology: string;
    intendedPurpose: string;
    project: string;
    user: string;
    datasetFile?: {
        fileName: string;
        fileSize: number;
        fileType: string;
        uploadedAt: Date;
    };
}

export async function POST(req: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const formData = await req.formData();
        console.log(formData)
        // Extract basic form fields
        const proposalData: Partial<ProposalData> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            domain: formData.get('domain') as ProposalData['domain'],
            evaluationMethodology: formData.get('evaluationMethodology') as string,
            intendedPurpose: formData.get('intendedPurpose') as string,
            project: formData.get('project') as string,
            user: user.id
        };

        // Add optional fields if they exist
        const customDomain = formData.get('customDomain');
        if (customDomain) {
            proposalData.customDomain = customDomain as string;
        }

        const datasetUrl = formData.get('datasetUrl');
        if (datasetUrl) {
            proposalData.datasetUrl = datasetUrl as string;
        }

        // Handle file upload
        const file = formData.get('datasetFile') as File;
        if (file) {
            try {
                // Ensure uploads directory exists
                const uploadsDir = join(process.cwd(), 'public', 'uploads');
                await mkdir(uploadsDir, { recursive: true });

                // Create unique filename
                const fileExtension = file.name.split('.').pop() || '';
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
                const filePath = join(uploadsDir, fileName);

                // Convert File to Buffer and save
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                await writeFile(filePath, buffer);

                // Add file information to proposal data
                proposalData.datasetFile = {
                    fileName: fileName,
                    fileSize: file.size,
                    fileType: fileExtension.toLowerCase(),
                    uploadedAt: new Date()
                };
            } catch (error) {
                console.error('Error handling file upload:', error);
                return NextResponse.json(
                    { error: 'Failed to process file upload' },
                    { status: 500 }
                );
            }
        }

        // Validate required fields
        const requiredFields = ['name', 'description', 'domain', 'evaluationMethodology', 'intendedPurpose', 'project'];
        for (const field of requiredFields) {
            if (!proposalData[field as keyof ProposalData]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Create and save new benchmark proposal
        const newProposal = new BenchmarkProposal({
            ...proposalData,
            status: 'draft',
            created_at: new Date(),
            updated_at: new Date()
        });

        await newProposal.save();

        return NextResponse.json({
            success: true,
            message: 'Benchmark proposal created successfully',
            proposal: newProposal
        });

    } catch (error) {
        console.error('Error creating benchmark proposal:', error);
        return NextResponse.json(
            { error: 'Failed to create benchmark proposal' },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get all unique projects where the user is a reviewer
        const reviewerProjects = await Task.distinct('project', {
            reviewer: user.id
        });

        // Base query for finding proposals
        const query = {
            $or: [
                // User is project manager or admin
                {
                    $expr: {
                        $in: [user.role, ['project manager', 'system admin']]
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
                userRole: user.role,
                sessionUserId: user.id
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

async function canReview(projectId: string, userId: string): Promise<boolean> {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;

        if (!user) {
            return false;
        }

        // If user is admin or project manager, they can always review
        if (user.role === 'project manager' || user.role === 'system admin') {
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
        const user = session?.user as SessionUser | undefined;

        if (!user?.id) {
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
        const canReviewProposal = await canReview(proposal.project.toString(), user.id);
        if (!canReviewProposal) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const updatedProposal = await BenchmarkProposal.findByIdAndUpdate(
            proposalId,
            {
                status,
                reviewNotes,
                reviewedBy: user.id,
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