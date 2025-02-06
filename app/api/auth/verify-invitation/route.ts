import { connectToDatabase } from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const { code } = await req.json();

        if (!code) {
            return NextResponse.json(
                { error: 'Invitation code is required' },
                { status: 400 }
            );
        }

        const invitation = await Invitation.findOne({ code });

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invalid invitation code' },
                { status: 400 }
            );
        }

        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { error: 'Invitation code has expired' },
                { status: 400 }
            );
        }

        if (invitation.used) {
            return NextResponse.json(
                { error: 'Invitation code has already been used' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { 
                valid: true,
                email: invitation.email
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error verifying invitation:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}