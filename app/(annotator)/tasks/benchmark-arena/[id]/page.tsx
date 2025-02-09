"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2 } from "lucide-react";
import { CommentSection } from "./comment-section";
import { OwnerCard } from "./owner-card";
import { getBenchmarkProposalDetails, updateVoteBenchmarkProposal } from "@/app/actions/benchmarkProposals";
import { usePathname } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Loader from "@/components/ui/NewLoader/Loader";
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
  const pathName = usePathname();
  const benchmarkId = pathName.split("/")[3];
  const { data: session } = useSession();
  const { votes, setVote } = useVoteStore();
  const [shareDialogOpen,setShareDialogOpen]=useState(false);
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

  const handleVote = async (e: React.MouseEvent, type: "up" | "down") => {
    e.stopPropagation();
    if (!session?.user?.id) {
      toast.error("You must be logged in to vote");
      return;
    }

    const userId = session.user.id;
    const currentVote = votes[benchmarkId] || 0;
    const voteValue = type === "up" ? 1 : -1;

    // Toggle vote: if the same vote is clicked, reset to 0 (remove vote)
    const newVote = currentVote === voteValue ? 0 : voteValue;

    // Optimistically update the vote in the store
    setVote(benchmarkId, newVote);

    // Optimistically update the proposal
    setProposal((prev: any) => {
      if (!prev) return prev;

      // Remove previous vote, then add new one
      const updatedVotes = prev.votes.filter((v: any) => v.userId !== userId);
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
      toast.error("Failed to update vote in database");
      console.error(error);

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

  const getTotalVotes = (votes: any[]) => {
    return votes.reduce((acc, v) => acc + v.vote, 0);
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1" 
                  onClick={(e) => handleVote(e, "up")}
                > 
                  <ArrowBigUp className={`h-5 w-5 ${votes[benchmarkId] === 1 ? "text-blue-500" : "text-gray-500"}`} />
                </Button>
                <span className="text-xs font-medium text-gray-600">
                  {getTotalVotes(proposal.votes)}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1" 
                  onClick={(e) => handleVote(e, "down")}
                > 
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