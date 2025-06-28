//app/api/projects/[projectId]/guidelines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Guideline } from '@/models/Guideline';
import { AnnotatorGuideline } from '@/models/AnnotatorGuideline';
import { Project } from '@/models/Project';
import { Training } from '@/models/Training';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
interface CreateMessageData {
  sender: string;
  content: string;
  timestamp: Date;
  isAiMessage: boolean;
  aiProvider?: string;
  aiModel?: string;
  fileContent?: boolean;
}
interface MessageDocument {
  _id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isAiMessage?: boolean;
  aiProvider?: string;
  aiModel?: string;
  attachments?: any[];
  fileContent?: boolean;
}

interface AttachmentData {
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  s3Path: string;
}

// Helper function to check if user has access to project
async function checkProjectAccess(projectId: string, userId: string, userRole: string): Promise<boolean> {
  try {
    console.log('[checkProjectAccess] Starting access check:', { projectId, userId, userRole });

    const project = await Project.findById(projectId);
    if (!project) {
      console.log('[checkProjectAccess] ❌ Project not found:', projectId);
      return false;
    }

    console.log('[checkProjectAccess] Project found:', {
      projectId: project._id,
      projectManagerId: project.project_Manager,
      projectName: project.name
    });

    // Project manager has access to their own projects
    if (userRole === 'project manager') {
      const hasAccess = project.project_Manager.toString() === userId;
      console.log('[checkProjectAccess] PM access check:', {
        projectManager: project.project_Manager.toString(),
        userId,
        hasAccess
      });
      return hasAccess;
    }

    // For annotators - if they reached this page, they have access
    if (userRole === 'annotator') {
      console.log('[checkProjectAccess] ✅ Annotator access granted (route-level trust)');
      return true;
    }

    console.log('[checkProjectAccess] ❌ Unknown role:', userRole);
    return false;
  } catch (error) {
    console.error('[checkProjectAccess] ❌ Error checking project access:', error);
    return false;
  }
}

