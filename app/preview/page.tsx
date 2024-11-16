'use client'
import { StatusType } from '@/components/review-dock'
import Loader from '@/components/ui/Loader/Loader'
import { toast } from '@/hooks/use-toast'
import EditorProvider from '@/providers/editor/editor-provider'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getTemplate, upsertTemplate } from '../actions/template'
import { template } from '../template/page'
import Editor from './editor'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export interface task {
  _id: string
  name: string
  project: string
  created_at: string
  content: string
  status: StatusType
  submitted: boolean
}

const Page = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const templateId = searchParams.get('templateId')
  const [template, setTemplate] = useState<template>()
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const template: template = JSON.parse(await getTemplate(templateId as string))
        setTemplate(template)
        setLoading(false)
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message })
        router.back()
      }
    }
    fetchData()
  }, [templateId, router])

  if (loading) {
    return <Loader />
  }

  if (template == undefined ) {
    toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong' })
    router.back()
    return null
  }

  async function handleEditTemplate() {
    if (template == undefined ) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong' })
      router.back()
      return null
    }
    
    const defaultTemplate = {
      name: template.name,
      project: template.project,
      content: template.content
    }
    const Template: template = JSON.parse(await upsertTemplate(projectId as string, defaultTemplate as template, undefined, true))
    router.push(`/template?Id=${Template._id}`)
  }

  return (
    <EditorProvider
      subaccountId={template.project}
      funnelId={template._id}
      pageDetails={template}
    >
      <Editor pageId={templateId as string} liveMode={true} />
      {session?.user?.role === 'project manager' && <>
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 border border-gray-200 rounded-full bg-white shadow-sm">
          <div className="flex items-center space-x-2 px-4 py-2">
            <Button
              variant="ghost"
              onClick={handleEditTemplate}
            >
              Save and Edit this template
            </Button>
          </div>
        </div>
      </>}
    </EditorProvider>
  )
}

export default Page

