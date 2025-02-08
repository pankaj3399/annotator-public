'use server';

import { connectToDatabase } from '@/lib/db';
import { BenchmarkProposal } from '@/models/BenchmarkProposal';
import { Comment } from '../(annotator)/tasks/benchmark-arena/[id]/comment-section';

export async function getApprovedBenchmarkProposals() {
  try {
    await connectToDatabase();
    const proposals = await BenchmarkProposal.find({ status: 'approved' });
    return JSON.parse(JSON.stringify(proposals));
  } catch (error) {
    console.error('Error fetching approved benchmark proposals:', error);
    throw new Error('Failed to fetch approved benchmark proposals');
  }
}




export async function getBenchmarkProposalDetails(benchmarkId:string){
    try{
        await connectToDatabase();
        const proposal = await BenchmarkProposal.findById(benchmarkId);

        return JSON.parse(JSON.stringify(proposal));

    }catch(e){
        console.error("Erro fetching details")
        throw new Error("Failed to fetch details of benchmark")
    }
}


interface UpdateProposalData {
    likes?: number;
    comments?: {
      content: string;
      createdAt: string;
      likes: number;
      replies?: Comment[];
    }[];
    description?: string;
    intendedPurpose?: string;
    name?: string;
    domain?: string;
    status?: string;
  }
  
  export async function updateBenchmarkProposalDetails(
    benchmarkId: string,
    data: { comments: any[] }
  ) {
    try {
      await connectToDatabase();
      const updatedProposal = await BenchmarkProposal.findByIdAndUpdate(
        benchmarkId,
        {
          $set: {
            comments: data.comments,
            updated_at: new Date(),
          },
        },
        { new: true }
      );
  
      if (!updatedProposal) {
        throw new Error("Proposal not found");
      }
  
      return JSON.parse(JSON.stringify(updatedProposal));
    } catch (error) {
      console.error("Error updating proposal:", error);
      throw new Error("Failed to update benchmark proposal");
    }
  }




  export async function updateVoteBenchmarkProposal(benchmarkId: string, userId: string, vote: number) {
    try {
      await connectToDatabase();
  
      const proposal = await BenchmarkProposal.findById(benchmarkId);
      if (!proposal) throw new Error("Benchmark proposal not found");
  
      // Check if the user has already voted
      const existingVote = proposal.votes.find((v: any) => v.userId.toString() === userId);
  
      if (existingVote) {
        // If user removes their vote, remove entry
        if (vote === 0) {
          proposal.votes = proposal.votes.filter((v: any) => v.userId.toString() !== userId);
        } else {
          // Update existing vote
          existingVote.vote = vote;
        }
      } else if (vote !== 0) {
        // Add new vote if it's not neutral (0)
        proposal.votes.push({ userId, vote });
      }
  
      await proposal.save();
      return proposal;
    } catch (e) {
      console.error("Error updating vote:", e);
      throw new Error("Error updating votes");
    }
  }
  