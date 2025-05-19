import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/auth"
import { getProviderAIModels } from "@/app/actions/providerAIModel"

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Use your existing server action to fetch provider models
    const result = await getProviderAIModels()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching provider models:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch provider models" },
      { status: 500 }
    )
  }
}