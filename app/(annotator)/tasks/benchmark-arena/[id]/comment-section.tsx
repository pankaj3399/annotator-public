"use client"

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Edit, CornerDownRight } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { updateBenchmarkProposalDetails } from "@/app/actions/benchmarkProposals";
import mongoose from "mongoose";

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
  const { data: session } = useSession();

  const updateProposal = async (updatedComments: Comment[]) => {
    try {
      await updateBenchmarkProposalDetails(proposalId, { comments: updatedComments });
    } catch (error) {
      console.error("Failed to update proposal:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !session?.user) return;
    const comment: Comment = {
      _id: new mongoose.Types.ObjectId().toHexString(),
      content: newComment,
      author: {
        _id: session.user.id,
        name: session.user.name || "",
      },
      createdAt: new Date().toISOString(),
      replies: [],
    };
    
    const updatedComments = [comment, ...comments];
    setComments(updatedComments);
    setNewComment("");
    await updateProposal(updatedComments);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!reply.trim() || !session?.user) return;
    const replyComment: Comment = {
      _id: new mongoose.Types.ObjectId().toHexString(),
      content: reply,
      author: {
        _id: session.user.id,
        name: session.user.name || "",
      },
      createdAt: new Date().toISOString(),
    };
    
    const updatedComments = comments.map(comment => 
      comment._id === parentId 
        ? { ...comment, replies: [...(comment.replies || []), replyComment] } 
        : comment
    );
    
    setComments(updatedComments);
    setReply("");
    setReplyingTo(null);
    await updateProposal(updatedComments);
  };

  return (
    <Card className="p-4">
      <div className="mb-6">
        <Textarea
          placeholder="What are your thoughts?"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-2"
        />
        <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>Comment</Button>
      </div>
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
                  {(ownerId === session?.user?.id) && <Button variant="ghost" size="sm" onClick={() => setReplyingTo(comment._id)}>Reply</Button>}
                </div>
              </div>
            </div>
            {replyingTo === comment._id && (
              <div className="pl-10 mt-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="mb-2"
                />
                <Button onClick={() => handleSubmitReply(comment._id)} disabled={!reply.trim()}>Reply</Button>
              </div>
            )}
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
      </div>
    </Card>
  );
}
