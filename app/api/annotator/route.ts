import { authOptions } from '@/auth';
import { checkPermissions } from '@/lib/utils';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// Handle POST requests
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, permission } = body

    const result = await checkPermissions(permission)

    if (result === false) {
        return NextResponse.json(
            { error: "Invalid permission value" },
            { status: 400 }
        );
    }

    try {
        if (permission.includes('No Permission')) {
            await User.updateOne(
                { _id: user_id },
                { $set: { permission: null } }
            );
            const updatedUser = await User.find({ _id: user_id })
            return NextResponse.json({ success: true, updatedUser }, { status: 200 });
        }

        await User.updateOne(
            { _id: user_id },
            { $set: { permission: result } }
        );
        const updatedUser = await User.find({ _id: user_id })
        return NextResponse.json({ success: true, updatedUser }, { status: 200 });

    } catch (error) {
        console.error("Error updating permission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}