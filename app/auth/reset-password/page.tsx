// app/auth/reset-password/page.tsx
import dynamic from 'next/dynamic'
import React from 'react'

// Dynamically import the client component with SSR disabled
const ResetPasswordForm = dynamic(
  () => import('@/components/ResetPasswordForm'),
  { ssr: false }
)

export function generateStaticParams() {
  return []
}

function ResetPasswordPage() {
  return (
    <div>
      <ResetPasswordForm/>
    </div>
  )
}

export default ResetPasswordPage