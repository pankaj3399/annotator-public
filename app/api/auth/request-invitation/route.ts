import { connectToDatabase } from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Generate a random invitation code
function generateInvitationCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Generate unique invitation code
        let invitationCode;
        let isUnique = false;
        while (!isUnique) {
            invitationCode = generateInvitationCode();
            const existing = await Invitation.findOne({ code: invitationCode });
            if (!existing) {
                isUnique = true;
            }
        }

        // Create invitation
        const invitation = await Invitation.create({
            code: invitationCode,
            email,
            used: false,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
        });

        // Send admin notification with the code
        if (process.env.ADMIN_EMAIL) {
            try {
                await transporter.sendMail({
                    from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
                    to: process.env.ADMIN_EMAIL,
                    subject: 'New Project Manager Access Request',
                    html: `
                        <!DOCTYPE html>
                        <html>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                    <h2 style="color: #2563eb;">New Project Manager Access Request</h2>
                                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <p><strong>Email:</strong> ${email}</p>
                                        <p><strong>Requested at:</strong> ${invitation.createdAt.toLocaleString()}</p>
                                        
                                        <div style="background-color: #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                            <p><strong>Invitation Code:</strong></p>
                                            <p style="font-family: monospace; font-size: 1.2em; color: #2563eb; text-align: center; padding: 10px; background: white; border-radius: 4px;">
                                                ${invitationCode}
                                            </p>
                                            <p style="font-size: 0.9em; color: #666;">
                                                This code will expire in 30 days (${invitation.expiresAt.toLocaleString()})
                                            </p>
                                            <p style="font-size: 0.9em; color: #666;">
                                                Forward this code to ${email} if you wish to approve their request.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </body>
                        </html>
                    `
                });
            } catch (error) {
                console.error('Error sending admin notification:', error);
                // Continue execution even if admin email fails
            }
        }

        // Send confirmation email to requester
        try {
            await transporter.sendMail({
                from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
                to: email,
                subject: 'Project Manager Access Request Received',
                html: `
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
                `
            });
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            // Continue execution even if confirmation email fails
        }

        return NextResponse.json(
            { success: true },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error processing invitation request:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}