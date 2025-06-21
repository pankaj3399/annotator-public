// app/api/dashboard/download-ndas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { User } from "@/models/User";
import { Team } from "@/models/Team";
import { connectToDatabase } from "@/lib/db";
import JSZip from "jszip";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email }).populate('team_id');

    if (!currentUser || currentUser.role !== 'project manager') {
      return NextResponse.json(
        { error: "Access denied. Only project managers can download NDAs." },
        { status: 403 }
      );
    }

    if (!currentUser.team_id) {
      return NextResponse.json(
        { error: "No team found" },
        { status: 400 }
      );
    }

    const { expertIds } = await request.json();

    // Build query conditions
    const queryConditions: any = {
      role: 'annotator',
      team_id: currentUser.team_id,
      nda: { $exists: true, $ne: null }
    };

    // If specific expert IDs are provided, filter by them
    if (expertIds && Array.isArray(expertIds) && expertIds.length > 0) {
      queryConditions._id = { $in: expertIds };
    }

    // Get experts with NDAs and populate team info
    const expertsWithNDAs = await User.find(queryConditions)
      .select('_id name email nda')
      .populate('team_id', 'name');

    if (expertsWithNDAs.length === 0) {
      return NextResponse.json(
        { error: "No NDAs found for the selected experts" },
        { status: 404 }
      );
    }

    // Get team name for consistent naming
    const teamData = currentUser.team_id as any;
    const teamName = teamData?.name ? teamData.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Team';

    // Create ZIP file
    const zip = new JSZip();
    const downloadPromises: Promise<void>[] = [];

    for (const expert of expertsWithNDAs) {
      const downloadPromise = (async () => {
        try {
          // Fetch the NDA file from the URL
          const response = await fetch(expert.nda);
          if (!response.ok) {
            console.error(`Failed to download NDA for ${expert.name}: ${response.statusText}`);
            return;
          }

          const fileBuffer = await response.arrayBuffer();
          
          // Create custom filename with our naming convention
          const sanitizedEmail = expert.email.replace(/[^a-zA-Z0-9@.]/g, '_');
          const customFileName = `${teamName}_Onboarding_NDA_${sanitizedEmail}.pdf`;
          
          console.log(`Creating file: ${customFileName} for expert: ${expert.name}`);
          
          // Add file to ZIP with custom name
          zip.file(customFileName, fileBuffer);
        } catch (error) {
          console.error(`Error downloading NDA for ${expert.name}:`, error);
        }
      })();

      downloadPromises.push(downloadPromise);
    }

    // Wait for all downloads to complete
    await Promise.all(downloadPromises);

    // Check if ZIP has any files
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      return NextResponse.json(
        { error: "No files were successfully processed" },
        { status: 500 }
      );
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const zipFilename = `${teamName}_NDAs_${timestamp}.zip`;

    console.log(`Generated ZIP file: ${zipFilename} with ${fileCount} files`);

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error creating NDA ZIP file:', error);
    return NextResponse.json(
      { error: "Failed to create ZIP file" },
      { status: 500 }
    );
  }
}