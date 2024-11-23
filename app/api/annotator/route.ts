import { authOptions } from '@/auth';
import { checkPermissions } from '@/lib/utils';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await req.json();
        const { user_id, permission } = body;

        // Validate inputs
        if (!user_id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Validate permissions
        const validatedPermissions = checkPermissions(permission);
        if (validatedPermissions === false) {
            return NextResponse.json(
                { error: "Invalid permission values. Allowed values are 'noPermission' and 'canReview'" },
                { status: 400 }
            );
        }

        // Update user permissions
        await User.updateOne(
            { _id: user_id },
            { $set: { permission: validatedPermissions } }
        );

        // Fetch updated user
        const updatedUser = await User.findOne({ _id: user_id });
        
        return NextResponse.json({ 
            success: true, 
            message: "Permissions updated successfully",
            user: updatedUser 
        });

    } catch (error) {
        console.error("Error updating permission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}