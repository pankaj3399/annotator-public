'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, AlertCircle, Check } from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getLabels, createCustomLabel } from '@/app/actions/label'

interface Label {
  _id: string
  name: string
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([])
  const [newLabel, setNewLabel] = useState<Label>({ _id: '', name: '' })
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    setIsLoading(true)
    try {
      const fetchedLabels = await getLabels()
      setLabels(fetchedLabels || [])
    } catch (error) {
        console.error(error)
      setError('Failed to fetch labels. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabel.name) {
      setError('Please provide a name for the label.')
      return
    }

    setIsLoading(true)
    try {
      const createdLabel = await createCustomLabel(newLabel.name)
      const parsedLabel = JSON.parse(createdLabel);
      setLabels(prevLabels => [...prevLabels, parsedLabel])
      setNewLabel({ _id: '', name: '' })
      setError('')
      setIsDialogOpen(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to create label')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Label Management</CardTitle>
          <CardDescription>
            Create and manage labels to organize your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {labels.length} label{labels.length !== 1 ? 's' : ''} total
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Label</DialogTitle>
                  <DialogDescription>
                    Add a new label to organize your content
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Label Name</label>
                    <Input
                      placeholder="Enter label name"
                      value={newLabel.name}
                      onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                    />
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    onClick={handleCreateLabel}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create Label
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showSuccess && (
        <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
          <Check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Label created successfully!</AlertDescription>
        </Alert>
      )}

      {isLoading && labels.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {labels.map((label) => (
            <Card key={label._id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{label.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
