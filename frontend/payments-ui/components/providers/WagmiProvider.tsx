'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider as Provider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

export const zkSyncChain = defineChain({
  id: 271,
  name: 'zkSync Nexus Devnet 2',
  network: 'zksync',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://zksync1.nexus.avail.tools'],
    },
    public: {
      http: ['https://zksync1.nexus.avail.tools'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://zksync1.nexus.avail.tools' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 11907934,
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [zkSyncChain],
  connectors: [
    injected(),
  ],
  transports: {
    [zkSyncChain.id]: http('https://zksync1.nexus.avail.tools'),
  },
});

const queryClient = new QueryClient();

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
