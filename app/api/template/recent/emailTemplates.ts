// emailTemplates.ts

interface AdminNotificationTemplateProps {
    email: string;
    invitationCode: string;  // Now this must be a string
    createdAt: Date;
    expiresAt: Date;
}

interface RequesterConfirmationTemplateProps {
    // Add any props needed for the requester template
}

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

export const getRequesterConfirmationTemplate = (props: RequesterConfirmationTemplateProps): string => {
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