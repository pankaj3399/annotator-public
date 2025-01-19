"use client"

import { Project } from "@/app/(maneger)/page"
import { CopyTemplate } from "@/app/actions/template"
import { template } from "@/app/template/page"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function TemplateCopier({ template, isDialogOpen, setIsDialogOpen }: { template: template, isDialogOpen: boolean, setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>}) {
  const [projectName, setProjectName] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [isCopying, setIsCopying] = useState(false)
  const router = useRouter()

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCopying(true)


    const res = await CopyTemplate(projectName, templateName, template.content)
    if (!res.success) {
      toast({
        title: "Error",
        description: res.error,
        variant: "destructive",
      })
      setIsCopying(false)
      return
    }
    router.push(`/projects/${res.project._id}`);

    setIsCopying(false)
    setIsDialogOpen(false)
    setProjectName("")
    setTemplateName("")
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Copy Template</DialogTitle>
          <DialogDescription>
            Enter the project name and the new template name for create a copy of this template.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCopy}>
        <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="projectName" className="text-nowrap">
                Project Name
              </Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className=""
                required
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="templateName" className="text-nowrap">
                Template Name
              </Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className=""
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCopying}>
              {isCopying ? "Copying..." : "Copy Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}