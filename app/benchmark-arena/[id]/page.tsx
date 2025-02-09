"use client";

import { useState, useEffect } from "react";
import { create } from "zustand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2 } from "lucide-react";
import { OwnerCard } from "@/app/(annotator)/tasks/benchmark-arena/[id]/owner-card";
import { CommentSection } from "@/app/(annotator)/tasks/benchmark-arena/[id]/comment-section";
import { getBenchmarkProposalDetails, updateVoteBenchmarkProposal } from "@/app/actions/benchmarkProposals";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";
import Loader from "@/components/ui/NewLoader/Loader";
import Link from "next/link";

export default function BenchmarkProposalDetail() {
  const [proposal, setProposal] = useState<any>();
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pathName = usePathname();
  const benchmarkId = pathName.split("/")[2];
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        
        const fetchedProposal = await getBenchmarkProposalDetails(benchmarkId);
        setProposal(fetchedProposal);
        const userResponse = await axios.get(`/api/users/profile/${fetchedProposal.user}`);

        setUser(userResponse.data);

      } catch (err) {
        setError("Failed to load proposal details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [benchmarkId]);

  if (loading) return <Loader></Loader>;
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
                  className="p-0 h-auto"
                  onClick={() => {
                    if (!session?.user) {
                      router.push('/auth/login');
                      return;
                    }
                  }}
                >
                  <ArrowBigUp className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                </Button>
                <span className="text-xs font-medium text-gray-600">
                  {proposal.votes.reduce((acc: number, v: any) => acc + v.vote, 0)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => {
                    if (!session?.user) {
                      router.push('/auth/login');
                      return;
                    }
                  }}
                >
                  <ArrowBigDown className="h-6 w-6 text-gray-500 hover:text-gray-700" />
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
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          {session?.user ? (
            <CommentSection proposalId={proposal._id} ownerId={proposal.user} initialComments={proposal.comments} />
          ) : (
            <Card className="p-4">
              <p className="text-center text-gray-600">
                Please <Link href="/auth/login" className="text-blue-500 hover:underline">login</Link> to comment
              </p>
            </Card>
          )}
        </div>
        <div className="lg:sticky lg:top-6">
          <OwnerCard owner={user} />
        </div>
      </div>
    </div>
  );
}
