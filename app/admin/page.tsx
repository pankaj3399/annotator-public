'use client'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

function page() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/dashboard') // Use replace instead of push to avoid back button issues
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}

export default page