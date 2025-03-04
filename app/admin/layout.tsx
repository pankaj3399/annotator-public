'use client';

import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/ui/NewLoader/Loader';
import { Sidebar } from '@/components/admin-panel/sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'system admin') {
      router.push('/');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (loading) return <Loader />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed width */}
      <div className="w-64 bg-white border-r">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">


        {/* Content wrapper with padding */}
        <div className="p-6 max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}