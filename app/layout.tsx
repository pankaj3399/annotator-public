import { Toaster as Sooner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/Providers';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ProfileCompletionProvider } from '@/components/ProfileCompletionProvider';
import CookieBanner from '@/components/CookieBanner';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Blolabel',
  description: 'Blolabel',
  verification: {
    google: 'Oy8yPFUgqiBhfF7funZ8-ALHXLgN23L3CwIe5vfWzAE',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {' '}
          <ProfileCompletionProvider>
            {children}
            <CookieBanner/>
            <Sooner />
            <Toaster />{' '}
          </ProfileCompletionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
