import Navbar from 'components/layout/navbar';
import { Inter } from 'next/font/google';
import { ReactNode, Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { WagmiProvider } from 'components/providers/WagmiProvider';

export const metadata: Metadata = {
  title: 'ZKNFT App Nexus Devnet',
  description: 'A demo to experience contingent transactions with Nexus',
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true} className="bg-neutral-50 text-black selection:bg-teal-300 dark:bg-neutral-900 dark:text-white dark:selection:bg-pink-500 dark:selection:text-white">
        <WagmiProvider>
          <Navbar />
          <Suspense>
            <main>{children}</main>
          </Suspense>
        </WagmiProvider>
      </body>
    </html>
  );
}
