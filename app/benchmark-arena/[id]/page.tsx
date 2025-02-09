"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2 } from "lucide-react";
import { CommentSection } from "@/app/(annotator)/tasks/benchmark-arena/[id]/comment-section";
import { OwnerCard } from "@/app/(annotator)/tasks/benchmark-arena/[id]/owner-card";
import { getBenchmarkProposalDetails, updateVoteBenchmarkProposal } from "@/app/actions/benchmarkProposals";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";
import Loader from "@/components/ui/NewLoader/Loader";
import { toast } from "sonner";
import ShareDialog from "@/components/ShareDialog";
interface VoteStore {
  votes: Record<string, number>;
  setVote: (benchmarkId: string, vote: number) => void;
}

const useVoteStore = create<VoteStore>((set) => ({
  votes: {},
  setVote: (benchmarkId, vote) =>
    set((state) => ({ votes: { ...state.votes, [benchmarkId]: vote } })),
}));

export default function BenchmarkProposalDetail() {
  const [proposal, setProposal] = useState<any>();
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { id } = useParams();
  const benchmarkId = id as string;
  const { data: session } = useSession();
  const { votes, setVote } = useVoteStore();
  const router = useRouter();
  const [shareDialogOpen,setShareDialogOpen]=useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedProposal = await getBenchmarkProposalDetails(benchmarkId);
        setProposal(fetchedProposal);
        const userResponse = await axios.get(`/api/users/profile/${fetchedProposal.user}`);
        setUser(userResponse.data);
        
        const userVote = fetchedProposal.votes.find((v: any) => v.userId === session?.user?.id)?.vote || 0;
        setVote(benchmarkId, userVote);
      } catch (err) {
        setError("Failed to load proposal details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [benchmarkId, session, setVote]);

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleVote = async (type: "up" | "down") => {
    if (!session?.user?.id) {
      router.push(`/auth/login/${benchmarkId}`);
      return;
    }

    const userId = session.user.id;
    const currentVote = votes[benchmarkId] || 0;
    let newVote = 0;

    if (type === "up") {
      newVote = currentVote === 1 ? 0 : 1;
    } else {
      newVote = currentVote === -1 ? 0 : -1;
    }

    // Optimistically update local state
    setVote(benchmarkId, newVote);
    setProposal((prev: any) => {
      if (!prev) return prev;

      // Remove previous vote if it exists
      const updatedVotes = prev.votes.filter((v: any) => v.userId !== userId);
      
      // Add new vote if it's not 0
      if (newVote !== 0) {
        updatedVotes.push({ userId, vote: newVote });
      }

      return {
        ...prev,
        votes: updatedVotes
      };
    });

    try {
      await updateVoteBenchmarkProposal(benchmarkId, userId, newVote);
    } catch (error) {
      console.error("Failed to update vote in database", error);
      
      // Revert optimistic updates on error
      setVote(benchmarkId, currentVote);
      setProposal((prev: any) => {
        if (!prev) return prev;

        const revertedVotes = prev.votes.filter((v: any) => v.userId !== userId);
        if (currentVote !== 0) {
          revertedVotes.push({ userId, vote: currentVote });
        }

        return {
          ...prev,
          votes: revertedVotes
        };
      });
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
  if (!proposal || !user) return null;

  return (
    <div className="p-4 w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6">
        <div className="space-y-6 min-w-0">
          <Card className="p-4 sm:p-6">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="flex flex-col items-center space-y-1 w-10 sm:w-12 flex-shrink-0">
                <Button variant="ghost" size="sm" className="p-1" onClick={() => handleVote("up")}> 
                  <ArrowBigUp className={`h-5 w-5 ${votes[benchmarkId] === 1 ? "text-blue-500" : "text-gray-500"}`} />
                </Button>
                <span className="text-xs font-medium text-gray-600">
                  {proposal.votes.reduce((acc: number, v: any) => acc + v.vote, 0)}
                </span>
                <Button variant="ghost" size="sm" className="p-1" onClick={() => handleVote("down")}> 
                  <ArrowBigDown className={`h-5 w-5 ${votes[benchmarkId] === -1 ? "text-red-500" : "text-gray-500"}`} />
                </Button>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sm text-gray-600 truncate">
                      Posted by {user.name || "Anonymous"}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(proposal.created_at), "PP")}
                    </span>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mb-3 break-words">
                  {proposal.name}
                </h1>
                <div className="flex space-x-2 mb-4">
                  <Badge variant="secondary" className="truncate">{proposal.domain}</Badge>
                </div>
                <div className="text-gray-700 mb-4 space-y-2">
                  <h2 className="font-semibold text-lg">Description</h2>
                  <p className="text-sm leading-relaxed text-justify break-words">
                    {proposal.description}
                  </p>
                </div>
                <div className="text-gray-700 mb-4 space-y-2">
                  <h2 className="font-semibold text-lg">Intended Purpose</h2>
                  <p className="text-sm leading-relaxed text-justify break-words">
                    {proposal.intendedPurpose}
                  </p>
                </div>
                <div className="flex flex-wrap items-center space-x-2 sm:space-x-4 text-gray-500">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Comments ({proposal.comments.length})</span>
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }} 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          <CommentSection proposalId={proposal._id} ownerId={proposal.user} initialComments={proposal.comments} />
        </div>
        <div className="lg:sticky lg:top-6">
          <OwnerCard owner={user} />
        </div>
      </div>
      <ShareDialog 
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/benchmark/${benchmarkId}`}
      />
    </div>
  );
}