"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { CheckSquare, FileText, Layers, Users } from "lucide-react"

interface OverviewData {
  projects: number
  templates: number
  tasks: number
  annotators: number
}

export default function ProjectDashboardCard({ rework,annotator,totalTasks }: { rework: number,annotator: number, totalTasks: number }) {

  const items = [
    // { label: 'Projects', value: projects, icon: Layers },
    // { label: 'Templates', value: templates, icon: FileText },
    { label: 'Reworks', value: rework, icon: Layers },
    { label: 'Tasks', value: totalTasks? totalTasks : 0, icon: CheckSquare },
    { label: 'Annotators', value: annotator, icon: Users },
  ]

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center justify-center space-y-2 p-4 bg-muted  rounded-lg  transition-shadow hover:shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon className="h-8 w-8 text-primary" />
              </motion.div>
              <motion.span 
                className="text-3xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                {item.value}
              </motion.span>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}