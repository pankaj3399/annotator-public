"use client"

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, CornerDownRight, Info } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { updateBenchmarkProposalDetails } from "@/app/actions/benchmarkProposals";
import mongoose from "mongoose";
import Link from "next/link";
import { useParams } from "next/navigation";

export interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  author: {
    _id: string;
    name: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  proposalId: string;
  ownerId: string;
  initialComments?: Comment[];
}

export function CommentSection({ proposalId, ownerId, initialComments = [] }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [reply, setReply] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const {id} = useParams();
  const { data: session } = useSession();

  const updateProposal = async (updatedComments: Comment[]) => {
    try {
      await updateBenchmarkProposalDetails(proposalId, { comments: updatedComments });
    } catch (error) {
      console.error("Failed to update proposal:", error);
    }
  };
  return (
<Card className="p-4">
  <div className="space-y-4">
    {comments.map((comment) => (
      <div key={comment._id} className="flex flex-col gap-2">
        <div className="flex gap-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/default-user.png" />
            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span className="font-medium">{comment.author.name}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{format(new Date(comment.createdAt), "PP")}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
            <div className="flex items-center gap-4 text-gray-500">
              {(ownerId === session?.user?.id) && (
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(comment._id)}>
                  Reply
                </Button>
              )}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="pl-6 border-l ml-6 mt-2 space-y-2">
            {comment.replies.map(reply => (
              <div key={reply._id} className="flex gap-4">
                <CornerDownRight className="text-gray-500" />
                <p className="text-sm text-gray-700">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    ))}

    {/* Improved "Please login to comment" UI */}
    <div className="flex justify-center">
      <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
        <Info className="w-5 h-5 text-gray-500" />
        <p className="text-sm text-gray-700">
  Please{" "}
  <Link
    href={session?.user ? `/tasks/benchmark-arena/${id}` : `/auth/login`}
    className="text-blue-600 font-medium hover:underline"
  >
    log in
  </Link>{" "}
  to comment.
</p>

      </div>
    </div>
  </div>
</Card>

  );
}
