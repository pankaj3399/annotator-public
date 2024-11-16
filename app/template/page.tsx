'use client'
import Loader from '@/components/ui/Loader/Loader'
import { toast } from '@/hooks/use-toast'
import EditorProvider from '@/providers/editor/editor-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getTemplate } from '../actions/template'
import Editor from './_components/editor'
import EditorNavigation from './_components/editor-navigation'
import EditorSidebar from './_components/editor-sidebar'

export type template = {
  _id: string
  name: string
  project: string
  content: string
  created_at: string
  timer: number
  private: boolean
}

const Page = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const templateId = searchParams.get('Id')
  const [template, setTemplate] = useState<template>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (templateId == null) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid project' })
      router.back()
      return
    }
    const fetchData = async () => {
      try {
        const template: template = JSON.parse(await getTemplate(templateId))
        setTemplate(template)
        setLoading(false)
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message })
        router.back()
      }
    }
    fetchData()
  }, [templateId,router])

  if (loading) {
    return <Loader />
  }

  if (template == undefined) {
    toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong' })
    router.back()
    return null
  }

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-[20] bg-background overflow-hidden">
      <EditorProvider
        subaccountId={template.project}
        funnelId={template._id}
        pageDetails={template}
      >
        <EditorNavigation
          pageId={templateId as string}
          pageDetails={template}
          projectId={template.project}
        />
        <div className="h-full flex justify-center">
          <Editor pageId={template._id} />
        </div>

        <EditorSidebar projectId={template.project} />
      </EditorProvider>
    </div>
  )
}

export default Page

