
'use client';

import { useState, useEffect } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import Script from 'next/script';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Member } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { LanguageProvider } from '@/context/language-context';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { useToast } from '@/hooks/use-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);
  const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      toast({
        title: "You're back online",
        description: "Your data is synchronizing with the cloud.",
      });
    };

    const handleOffline = () => {
        toast({
            title: "You're currently offline",
            description: "Changes will be saved locally and synced when you're back online.",
        });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    // Only run this check on the client and after the initial render.
    if (isClient && !loggedInMember && pathname !== '/login') {
      router.push('/login');
    }
  }, [isClient, loggedInMember, router, pathname]);

  // While the client state is being determined, or if redirection is pending, show a loader.
  if (!isClient || (!loggedInMember && pathname !== '/login')) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                 <meta name="theme-color" content="#f97316" />
                <link rel="icon" href="/icon/icon-192x192.png" type="image/png" sizes="192x192" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icon/icon-192x192.png" />
            </head>
            <body className={cn("font-sans antialiased", "min-h-screen bg-background font-sans")}>
                <LoadingAnimation />
            </body>
        </html>
    );
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f97316" />
        <title>RupeeBook</title>
        <meta name="description" content="Your Modern Accounting PWA" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon/icon-512x512.png" />
        <link rel="shortcut icon" href="/icon/favicon.ico" />
      </head>
      <body className={cn("font-sans antialiased", "min-h-screen bg-background font-sans")}>
        <LanguageProvider>
            <main className="flex-1">
                {children}
            </main>
            <Toaster />
        </LanguageProvider>
        <Script id="service-worker-installer">
            {`
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
                });
            }
            `}
        </Script>
      </body>
    </html>
  );
}
