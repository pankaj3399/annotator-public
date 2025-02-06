import { sendNotificationEmail } from "@/app/actions/task";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";




export async function POST(req:NextRequest){
    const session = await getServerSession(authOptions);
    if(!session||!session.user){
        return NextResponse.json({
            msg:"Unauthorized"
        },{
            status:403
        })
    }

    try{
        const body=await req.json();
        const {taskId,action}=body;

        if(!taskId){
            return NextResponse.json({
                msg:"No task ID found"
            },{
                status:400
            })
        }
         await sendNotificationEmail(taskId,action);
        return NextResponse.json({
            msg:"Successfully email sent"
        },{
            status:200
        })

    }catch(e){
        console.error(e);
        return NextResponse.json({
            msg:"Error sending the notification email"
        })
    }
}