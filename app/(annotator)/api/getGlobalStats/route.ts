import { getAnnotatorDashboard } from "@/app/actions/annonatorDashboard";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({
                msg: "Unauthorized"
            }, {
                status: 403
            });
        }

        const response = await getAnnotatorDashboard();
        if (response.error) {
            return NextResponse.json({
                error: response.error
            }, {
                status: 400
            });
        }

        const dashboardData = JSON.parse(response.data!);
        return NextResponse.json({
            data: dashboardData
        }, {
            status: 200
        });

    } catch (error) {
        console.error('Error while fetching the annotator dashboard', error);
        return NextResponse.json({
            msg: "Error while fetching annotator dashboard"
        }, {
            status: 500
        });
    }
}