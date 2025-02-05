"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";

const chartConfig = {
  accepted: {
    label: "Accepted",
    color: "hsl(var(--chart-1))",
  },
  pending: {
    label: "Pending",
    color: "hsl(var(--chart-4))",
  },
  rejected: {
    label: "Rejected",
    color: "hsl(var(--chart-2))",
  },
  reassigned: {
    label: "Reassigned",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-4))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))']

type Data = { name: string; value: number }[]

export default function ChartComponent({statuses, totalTasks}: {statuses: string[], totalTasks: number}) {
  const data = useMemo(() => {
    const statusMap: Record<string, number> = {};

    statuses?.forEach((status) => {
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.keys(chartConfig).map((key) => ({
      name: key,
      value: statusMap[key] || 0,
    }));
  }, [statuses]);

  return (
    <Card className="w-full flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Task Status</CardTitle>
        <CardDescription>Current Status Overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
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
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {totalTasks}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Tasks
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {totalTasks === 0 ? "No tasks yet" : "Task distribution overview"}
        </div>
        <div className="leading-none text-muted-foreground">
          {totalTasks === 0 ? "Add tasks to see the distribution" : "Showing current status of all tasks"}
        </div>
      </CardFooter>
    </Card>
  )
}