'use server'
import nodemailer from 'nodemailer';
import { connectToDatabase } from './db';
import NotificationTemplate from '@/models/NotificationTemplate';

export interface WebinarDetails {
  title: string;
  description: string;
  scheduledAt: string;
  invitedBy: string;
}


// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Email sending interface
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string | Promise<string>;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

// Core email sending function
export const sendEmail = async (options: EmailOptions) => {
  try {
    const transporter = createTransporter();
    
    const { to, subject, html, from, cc, bcc, attachments } = options;
    
    // Handle case where html might be a promise
    let htmlContent: string;
    if (html instanceof Promise) {
      try {
        htmlContent = await html;
      } catch (e) {
        console.error("Error resolving HTML content from promise:", e);
        htmlContent = "Email content could not be loaded.";
      }
    } else {
      htmlContent = html;
    }
    
    const info = await transporter.sendMail({
      from: from || process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to,
      cc,
      bcc,
      subject,
      html: htmlContent,
      attachments,
    });
    
    return { 
      success: true, 
      messageId: info.messageId 
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error 
    };
  }
};

// Password reset email template
export const getPasswordResetEmailTemplate = (resetLink: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      <p>You requested a password reset for your account. Please click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </div>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
        If the button doesn't work, copy and paste this link in your browser:<br>
        <a href="${resetLink}" style="color: #4F46E5; word-break: break-all;">${resetLink}</a>
      </p>
    </div>
  `;
};

// Domain expert invitation email
export const getInvitationEmailTemplate = (inviteLink: string, teamInfo: string, agencyOwnerName: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You've Been Invited!</h2>
      <p>Hi there,</p>
      <p><strong>${agencyOwnerName}</strong> has invited you to join BloLabel and help grow the AI ecosystem as a domain expert.</p>
      <p>BloLabel connects domain experts like you with AI innovators who need your expertise for data labeling and other projects.</p>
      ${teamInfo}
      <div style="margin: 25px 0;">
        <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Join BloLabel Now</a>
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
  `;
};

// Interface definitions for email templates
interface AdminNotificationTemplateProps {
  email: string;
  invitationCode: string;
  createdAt: Date;
  expiresAt: Date;
}

interface RequesterConfirmationTemplateProps {
  // Add any props needed for the requester template
}

// Admin notification template
export const getAdminNotificationTemplate = ({
  email,
  invitationCode,
  createdAt,
  expiresAt,
}: AdminNotificationTemplateProps): string => {
  return `
        <!DOCTYPE html>
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">New Project Manager Access Request</h2>
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Requested at:</strong> ${createdAt.toLocaleString()}</p>
                        
                        <div style="background-color: #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0;">
                            <p><strong>Invitation Code:</strong></p>
                            <p style="font-family: monospace; font-size: 1.2em; color: #2563eb; text-align: center; padding: 10px; background: white; border-radius: 4px;">
                                ${invitationCode}
                            </p>
                            <p style="font-size: 0.9em; color: #666;">
                                This code will expire in 30 days (${expiresAt.toLocaleString()})
                            </p>
                            <p style="font-size: 0.9em; color: #666;">
                                Forward this code to ${email} if you wish to approve their request.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;
};

// Requester confirmation template
export const getRequesterConfirmationTemplate = (
  props: RequesterConfirmationTemplateProps = {}
): string => {
  return `
        <!DOCTYPE html>
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">We've Received Your Request</h2>
                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p>Thank you for your interest in becoming a project manager on our platform.</p>
                        <p>We'll review your request and send you an invitation code if approved.</p>
                        <p>This usually takes 1-2 business days.</p>
                    </div>
                    <p style="color: #6b7280; font-size: 0.875rem;">If you didn't request this, please ignore this email.</p>
                </div>
            </body>
        </html>
    `;
};

// Admin payment notification template
export const getAdminPaymentNotificationTemplate = (data: {
  paymentIntentId: string;
  date: Date;
  amount: number;
  productName: string;
  pmId: string;
}): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Product Payment Received</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; text-align: center; padding: 10px; }
    .content { padding: 20px; background-color: #f4f4f4; }
    .details { background-color: white; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Product Payment Received</h1>
    </div>
    <div class="content">
      <div class="details">
        <h2>Payment Information</h2>
        <p><strong>Payment Intent ID:</strong> ${data.paymentIntentId}</p>
        <p><strong>Date:</strong> ${data.date.toLocaleString()}</p>
        <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
        
        <h2>Product Details</h2>
        <p><strong>Product Name:</strong> ${data.productName}</p>
        
        <h2>PM Information</h2>
        <p><strong>PM Id:</strong> ${data.pmId}</p>
      </div>
      <p>Action Required: Review and process the payment.</p>
    </div>
  </div>
</body>
</html>
`;

// Function to get notification templates by project
export async function getNotificationTemplatesByProject(projectId: string) {
  await connectToDatabase();
  
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

export const getWebinarInvitationTemplate = (
  webinarDetails: WebinarDetails,
  customMessage?: string
): string => {
  const scheduledDate = webinarDetails.scheduledAt 
      ? new Date(webinarDetails.scheduledAt).toLocaleString() 
      : 'To be announced';
      
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #333; text-align: center;">Webinar Training Invitation</h2>
    
    <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #4F46E5;">${webinarDetails.title}</h3>
      ${webinarDetails.description ? `<p>${webinarDetails.description}</p>` : ''}
      <p><strong>Invited by:</strong> ${webinarDetails.invitedBy}</p>
    </div>
    
    ${customMessage ? `<div style="margin: 20px 0; padding: 15px; border-left: 4px solid #4F46E5;"><p><strong>Message from ${webinarDetails.invitedBy}:</strong></p><p>${customMessage}</p></div>` : ''}
    
    <p>You have been invited to participate in this training webinar. You'll be able to access the webinar through the platform when it's time.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_AUTH_URL  || 'https://blolabel.com/'}training" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Go to Training Portal
      </a>
    </div>
    
    <p>If you have any questions, please contact your project manager.</p>
    <p>Thank you!</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
      <p>This is an automated message, please do not reply directly to this email.</p>
    </div>
  </div>
`;
};