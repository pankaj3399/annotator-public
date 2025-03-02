import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { InvitedUsers } from '@/models/InvitedUsers';
import { Team } from '@/models/Team';

export async function POST(req: Request) {
  console.log('=== INVITE EXPERTS API CALLED ===');
  
  try {
    // Check authentication and authorization
    console.log('Checking authentication...');
    const session = await getServerSession();
    
    if (!session) {
      console.log('Authentication failed: No session');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Connect to the database
    console.log('Connecting to database...');
    try {
      await connectToDatabase();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: (dbError as Error).message },
        { status: 500 }
      );
    }

    // Get the user details to verify they are an agency owner
    console.log(`Looking up user with email: ${session.user?.email}`);
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser || currentUser.role !== 'agency owner') {
      console.log('Authorization failed: Not an agency owner');
      return NextResponse.json(
        { error: 'Not authorized to invite experts' },
        { status: 403 }
      );
    }

    // Get emails and agency owner name from request body
    console.log('Parsing request body...');
    const body = await req.json();
    
    const { emails, agencyOwnerName } = body;

    if (!Array.isArray(emails) || emails.length === 0) {
      console.log('Invalid request: No valid email addresses provided');
      return NextResponse.json(
        { error: 'No valid email addresses provided' },
        { status: 400 }
      );
    }

    // Create email transporter
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      
      // Verify transporter
      await transporter.verify();
    } catch (transporterError) {
      console.error('Transporter error:', transporterError);
      return NextResponse.json(
        { error: 'Failed to set up email transport', details: (transporterError as Error).message },
        { status: 500 }
      );
    }

    // Get the agency owner's team
    const ownerTeams = await Team.find({ members: currentUser._id });
    let teamInfo = '';
    let teamId = '';
    
    // Get first team ID or empty string if none exists
    if (ownerTeams && ownerTeams.length > 0) {
      teamId = ownerTeams[0]._id.toString();
      
      if (ownerTeams.length === 1) {
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would also like you to join their team "${ownerTeams[0].name}".</p>`;
      } else {
        // Multiple teams - still use the first one for the signup link
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would like you to join their team "${ownerTeams[0].name}".</p>`;
      }
    } else {
      teamInfo = `<p><strong>${agencyOwnerName}</strong> would like you to join their team when you sign up.</p>`;
    }

    // Get base URL from environment or default
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Create signup URL with pre-filled parameters
    const signupUrl = `${baseUrl}/auth/signup?role=annotator&team=${teamId}`;

    // Arrays to track different status categories
    const existingUsersArray: string[] = [];
    const alreadyInvitedUsersArray: string[] = [];

    // Send invitation emails and create invitation records
    const results = await Promise.allSettled(
      emails.map(async (email, index) => {
        console.log(`[${index}] Processing email: ${email}`);
        
        try {
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
            status: "pending",
          });
          
          await invitation.save();
          console.log(`[${index}] Invitation saved with ID: ${invitation._id.toString()}`);

          // Use the teamInfo in the email
          console.log(`[${index}] Sending email...`);
          const mailOptions = {
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
                  <a href="${signupUrl}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join BloLabel Now</a>
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
          };
          
          const info = await transporter.sendMail(mailOptions);
          console.log(`[${index}] Email sent successfully:`, JSON.stringify(info, null, 2));

          return { 
            email, 
            status: 'sent', 
            invitationId: invitation._id.toString(),
            messageId: info.messageId
          };
        } catch (emailError) {
          console.error(`[${index}] Error processing email ${email}:`, emailError);
          return { 
            email, 
            status: 'error',
            error: (emailError as Error).message,
            stack: (emailError as Error).stack
          };
        }
      })
    );

    // Log detailed results
    console.log('All results:', JSON.stringify(results, null, 2));

    // Count success and failures
    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length;
    const alreadyInvited = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'already_invited').length;
    const existingUsersCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'existing_user').length;
    const errors = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'error').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log('Summary:', { sent, alreadyInvited, existingUsersCount, errors, failed, total: emails.length });

    return NextResponse.json({
      success: true,
      sent,
      alreadyInvited,
      existingUsers: existingUsersArray,
      alreadyInvitedUsers: alreadyInvitedUsersArray,
      existingUsersCount,
      errors,
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
    
  } catch (error) {
    console.error('Unhandled error in invite route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send invitations',
        message: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  }
}