import { setTaskStatus } from "@/app/actions/task";
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

        const body = await req.json();
        const {_id,status,feedback,annotator}=body;

        if(!_id||!status){
            return NextResponse.json({
                msg:"TaskId and status is required"
            },{
                status:400
            })
        }

        const response = await setTaskStatus(_id,status,feedback,annotator)

        return NextResponse.json({msg:"Task Status Updated",response},{
            status:200
        })

    }
    catch(e){
        console.error(e);
        return NextResponse.json({
            msg:"Error while updating the task status"
        },{
            status:500
        })
    }
}





