import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WagmiProvider } from '../components/providers/WagmiProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NFT Payment',
  description: 'Make payments for NFTs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </body>
    </html>
  )
}
