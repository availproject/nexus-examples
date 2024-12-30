'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const customZkSyncChain = {
  id: 272,
  name: 'zkSync Nexus Devnet 1',
  network: 'zksync-nexus-devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
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
  testnet: true,
} as const;

const config = createConfig({
  chains: [customZkSyncChain],
  connectors: [injected()],
  transports: {
    [customZkSyncChain.id]: http(customZkSyncChain.rpcUrls.default.http[0])
  }
});

const queryClient = new QueryClient();

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>{children}</WagmiConfig>
    </QueryClientProvider>
  );
}
