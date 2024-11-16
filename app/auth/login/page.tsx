'use client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AuthPageComponent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/',
    });

    if (res?.ok) {
      router.push('/');
      console.log('Login successful');
    } else {
      toast({
        title: "Invalid login credentials",
        description: "Please check your email and password and try again.",
        variant: "destructive",
      })
      console.log('Invalid login credentials');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 max-w-md w-full">
        <h2 className="text-4xl font-bold text-center mb-6">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-sm text-gray-600 hover:underline" onClick={
              () => router.push("/auth/signup")
            }
          >
            Don&apos;t have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}