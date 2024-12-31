'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider as Provider, WagmiConfig, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

export const zkSyncChain = defineChain({
  id: 272,
  name: 'zkSync Nexus Devnet 2',
  network: 'zksync',
  nativeCurrency: {
    decimals: 18,
    name: 'EThereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://zksync2.nexus.avail.tools'],
    },
    public: {
      http: ['https://zksync2.nexus.avail.tools'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://zksync2.nexus.avail.tools' },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [zkSyncChain],
  connectors: [
    injected(),
  ],
  transports: {
    [zkSyncChain.id]: http('https://zksync2.nexus.avail.tools'),
  },
});

const queryClient = new QueryClient();

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>{children}</WagmiConfig>
    </QueryClientProvider>
  );
}
