'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail } from "lucide-react"

interface FormData {
  email: string
  invitationCode: string
  [key: string]: any
}

interface InvitationStepProps {
  formData: FormData
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  verifyInvitationCode: () => Promise<void>
  handleInvitationRequest: () => Promise<void>
  isRequestSubmitted: boolean
  invitationMode: 'enter' | 'request'
  setInvitationMode: (mode: 'enter' | 'request') => void
  onBack: () => void
}

export default function InvitationStep({
  formData,
  handleChange,
  verifyInvitationCode,
  handleInvitationRequest,
  isRequestSubmitted,
  invitationMode,
  setInvitationMode,
  onBack
}: InvitationStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center mb-6">
          AI Innovator Access
        </h2>
        
        <div className="space-y-6">
          <div className="flex justify-center gap-4">
            <Button
              variant={invitationMode === 'enter' ? "default" : "outline"}
              onClick={() => setInvitationMode('enter')}
            >
              I have a code
            </Button>
            <Button
              variant={invitationMode === 'request' ? "default" : "outline"}
              onClick={() => setInvitationMode('request')}
            >
              Request access
            </Button>
          </div>

          {invitationMode === 'enter' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invitationCode">Invitation Code</Label>
                <Input
                  id="invitationCode"
                  value={formData.invitationCode}
                  onChange={handleChange}
                  placeholder="Enter your invitation code"
                  required
                />
              </div>
              <Button onClick={verifyInvitationCode} className="w-full">
                Verify Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {!isRequestSubmitted ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <Button onClick={handleInvitationRequest} className="w-full">
                    Request Invitation
                  </Button>
                </>
              ) : (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Thanks for your interest! We'll review your request and send an invitation code to your email if approved.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              className="text-sm text-gray-600 hover:underline"
              onClick={onBack}
            >
              ← Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}