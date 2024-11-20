import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Clock,
  ListTodo,
  Target,
  AlertCircle,
  CheckSquare,
  Calendar,
  Timer,
  DollarSign,
  Star
} from "lucide-react";

interface AnnotatorOverviewCardProps {
  totalTasks: number;
  pendingTasks: number;
  accuracyRate: number;
  earnings: number;
  ratings: number;
  tasksByProject: Array<{
    projectId: string;
    projectName: string;
    earnings_per_task: number;
  }>;
}

export default function AnnotatorProjectOverviewCard({
  totalTasks,
  pendingTasks,
  accuracyRate,
  earnings,
  ratings,
  tasksByProject
}: AnnotatorOverviewCardProps) {
  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      description: "Total tasks assigned"
    },
    {
      title: "Pending Tasks",
      value: pendingTasks,
      icon: Clock,
      description: "Tasks awaiting completion"
    },
    {
      title: "Accuracy Rate",
      value: `${accuracyRate.toFixed(1)}%`,
      icon: Target,
      description: "Task accuracy rate"
    },
    {
      title: "Total Earnings",
      value: `$${earnings.toFixed(2)}`,
      icon: DollarSign,
      description: "Total earnings from all completed tasks"
    },
    {
      title: "Rating",
      value: ratings.toFixed(1),
      icon: Star,
      description: "Your overall rating"
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Project Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                {React.createElement(stat.icon, {
                  className: "w-6 h-6 text-blue-600",
                })}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-blue-600 my-2">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 text-center">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Performance Insights
          </h4>
          <ul className="space-y-2">
            <li className="text-sm text-gray-600">
              • You have completed {totalTasks - pendingTasks} out of {totalTasks} assigned tasks
            </li>
            <li className="text-sm text-gray-600">
              • Your accuracy rate is {accuracyRate.toFixed(1)}% - {accuracyRate >= 90 ? "Excellent!" : accuracyRate >= 75 ? "Good work!" : "Keep improving!"}
            </li>
            <li className="text-sm text-gray-600">
              • Your total earnings are ${earnings.toFixed(2)}
            </li>
            {tasksByProject.length > 0 && (
              <li className="text-sm text-gray-600">
                • Earnings breakdown by project:
                <ul className="ml-4 mt-1">
                  {tasksByProject.map((project, index) => (
                    <li key={project.projectId} className="text-sm text-gray-600">
                      {project.projectName}: ${project.earnings_per_task.toFixed(2)} per task
                    </li>
                  ))}
                </ul>
              </li>
            )}
            <li className="text-sm text-gray-600">
              • Your overall rating is {ratings.toFixed(1)}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}