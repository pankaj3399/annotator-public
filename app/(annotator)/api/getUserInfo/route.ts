import { authOptions } from "@/auth";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({
            msg: "Unauthorized"
        }, {
            status: 403
        });
    }

    try {
        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json({
                msg: "User not found"
            }, {
                status: 404
            });
        }

        console.log(user);
        return NextResponse.json({
            data: user
        }, {
            status: 200
        });
    } catch (e) {
        console.error("Error occurred while fetching user data:", e);
        return NextResponse.json({
            msg: "Error occurred while fetching user data"
        }, {
            status: 500
        });
    }
}
