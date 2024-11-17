import { connectToDatabase } from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getAdminNotificationTemplate, getRequesterConfirmationTemplate } from '../../template/recent/emailTemplates';

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
function generateInvitationCode(): string {
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
        let invitationCode: string | undefined;
        let isUnique = false;
        while (!isUnique) {
            const code = generateInvitationCode();
            const existing = await Invitation.findOne({ code });
            if (!existing) {
                invitationCode = code;
                isUnique = true;
            }
        }

        if (!invitationCode) {
            throw new Error('Failed to generate unique invitation code');
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
                    html: getAdminNotificationTemplate({
                        email,
                        invitationCode,
                        createdAt: invitation.createdAt,
                        expiresAt: invitation.expiresAt,
                    })
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
                html: getRequesterConfirmationTemplate({})
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