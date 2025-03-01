import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { InvitedUsers } from '@/models/InvitedUsers';
import { Team } from '@/models/Team';
import { parse } from 'csv-parse/sync';

// Define helper function to read and process the uploaded file
async function readCSVFile(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  
  // Parse CSV
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  
  // Extract emails from records
  const emails: string[] = [];
  for (const record of records) {
    if (record.email) {
      emails.push(record.email.trim());
    }
    // Try other common column names if 'email' is not found
    else if (record.Email || record.EMAIL) {
      emails.push((record.Email || record.EMAIL).trim());
    }
  }
  
  return emails.filter(email => email && email.includes('@'));
}

export async function POST(req: Request) {
  try {
    // Check authentication and authorization
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Get the user details to verify they are an agency owner
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser || currentUser.role !== 'agency owner') {
      return NextResponse.json(
        { error: 'Not authorized to invite experts' },
        { status: 403 }
      );
    }

    // Process the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const agencyOwnerName = formData.get('agencyOwnerName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Get the agency owner's team
    const ownerTeams = await Team.find({ members: currentUser._id });
    let teamInfo = '';
    
    if (ownerTeams && ownerTeams.length > 0) {
      if (ownerTeams.length === 1) {
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would also like you to join their team "${ownerTeams[0].name}". Please consider joining this team when you sign up.</p>`;
      } else {
        // Multiple teams
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would also like you to join one of their teams:</p><ul>`;
        ownerTeams.forEach(team => {
          teamInfo += `<li>${team.name}</li>`;
        });
        teamInfo += `</ul><p>Please consider joining one of these teams when you sign up.</p>`;
      }
    } else {
      teamInfo = `<p><strong>${agencyOwnerName}</strong> would also like you to join their team when you sign up.</p>`;
    }

    // Process CSV file
    const emails = await readCSVFile(file);

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found in the CSV file' },
        { status: 400 }
      );
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Arrays to track different user types
    const existingUsersArray: string[] = [];
    const alreadyInvitedUsersArray: string[] = [];

    // Send invitation emails
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          // Add to existingUsers array for client-side notification
          existingUsersArray.push(email);
          return { email, status: 'existing_user', userId: existingUser._id.toString() };
        }

        // Check if invitation already exists (regardless of status)
        const existingInvitation = await InvitedUsers.findOne({ 
          email, 
          agencyOwner: currentUser._id
        });

        if (existingInvitation) {
          // Add to already invited array for client-side notification
          alreadyInvitedUsersArray.push(email);
          return { email, status: 'already_invited', invitationId: existingInvitation._id.toString(), invitationStatus: existingInvitation.status };
        }

        // Create new invitation record
        const invitation = new InvitedUsers({
          email,
          agencyOwner: currentUser._id,
          status: "pending"
        });
        
        await invitation.save();

        // Send invitation email
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: email,
          subject: 'Join BloLabel as a Domain Expert',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">You've Been Invited!</h2>
              <p>Hi there,</p>
              <p><strong>${agencyOwnerName}</strong> has invited you to join BloLabel and help grow the AI ecosystem as a domain expert.</p>
              <p>BloLabel connects domain experts like you with AI innovators who need your expertise for data labeling and other projects.</p>
              ${teamInfo}
              <div style="margin: 25px 0;">
                <a href="https://www.blolabel.ai/landing" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join BloLabel Now</a>
              </div>
              <p>As a domain expert, you'll be able to:</p>
              <ul>
                <li>Work on meaningful AI projects</li>
                <li>Set your own schedule</li>
                <li>Get paid for your expertise</li>
                <li>Be part of building the future of AI</li>
              </ul>
              <p>If you have any questions, feel free to reply to this email.</p>
              <p>Best regards,<br>The BloLabel Team</p>
            </div>
          `,
        });

        return { email, status: 'sent', invitationId: invitation._id.toString() };
      })
    );

    // Count success and failures
    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length;
    const alreadyInvited = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'already_invited').length;
    const existingUsersCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'existing_user').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent,
      alreadyInvited,
      existingUsers: existingUsersArray,
      alreadyInvitedUsers: alreadyInvitedUsersArray,
      existingUsersCount,
      failed,
      total: emails.length,
      details: results.map(r => {
        if (r.status === 'fulfilled') {
          return r.value;
        } else {
          return {
            status: 'rejection',
            reason: (r.reason as Error)?.message || 'Unknown error',
            stack: (r.reason as Error)?.stack
          };
        }
      })
    });
    
  } catch (error: any) {
    console.error('Error processing CSV and sending invitations:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process CSV and send invitations',
        message: error.message 
      },
      { status: 500 }
    );
  }
}