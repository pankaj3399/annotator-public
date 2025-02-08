import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"

export const Sidebar: React.FC = () => {
  return (
    <div className="w-full lg:w-80 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About Benchmark Arena</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Benchmark Arena is a place to discover, discuss, and vote on benchmark proposals. Join the community to
            improve AI benchmarking!
          </p>
          <Button className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Benchmark
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-blue-600 hover:underline">
                Natural Language Processing
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:underline">
                Computer Vision
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:underline">
                Reinforcement Learning
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:underline">
                Speech Recognition
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

