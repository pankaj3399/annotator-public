// lib/email.ts
import nodemailer from 'nodemailer';

// Create email transporter
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

// Send an email
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
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