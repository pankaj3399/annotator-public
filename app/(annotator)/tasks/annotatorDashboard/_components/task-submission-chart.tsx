"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Pie, PieChart, Cell, Legend, ResponsiveContainer } from "recharts"

const chartConfig = {
  submitted: {
    label: "Submitted",
    color: "hsl(var(--chart-1))",
  },
  notSubmitted: {
    label: "Not Submitted",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))']

type Data = {
  name: string
  value: number
}

export default function TaskSubmissionChartComponent({ totalTasks, submittedTasks }: { totalTasks: number, submittedTasks: number }) {
  const data = [
    { name: 'Submitted', value: submittedTasks },
    { name: 'Not Submitted', value: totalTasks - submittedTasks }
  ]

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Task Submission Status</CardTitle>
        <CardDescription>
          {totalTasks === 0
            ? "No tasks available"
            : "Distribution of submitted vs. not submitted tasks"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalTasks === 0 ? (
          <div className="flex items-center justify-center h-72">
            <p className="text-muted-foreground text-center">
              No tasks available. <br />
              Start by adding some tasks!
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-72 w-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => entry.name}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {totalTasks === 0
            ? "No tasks available"
            : `Total Tasks: ${totalTasks}`}
        </div>
        {/* {totalTasks > 0 && (
          <div>
            Submitted: {submittedTasks} | Not Submitted: {totalTasks - submittedTasks}
          </div>
        )} */}
      </CardFooter>
    </Card>
  )
}