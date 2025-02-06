'use client';

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trophy, Medal, Award } from 'lucide-react';
import { motion } from "framer-motion";

interface Leaderboard {
  annotator: {
    _id: string;
    name: string;
    email: string;
  };
  totalPoints: number;
  _id: string;
}

export default function ProjectLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const { toast } = useToast();
  const pathName = usePathname();
  const projectId = pathName.split("/")[3];

  useEffect(() => {
    if (projectId) {
      fetchLeaderboard();
    }
  }, [projectId]);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/leaderboard`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard. Please try again later.");
      }
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading leaderboard",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-3xl font-bold">Project Leaderboard</CardTitle>
        <CardDescription className="text-gray-200">Top annotators based on points</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {loadingLeaderboard ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
          </div>
        ) : leaderboard.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-[100px] font-semibold">Rank</TableHead>
                <TableHead className="font-semibold">Annotator</TableHead>
                <TableHead className="text-right font-semibold">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <motion.tr
                  key={entry._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border-b hover:bg-gray-50 transition-colors duration-200"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{index + 1}</span>
                      {getRankIcon(index)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${entry.annotator.name}`}
                        />
                        <AvatarFallback>{entry.annotator.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{entry.annotator.name}</p>
                        <p className="text-sm text-gray-500">{entry.annotator.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                      {entry.totalPoints}
                    </Badge>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leaderboard data</h3>
            <p className="mt-1 text-sm text-gray-500">No leaderboard data available for this project.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

