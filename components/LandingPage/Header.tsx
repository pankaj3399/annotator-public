'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ModeToggle } from './ThemeToggle';
import image from '@/public/static/image.png';

// --- Import Dialog Components ---
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';

const Header = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleBlogClick = () => {
    router.push('/blogs');
  };

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Reusable component for the Authentication Dialog
  const AuthDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Open authentication dialog'
        >
          <User className='h-5 w-5' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Welcome!</DialogTitle>
          <DialogDescription>
            Log in to your account or sign up to get started.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Link href='/auth/login' passHref legacyBehavior>
            <Button asChild className='w-full'>
              <a>Login</a>
            </Button>
          </Link>
          <Link href='/auth/signup' passHref legacyBehavior>
            <Button asChild variant='outline' className='w-full'>
              <a>Sign Up</a>
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderMainLinks = () => (
    <>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={() => router.push('/landing')}
      >
        Open Gigs
      </Button>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={() => router.push('/benchmark-arena')}
      >
        Benchmarks
      </Button>
      {session && (
        <Button
          className='text-base dark:text-[#ECECEC] p-0'
          variant='link'
          onClick={() => router.push('/dashboard')}
        >
          Projects
        </Button>
      )}
    </>
  );

  const renderSecondaryLinks = () => (
    <>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={handleBlogClick}
      >
        Blogs
      </Button>
      <Link href={'https://docs.blolabel.ai/'}>
        <Button className='text-base dark:text-[#ECECEC] p-0' variant='link'>
          Docs
        </Button>
      </Link>
    </>
  );

  const renderAllLinksForMobile = () => (
    <>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={() => router.push('/landing')}
      >
        Open Gigs
      </Button>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={() => router.push('/benchmark-arena')}
      >
        Benchmarks
      </Button>
      <Button
        className='text-base dark:text-[#ECECEC] p-0'
        variant='link'
        onClick={handleBlogClick}
      >
        Blogs
      </Button>
      <Link href={'https://docs.blolabel.ai/'}>
        <Button className='text-base dark:text-[#ECECEC] p-0' variant='link'>
          Docs
        </Button>
      </Link>
      {session && (
        <Button
          className='text-base dark:text-[#ECECEC] p-0'
          variant='link'
          onClick={() => router.push('/dashboard')}
        >
          Projects
        </Button>
      )}
    </>
  );

  // --- Desktop View ---
  if (isDesktop) {
    return (
      <div className='w-full h-16 bg-white/20 dark:bg-header/20 backdrop-blur-lg top-0 fixed border-b-[1px] border-[#e5e7eb] dark:border-gray-700 z-[999]'>
        <div className='container mx-auto flex justify-between items-center h-full'>
          <Image
            src={image}
            alt='Logo'
            width={112}
            height={28}
            className='h-14 w-auto object-contain'
            priority
          />

          <div className='flex space-x-4'>{renderMainLinks()}</div>

          <div className='flex space-x-4 items-center'>
            {renderSecondaryLinks()}
            {!session && <AuthDialog />} {/* <-- Use Auth Dialog */}
            <ModeToggle />
          </div>
        </div>
      </div>
    );
  }

  // --- Mobile View ---
  return (
    <Sheet>
      <div className='flex container py-3 gap-x-3 justify-between items-center fixed top-0 bg-transparent backdrop-blur-lg z-[998]'>
        <Image
          src={image}
          alt='Logo'
          width={112}
          height={28}
          className='h-14 w-auto object-contain'
          priority
        />

        <div className='flex items-center gap-x-2'>
          <ModeToggle />
          {!session && <AuthDialog />} {/* <-- Use Auth Dialog */}
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' aria-label='Open menu'>
              <svg
                className='w-8 h-8 dark:text-white'
                viewBox='0 0 15 15'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z'
                  fill='currentColor'
                  fillRule='evenodd'
                  clipRule='evenodd'
                ></path>
              </svg>
            </Button>
          </SheetTrigger>
        </div>
      </div>
      <SheetContent
        side='top'
        className='dark:bg-header bg-white rounded-t-lg border-t-0 p-4 z-[998]'
      >
        <SheetHeader className='flex justify-between items-center'>
          <Image
            src={image}
            alt='Logo'
            width={112}
            height={28}
            className='h-14 w-auto object-contain'
            priority
          />
          <SheetClose />
        </SheetHeader>
        <SheetDescription
          asChild
          className='flex flex-col justify-center items-center mt-4 space-y-4'
        >
          <div>{renderAllLinksForMobile()}</div>
        </SheetDescription>
        {/* Footer is now empty as auth buttons are in the dialog */}
        <SheetFooter className='mt-6'></SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default Header;
