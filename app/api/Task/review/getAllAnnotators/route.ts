import { getAllAnnotators } from "@/app/actions/annotator";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";


export const dynamic = 'force-dynamic';



export async function GET(){
    // const session = await getServerSession(authOptions);
    // if(!session||!session.user){
    //     return NextResponse.json({
    //         msg:"Unauthorized"
    //     },{
    //         status:403
    //     })
    // }

    try{
        const response = await getAllAnnotators();
        return NextResponse.json(JSON.parse(response),{
            status:200
        })
    }
    catch(e){
        console.error(e);
        return NextResponse.json({
            msg:"Error while fetching all the annotators"
        })
    }
}