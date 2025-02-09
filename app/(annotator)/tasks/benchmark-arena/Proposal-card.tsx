import type React from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ArrowBigUp, ArrowBigDown, Share2, MessageSquare } from "lucide-react"

interface ProposalCardProps {
  proposal: {
    _id: string
    name: string
    description: string
    created_at: string
    votes: { userId: string; vote: number }[]
  }
  onVote: (e: React.MouseEvent, id: string, vote: number) => void
  onPostClick: (id: string) => void
  votedPosts: Record<string, number> // 1 (upvote), -1 (downvote), 0 (neutral)
}


export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onVote, onPostClick, votedPosts }) => {
  const userVote = votedPosts[proposal._id] || 0
  const totalVotes = proposal.votes.reduce((acc, v) => acc + v.vote, 0)

  return (
    <div
      onClick={() => onPostClick(proposal._id)}
      className="bg-white shadow-sm rounded-lg p-4 hover:border-gray-300 border border-transparent transition-colors cursor-pointer"
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={(e) => onVote(e, proposal._id, 1)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              userVote === 1 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <ArrowBigUp className="h-5 w-5" />
          </button>
          <span className="font-medium text-sm">{totalVotes}</span>
          <button
            onClick={(e) => onVote(e, proposal._id, -1)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              userVote === -1 ? "text-orange-500" : "text-gray-500"
            }`}
          >
            <ArrowBigDown className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
            <h2 className="text-base font-medium hover:text-orange-500 transition-colors truncate">{proposal.name}</h2>
            <span className="text-xs text-gray-500">{format(new Date(proposal.created_at), "PPP")}</span>
          </div>
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{proposal.description}</p>
          <div className="flex gap-3 flex-wrap">

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-gray-500 hover:text-gray-700"
              onClick={(e) => {                
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Comment
            </Button>
          </div>
        </div>
        
        
      </div>
    </div>
  )
}
