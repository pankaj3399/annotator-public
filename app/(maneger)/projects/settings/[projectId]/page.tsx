'use client'

import { SheetMenu } from "@/components/admin-panel/sheet-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Loader from '@/components/ui/Loader/Loader'
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from "react-hook-form"
import * as z from "zod"

const formSchema = z.object({
  earnings_per_task: z.string().refine(
    (value) => {
      const num = parseFloat(value)
      return !isNaN(num) && num >= 0
    },
    {
      message: "Must be a valid positive number",
    }
  ),
})

interface ProjectSettings {
  earnings_per_task: string
}

export default function ProjectSettings() {
  const router = useRouter()
  const { projectId } = useParams() // This matches your [projectId] folder name
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<ProjectSettings>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      earnings_per_task: "0.00"
    },
  })

  useEffect(() => {
    if (session) {
      if (session?.user?.role !== 'project manager') {
        router.push('/tasks')
        return
      }

      if (!projectId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Project ID is missing",
        })
        router.push('/')
        return
      }

      // Fetch current project settings
      fetch(`/api/projects/${projectId}/settings`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            form.reset({
              earnings_per_task: data.settings.earnings_per_task.toFixed(2)
            })
          } else {
            throw new Error(data.error || 'Failed to load settings')
          }
        })
        .catch((error) =>
          toast({
            variant: "destructive",
            title: "Error loading settings",
            description: error.message,
          })
        )
        .finally(() => setIsLoading(false))
    }
  }, [session, router, projectId, form, toast])

  if (!session || isLoading) {
    return <Loader />
  }

  const onSubmit = async (data: ProjectSettings) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          earnings_per_task: parseFloat(data.earnings_per_task)
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings')
      }

      toast({
        title: "Settings updated",
        description: "Project settings have been successfully updated.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Settings</h1>
          <SheetMenu />
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Task Settings</CardTitle>
            <CardDescription>
              Configure the payment settings for tasks in this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="earnings_per_task"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Earnings per Task (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Set the amount paid to annotators for each completed task
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Save Settings</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}