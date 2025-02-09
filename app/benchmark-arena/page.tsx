"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { getApprovedBenchmarkProposals, updateVoteBenchmarkProposal } from "@/app/actions/benchmarkProposals"
import { Search, TrendingUp } from "lucide-react"
import { ProposalCard } from "../(annotator)/tasks/benchmark-arena/Proposal-card"
import { create } from "zustand"
import { useSession } from "next-auth/react"
import Loader from "@/components/ui/NewLoader/Loader"
import Header from "@/components/LandingPage/Header"

interface BenchmarkProposalData {
  _id: string
  name: string
  description: string
  created_at: string
  likes: number
  votes: { userId: string; vote: number }[]
}

interface VoteState {
  votes: Record<string, number>
  setVote: (id: string, vote: number) => void
}

const useVoteStore = create<VoteState>((set) => ({
  votes: {},
  setVote: (id, vote) =>
    set((state) => ({
      votes: { ...state.votes, [id]: vote },
    })),
}))

export default function BenchmarkArena() {
  const router = useRouter()
  const { data: session } = useSession()
  const [proposals, setProposals] = useState<BenchmarkProposalData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { votes, setVote } = useVoteStore()


  useEffect(() => {
    async function fetchProposals() {
      try {
        const fetchedProposals = await getApprovedBenchmarkProposals()
        setProposals(fetchedProposals)

        if (session?.user?.id) {
          const userVotes: Record<string, number> = {}
          fetchedProposals.forEach((proposal:any) => {
            const userVote = proposal.votes.find((v:any) => v.userId === session.user.id)
            if (userVote) {
              userVotes[proposal._id] = userVote.vote
            }
          })
          useVoteStore.setState({ votes: userVotes })
        }
      } catch (error: any) {
        toast.error(error.message || "Error fetching proposals")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposals();
    
  }, [session?.user?.id])

  const handleVote = async (e: React.MouseEvent, id: string, vote: number) => {
    e.stopPropagation()
    if (!session?.user?.id) {
      router.push(`/auth/login/1`)
      return
    }

    const userId = session.user.id
    const currentVote = votes[id] || 0

    // Toggle vote: if the same vote is clicked, reset to 0 (remove vote)
    const newVote = currentVote === vote ? 0 : vote

    setVote(id, newVote)

    setProposals((prev) =>
      prev.map((proposal) => {
        if (proposal._id !== id) return proposal

        // Remove previous vote, then add new one
        const updatedVotes = proposal.votes.filter((v) => v.userId !== userId)
        if (newVote !== 0) updatedVotes.push({ userId, vote: newVote })

        return {
          ...proposal,
          votes: updatedVotes,
          likes: updatedVotes.reduce((acc, v) => acc + v.vote, 0),
        }
      })
    )

    try {
      await updateVoteBenchmarkProposal(id, userId, newVote)
    } catch (error) {
      toast.error("Failed to update vote in database")
      console.error(error)
    }
  }

  const handlePostClick = (id: string) => {
    router.push(`/benchmark-arena/${id}`)
  }

  const filteredProposals = proposals.filter(
    (proposal) =>
      proposal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 min-h-screen bg-gray-50">
      <Header></Header>
      <div className="max-w-7xl mt-12 mx-auto px-4 py-6">
        <div className="sticky top-0 bg-gray-50 pt-4 pb-2 z-10">
          <div className="flex items-center gap-4 mb-6">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold">Benchmark Arena</h1>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              className="pl-10 bg-white w-full"
              placeholder="Search benchmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
            <Loader></Loader>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-gray-500">No benchmark proposals found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal._id}
                proposal={proposal}
                onVote={handleVote}
                onPostClick={handlePostClick}
                votedPosts={votes}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
