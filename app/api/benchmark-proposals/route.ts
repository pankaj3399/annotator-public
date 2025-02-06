import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { BenchmarkProposal } from '@/models/BenchmarkProposal';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { connectToDatabase } from '@/lib/db';
import { authOptions } from '@/auth';
import { mkdir } from 'fs/promises';

// Define types for the proposal data
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
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const formData = await req.formData();

        // Extract basic form fields
        const proposalData: Partial<ProposalData> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            domain: formData.get('domain') as ProposalData['domain'],
            evaluationMethodology: formData.get('evaluationMethodology') as string,
            intendedPurpose: formData.get('intendedPurpose') as string,
            project: formData.get('project') as string,
            user: session.user.id
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
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get project ID from query params
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        // Build query based on projectId
        const query = projectId
            ? { project: projectId }
            : { user: session.user.id };

        // Fetch proposals with populated project data
        const proposals = await BenchmarkProposal.find(query)
            .populate('project', 'name')
            .populate('user', 'name email')
            .sort({ created_at: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            proposals
        });

    } catch (error) {
        console.error('Error fetching benchmark proposals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch benchmark proposals' },
            { status: 500 }
        );
    }
}

// Add a type guard for error handling
function isError(error: unknown): error is Error {
    return error instanceof Error;
}

// Helper function to get error message
function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }
    return String(error);
}