"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function AuthComponent() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  const benchmarkId = searchParams.get("benchmarkId")
  let callbackUrl = "/"
  if (benchmarkId) {
    callbackUrl = benchmarkId === "1" ? "/benchmark-arena" : `/benchmark-arena/${benchmarkId}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    })
    if (res?.ok) {
      router.push(callbackUrl)
    } else {
      toast({
        title: "Invalid login credentials",
        description: "Please check your email and password and try again.",
        variant: "destructive",
      })
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const result = await signIn("google", {
        callbackUrl: "/",
        redirect: true,
      })
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Failed to sign in with Google. Please try again.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "An unexpected error occurred. Please try again.",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center mb-6">Login</h2>

        {/* Google Sign In Button */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        )}

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Login with Email
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button className="text-sm text-gray-600 hover:underline" onClick={() => router.push("/auth/signup")}>
            Don&apos;t have an account? Sign Up
          </button>
        </div>
        <div className="mt-4 text-center">
  <button className="text-sm text-gray-600 hover:underline" onClick={() => router.push("/auth/forgot-password")}>
    Forgot your password?
  </button>
</div>
      </div>
    </div>
  )
}