// GET - Fetch guidelines based on user role
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  console.log('[GET /guidelines] 🚀 Starting request:', { projectId: params.projectId });

  try {
    console.log('[GET /guidelines] Connecting to database...');
    await connectToDatabase();
    console.log('[GET /guidelines] ✅ Database connected');

    console.log('[GET /guidelines] Getting server session...');
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      console.log('[GET /guidelines] ❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GET /guidelines] ✅ Session found:', {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: session.user.role,
      projectId: params.projectId
    });

    if (session.user.role === 'project manager') {
      console.log('[GET /guidelines] 📋 Processing PROJECT MANAGER request');

      console.log('[GET /guidelines] Fetching guideline for project:', params.projectId);
      const guidelines = await Guideline.findOne({ project: params.projectId })
        .populate('messages.sender', 'name email image')
        .populate('files.uploadedBy', 'name email image');

      if (!guidelines) {
        console.log('[GET /guidelines] ⚠️ No guideline found, returning empty response');
        return NextResponse.json({
          success: true,
          description: '',
          messages: [],
          files: [],
          userRole: 'project_manager',
          canConfigureAI: true,
          hasFiles: false
        });
      }

      // EXTRACT AI CONFIG FROM LATEST AI MESSAGE IF NOT AT GUIDELINE LEVEL
      let aiProvider = guidelines.aiProvider;
      let aiModel = guidelines.aiModel;

      if (!aiProvider || !aiModel) {
        console.log('[GET /guidelines] 🔍 AI config not at guideline level, checking messages...');

        // Find the latest AI message
        const aiMessages = guidelines.messages.filter((msg: any) => msg.isAiMessage && msg.aiProvider && msg.aiModel);
        if (aiMessages.length > 0) {
          const latestAiMessage = aiMessages[aiMessages.length - 1];
          aiProvider = latestAiMessage.aiProvider;
          aiModel = latestAiMessage.aiModel;

          console.log('[GET /guidelines] ✅ Extracted AI config from latest message:', {
            aiProvider,
            aiModel,
            messageId: latestAiMessage._id
          });

          // MIGRATE: Save AI config to guideline level
          guidelines.aiProvider = aiProvider;
          guidelines.aiModel = aiModel;
          await guidelines.save();
          console.log('[GET /guidelines] ✅ Migrated AI config to guideline level');
        }
      }

      console.log('[GET /guidelines] ✅ Guideline found:', {
        guidelineId: guidelines._id,
        messageCount: guidelines.messages?.length || 0,
        fileCount: guidelines.files?.length || 0,
        hasAiProvider: !!aiProvider,
        hasAiModel: !!aiModel,
        aiProvider,
        aiModel
      });

      const response = {
        success: true,
        description: guidelines.description,
        messages: guidelines.messages,
        files: guidelines.files,
        aiProvider: aiProvider,
        aiModel: aiModel,
        userRole: 'project_manager',
        canConfigureAI: true,
        hasFiles: guidelines.files.length > 0
      };

      console.log('[GET /guidelines] 📤 Returning PM response:', {
        messageCount: response.messages?.length,
        fileCount: response.files?.length,
        hasAiConfig: !!(response.aiProvider && response.aiModel)
      });

      return NextResponse.json(response);
    }

    else if (session.user.role === 'annotator') {
      console.log('[GET /guidelines] 👤 Processing ANNOTATOR request');

      console.log('[GET /guidelines] Fetching parent guideline...');
      let parentGuideline = await Guideline.findOne({ project: params.projectId });

      if (!parentGuideline) {
        console.log('[GET /guidelines] ⚠️ No parent guideline found - PM hasn\'t set up anything yet');

        // Create minimal annotator guideline but NO parent
        let annotatorGuideline = await AnnotatorGuideline.findOne({
          project: params.projectId,
          annotator: session.user.id
        });

        if (!annotatorGuideline) {
          annotatorGuideline = new AnnotatorGuideline({
            project: params.projectId,
            annotator: session.user.id,
            parentGuideline: null, // No parent guideline exists
            messages: [],
            description: ''
          });
          await annotatorGuideline.save();
        }

        // Return response with no AI config - PM needs to set up first
        const response = {
          success: true,
          description: '',
          messages: [], // Empty annotator messages
          files: [],
          aiProvider: undefined, // No AI configured
          aiModel: undefined,    // No AI configured
          userRole: 'annotator',
          canConfigureAI: false,
          hasFiles: false,
          hasFileContent: false,
          pmMessages: [] // No PM messages
        };

        console.log('[GET /guidelines] 📤 Returning empty annotator response - no PM setup');
        return NextResponse.json(response);
      }

      console.log('[GET /guidelines] ✅ Parent guideline found:', {
        guidelineId: parentGuideline._id,
        fileCount: parentGuideline.files?.length || 0,
        messageCount: parentGuideline.messages?.length || 0,
        hasAiProvider: !!parentGuideline.aiProvider,
        hasAiModel: !!parentGuideline.aiModel
      });

      // Extract AI config from parent
      let aiProvider = parentGuideline.aiProvider;
      let aiModel = parentGuideline.aiModel;

      if (!aiProvider || !aiModel) {
        console.log('[GET /guidelines] 🔍 Parent AI config not at guideline level, checking messages...');

        const aiMessages = parentGuideline.messages.filter((msg: any) => msg.isAiMessage && msg.aiProvider && msg.aiModel);
        if (aiMessages.length > 0) {
          const latestAiMessage = aiMessages[aiMessages.length - 1];
          aiProvider = latestAiMessage.aiProvider;
          aiModel = latestAiMessage.aiModel;

          // Migrate to guideline level
          parentGuideline.aiProvider = aiProvider;
          parentGuideline.aiModel = aiModel;
          await parentGuideline.save();
          console.log('[GET /guidelines] ✅ Migrated AI config to parent guideline level');
        }
      }

      // If still no AI config after checking messages, return no AI configured
      if (!aiProvider || !aiModel) {
        console.log('[GET /guidelines] ❌ No AI configuration found in parent guideline');

        let annotatorGuideline = await AnnotatorGuideline.findOne({
          project: params.projectId,
          annotator: session.user.id
        });

        if (!annotatorGuideline) {
          annotatorGuideline = new AnnotatorGuideline({
            project: params.projectId,
            annotator: session.user.id,
            parentGuideline: parentGuideline._id.toString(),
            messages: [],
            description: ''
          });
          await annotatorGuideline.save();
        }

        const response = {
          success: true,
          description: parentGuideline.description,
          messages: annotatorGuideline.messages,
          files: [],
          aiProvider: undefined,
          aiModel: undefined,
          userRole: 'annotator',
          canConfigureAI: false,
          hasFiles: parentGuideline.files.length > 0,
          hasFileContent: false,
          pmMessages: []
        };

        console.log('[GET /guidelines] 📤 Returning annotator response - no AI config');
        return NextResponse.json(response);
      }

      // AI is configured, proceed with normal flow
      console.log('[GET /guidelines] ✅ AI configuration found:', { aiProvider, aiModel });

      // Get or create annotator guideline
      let annotatorGuideline = await AnnotatorGuideline.findOne({
        project: params.projectId,
        annotator: session.user.id
      }).populate('messages.sender', 'name email image');

      if (!annotatorGuideline) {
        annotatorGuideline = new AnnotatorGuideline({
          project: params.projectId,
          annotator: session.user.id,
          parentGuideline: parentGuideline._id.toString(),
          messages: [],
          description: ''
        });
        await annotatorGuideline.save();
        await annotatorGuideline.populate('messages.sender', 'name email image');
      }

      // Find messages with file content
      const fileContentMessages = parentGuideline.messages.filter(
        (msg: any) => msg.fileContent === true
      );

      console.log('[GET /guidelines] ✅ Found file content messages:', fileContentMessages.length);

      const response = {
        success: true,
        description: parentGuideline.description,
        messages: annotatorGuideline.messages,
        files: [],
        aiProvider: aiProvider,
        aiModel: aiModel,
        userRole: 'annotator',
        canConfigureAI: false,
        hasFiles: parentGuideline.files.length > 0,
        hasFileContent: fileContentMessages.length > 0,
        pmMessages: fileContentMessages
      };

      console.log('[GET /guidelines] 📤 Returning annotator response:', {
        success: response.success,
        messageCount: response.messages?.length,
        pmMessageCount: response.pmMessages?.length,
        hasAiConfig: !!(response.aiProvider && response.aiModel),
        hasKnowledgeFiles: response.hasFiles,
        hasFileContent: response.hasFileContent
      });

      return NextResponse.json(response);
    }


    console.log('[GET /guidelines] ❌ Invalid user role:', session.user.role);
    return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });

  } catch (error) {
    console.error('[GET /guidelines] ❌ Error fetching guidelines:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guidelines" },
      { status: 500 }
    );
  }
}

