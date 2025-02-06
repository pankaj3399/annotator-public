import { getAnnotatorDashboard } from "@/app/actions/annonatorDashboard";
import { getAnnotatorEarnings } from "@/app/actions/annotatorTask";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

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
        const earnings = await getAnnotatorEarnings();
        if (response.error) {
            return NextResponse.json({
                error: response.error
            }, {
                status: 400
            });
        }
        const dashboardData = JSON.parse(response.data!);
        const earningData = JSON.parse(earnings.data!)
        const completeData = {...dashboardData,earningData}
        return NextResponse.json({
            data: completeData
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