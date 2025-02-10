import { Suspense } from "react"
import AuthComponent from "./auth-component"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AuthComponent />
    </Suspense>
  )
}

