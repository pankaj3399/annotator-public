'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '@/components/ui/NewLoader/Loader';

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
    <div className='min-h-screen p-6 bg-gray-50 relative'>
      {/* Logout button positioned at the top-right */}
      <div className='absolute top-6 right-6'>
        <Button
          onClick={() => signOut()}
          variant='outline'
          className='flex items-center gap-2'
        >
          <LogOut size={18} />
          <span className={cn('whitespace-nowrap')}>Logout</span>
        </Button>
      </div>

      <div className='max-w-4xl mx-auto'>
        {/* Navigation Bar */}
        <div className='flex justify-between items-center mb-8'>
          <div className='flex gap-4'>
            <Button>
              <Link href='/admin'>Custom Fields</Link>
            </Button>
            <Button>
              <Link href='/admin/orders'>View Orders</Link>
            </Button>
            <Button>
              <Link href='/admin/label'>Add Label</Link>
            </Button>
            <Button>
              <Link href='/admin/teams'>Manage Teams</Link>
            </Button>
          </div>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
