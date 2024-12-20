import { getDistinctProjectsByAnnotator } from "@/app/actions/task";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";




export async function GET(){
    const session = await getServerSession(authOptions);
    if(!session || !session.user){
        return NextResponse.json({
            msg:"Unauthorized"
        },{
            status:403
        })
    }

    try{
        const result = await getDistinctProjectsByAnnotator();
        const projects = JSON.parse(result);
        return NextResponse.json({data:projects},{status:200})
    }
    catch(e){
        console.error('Error while fetching projects by annotator',e);
        return NextResponse.json({
            msg:"Error while fetching the projects by annotator"
        },{
            status:500
        })
    }
}