// POST - Add message based on user role
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  console.log('[POST /guidelines] 🚀 Starting message post:', { projectId: params.projectId });

  try {
    console.log('[POST /guidelines] Connecting to database...');
    await connectToDatabase();
    console.log('[POST /guidelines] ✅ Database connected');

    console.log('[POST /guidelines] Getting server session...');
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      console.log('[POST /guidelines] ❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[POST /guidelines] ✅ Session found:', {
      userId: session.user.id,
      userRole: session.user.role,
      projectId: params.projectId
    });

    console.log('[POST /guidelines] Parsing request body...');
    const body = await request.json();
    console.log('[POST /guidelines] Request body:', {
      hasContent: !!body.content,
      contentLength: body.content?.length || 0,
      attachmentCount: body.attachments?.length || 0,
      isAiMessage: body.isAiMessage,
      aiProvider: body.aiProvider,
      aiModel: body.aiModel
    });

    const {
      content = '',
      attachments = [],
      isAiMessage = false,
      aiProvider,
      aiModel, fileContent = false
    } = body;

    if (!content.trim() && (!attachments || attachments.length === 0)) {
      console.log('[POST /guidelines] ❌ No content or attachments provided');
      return NextResponse.json(
        { success: false, error: "Message content required" },
        { status: 400 }
      );
    }

    if (session.user.role === 'project manager') {
      console.log('[POST /guidelines] 📋 Processing PROJECT MANAGER message');

      console.log('[POST /guidelines] Finding/creating guideline...');
      let guidelines = await Guideline.findOne({ project: params.projectId });

      if (!guidelines) {
        console.log('[POST /guidelines] Creating new guideline for project');
        guidelines = new Guideline({
          project: params.projectId,
          description: '',
          messages: [],
          files: []
        });
      } else {
        console.log('[POST /guidelines] ✅ Existing guideline found:', guidelines._id);
      }

      console.log('[POST /guidelines] Creating message data...');
      const messageData: CreateMessageData = {
        sender: session.user.id,
        content: content.trim(),
        timestamp: new Date(),
        isAiMessage: Boolean(isAiMessage),
        fileContent: Boolean(fileContent)
      };

      if (isAiMessage && aiProvider) {
        messageData.aiProvider = aiProvider;
        console.log('[POST /guidelines] Added AI provider to message:', aiProvider);
      }
      if (isAiMessage && aiModel) {
        messageData.aiModel = aiModel;
        console.log('[POST /guidelines] Added AI model to message:', aiModel);
      }

      console.log('[POST /guidelines] Adding message to guideline...');
      guidelines.messages.push(messageData);

      if (attachments && attachments.length > 0) {
        console.log('[POST /guidelines] Processing attachments:', attachments.length);
        attachments.forEach((attachment: AttachmentData, index: number) => {
          console.log(`[POST /guidelines] Processing attachment ${index + 1}:`, {
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            s3Path: attachment.s3Path
          });

          const existingFileIndex = guidelines.files.findIndex(
            (file: any) => file.s3Path === attachment.s3Path
          );

          if (existingFileIndex === -1) {
            guidelines.files.push({
              ...attachment,
              uploadedBy: session.user.id
            });
            console.log(`[POST /guidelines] ✅ Added new file: ${attachment.fileName}`);
          } else {
            console.log(`[POST /guidelines] ⚠️ File already exists: ${attachment.fileName}`);
          }
        });
      }

      console.log('[POST /guidelines] Saving guideline...');
      await guidelines.save();
      console.log('[POST /guidelines] ✅ Guideline saved');

      console.log('[POST /guidelines] Populating sender details...');
      await guidelines.populate('messages.sender', 'name email image');

      const addedMessage = guidelines.messages[guidelines.messages.length - 1];
      console.log('[POST /guidelines] ✅ Message added:', {
        messageId: addedMessage._id,
        senderId: addedMessage.sender,
        isAiMessage: addedMessage.isAiMessage
      });

      return NextResponse.json({
        success: true,
        message: addedMessage
      });

    } else if (session.user.role === 'annotator') {
      console.log('[POST /guidelines] 👤 Processing ANNOTATOR message');

      console.log('[POST /guidelines] Ensuring parent guideline exists...');
      let parentGuideline = await Guideline.findOne({ project: params.projectId });
      if (!parentGuideline) {
        console.log('[POST /guidelines] Creating parent guideline...');
        parentGuideline = new Guideline({
          project: params.projectId,
          description: '',
          messages: [],
          files: []
        });
        await parentGuideline.save();
        console.log('[POST /guidelines] ✅ Parent guideline created:', parentGuideline._id);
      } else {
        console.log('[POST /guidelines] ✅ Parent guideline exists:', parentGuideline._id);
      }

      console.log('[POST /guidelines] Finding/creating annotator guideline...');
      let annotatorGuideline = await AnnotatorGuideline.findOne({
        project: params.projectId,
        annotator: session.user.id
      });

      if (!annotatorGuideline) {
        console.log('[POST /guidelines] Creating annotator guideline...');
        let annotatorGuideline = await AnnotatorGuideline.findOne({
          project: params.projectId,
          annotator: session.user.id
        });

        if (!annotatorGuideline) {
          annotatorGuideline = new AnnotatorGuideline({
            project: params.projectId,
            annotator: session.user.id,
            parentGuideline: parentGuideline._id.toString(),
            messages: [],
            description: ''
          });
          await annotatorGuideline.save();
        }
        console.log('[POST /guidelines] ✅ Annotator guideline created:', annotatorGuideline._id);
      } else {
        console.log('[POST /guidelines] ✅ Annotator guideline exists:', annotatorGuideline._id);
      }

      console.log('[POST /guidelines] Creating annotator message data...');
      const messageData: CreateMessageData = {
        sender: session.user.id,
        content: content.trim(),
        timestamp: new Date(),
        isAiMessage: Boolean(isAiMessage)
      };

      // Use parent guideline's AI config for AI messages
      if (isAiMessage) {
        messageData.aiProvider = parentGuideline.aiProvider;
        messageData.aiModel = parentGuideline.aiModel;
        console.log('[POST /guidelines] Using parent AI config:', {
          aiProvider: parentGuideline.aiProvider,
          aiModel: parentGuideline.aiModel
        });
      }

      console.log('[POST /guidelines] Adding message to annotator guideline...');
      annotatorGuideline.messages.push(messageData);
      await annotatorGuideline.save();
      console.log('[POST /guidelines] ✅ Annotator guideline saved');

      console.log('[POST /guidelines] Populating sender details...');
      await annotatorGuideline.populate('messages.sender', 'name email image');

      const addedMessage = annotatorGuideline.messages[annotatorGuideline.messages.length - 1];
      console.log('[POST /guidelines] ✅ Annotator message added:', {
        messageId: addedMessage._id,
        senderId: addedMessage.sender,
        isAiMessage: addedMessage.isAiMessage
      });

      return NextResponse.json({
        success: true,
        message: addedMessage
      });
    }

    console.log('[POST /guidelines] ❌ Invalid user role:', session.user.role);
    return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });

  } catch (error) {
    console.error('[POST /guidelines] ❌ Error adding message:', error);
    return NextResponse.json(
      { success: false, error: "Failed to add message" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  console.log('[PUT /guidelines] 🚀 Starting guidelines update:', { projectId: params.projectId });

  try {
    console.log('[PUT /guidelines] Connecting to database...');
    await connectToDatabase();
    console.log('[PUT /guidelines] ✅ Database connected');

    console.log('[PUT /guidelines] Getting server session...');
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      console.log('[PUT /guidelines] ❌ No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PUT /guidelines] ✅ Session found:', {
      userId: session.user.id,
      userRole: session.user.role
    });

    // Only project managers can update guidelines
    if (session.user.role !== 'project manager') {
      console.log('[PUT /guidelines] ❌ Non-PM trying to update guidelines:', session.user.role);
      return NextResponse.json({ error: 'Only project managers can update guidelines' }, { status: 403 });
    }

    console.log('[PUT /guidelines] Checking project access...');
    const hasAccess = await checkProjectAccess(params.projectId, session.user.id, session.user.role);
    if (!hasAccess) {
      console.log('[PUT /guidelines] ❌ Access denied for project:', params.projectId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.log('[PUT /guidelines] ✅ Project access granted');

    console.log('[PUT /guidelines] Parsing request body...');
    const { description, aiConfig, fileContent } = await request.json();
    console.log('[PUT /guidelines] Update data:', {
      hasDescription: description !== undefined,
      hasAiConfig: !!aiConfig,
      hasFileContent: fileContent !== undefined,
      fileContentValue: fileContent,
      aiProvider: aiConfig?.provider,
      aiModel: aiConfig?.model
    });

    console.log('[PUT /guidelines] Finding/creating guideline...');
    let guidelines = await Guideline.findOne({ project: params.projectId });

    if (!guidelines) {
      console.log('[PUT /guidelines] Creating new guideline...');
      guidelines = new Guideline({
        project: params.projectId,
        description: description || '',
        messages: [],
        files: [],
        fileContent: false // Initialize fileContent
      });
    } else {
      console.log('[PUT /guidelines] ✅ Existing guideline found:', guidelines._id);
    }

    // Update AI configuration
    if (aiConfig) {
      console.log('[PUT /guidelines] Updating AI configuration...');
      guidelines.aiProvider = aiConfig.provider;
      guidelines.aiModel = aiConfig.model;
      console.log('[PUT /guidelines] ✅ AI config updated:', {
        provider: aiConfig.provider,
        model: aiConfig.model
      });
    }

    // Update description
    if (description !== undefined) {
      console.log('[PUT /guidelines] Updating description...');
      guidelines.description = description;
      console.log('[PUT /guidelines] ✅ Description updated');
    }

    // ✅ Handle fileContent update with explicit logging
    if (fileContent !== undefined) {
      console.log('[PUT /guidelines] Updating fileContent flag...');
      console.log('[PUT /guidelines] Previous fileContent value:', guidelines.fileContent);
      guidelines.fileContent = fileContent;
      console.log('[PUT /guidelines] ✅ FileContent updated to:', fileContent);
    }

    console.log('[PUT /guidelines] Saving guideline...');
    const savedGuideline = await guidelines.save();
    console.log('[PUT /guidelines] ✅ Guideline saved with fileContent:', savedGuideline.fileContent);

    const response = {
      success: true,
      description: guidelines.description,
      aiProvider: guidelines.aiProvider,
      aiModel: guidelines.aiModel,
      fileContent: guidelines.fileContent
    };

    console.log('[PUT /guidelines] 📤 Returning response:', response);
    return NextResponse.json(response);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[PUT /guidelines] ❌ Error updating guidelines:', errorMessage);
    console.error('[PUT /guidelines] Error stack:', errorStack);
    return NextResponse.json(
      { success: false, error: "Failed to update guidelines" },
      { status: 500 }
    );
  }
}