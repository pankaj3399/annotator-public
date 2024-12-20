import { getAnnotatorTaskStats } from "@/app/actions/annonatorDashboard";
import { NextResponse } from "next/server";



export async function GET(){
    try{

        const {data} = await getAnnotatorTaskStats();
        return NextResponse.json(JSON.parse(data!),{
            status:200
        })

    }
    catch(e){
        return NextResponse.json({
            msg:"Error while fetching the status of annotator tasks"
        },{
            status:500
        })
    }
}