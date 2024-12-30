import { Provider } from 'zksync-ethers';
import { nexusAppIDPayment, paymentContractAddress, paymentTokenAddr, paymentURL as paymentURLFromConfig, paymentZKSyncProviderURL } from './config';
import { ethers } from 'ethers';
import erc20Abi from './erc20.json';
// Interface for Payment Option
export interface PaymentOption {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  chainId: number;
  chainName: string;
  logoUrl?: string;
  paymentURL: string;
  paymentContractAddress: string;
  paymentProvider: string;
  nexusAppID: string;
}

// Function to fetch payment token details
export async function getPaymentOptions(): Promise<PaymentOption[]> {
  try {
    // Create provider for zkSync
    const provider = new Provider(paymentZKSyncProviderURL);

    // Fetch token details
    const contract = new ethers.Contract(paymentTokenAddr, erc20Abi, provider);
    if (!contract) {
      throw new Error('Failed to create token contract');
    }
    //TODO: replace as any
    const tokenName = await (contract as any).name();
    const tokenSymbol = await (contract as any).symbol();
    const paymentURL: string = paymentURLFromConfig;

    // Predefined chain details
    const chainDetails = {
      id: 271,
      name: 'zkSync Nexus Devnet',
      logoUrl: 'https://zksync.io/favicon.ico' // Replace with actual logo URL
    };

    return [{
      tokenAddress: paymentTokenAddr,
      tokenName,
      tokenSymbol,
      chainId: chainDetails.id,
      chainName: chainDetails.name,
      logoUrl: chainDetails.logoUrl,
      paymentURL,
      paymentContractAddress: paymentContractAddress,
      paymentProvider: paymentZKSyncProviderURL,
      nexusAppID: nexusAppIDPayment
    }];
  } catch (error) {
    console.error('Failed to fetch payment token details:', error);

    // Fallback option if fetching fails
    return [{
      tokenAddress: paymentTokenAddr,
      tokenName: 'Default Payment Token',
      tokenSymbol: 'DPT',
      chainId: 271,
      chainName: 'zkSync Nexus Devnet',
      logoUrl: 'https://zksync.io/favicon.ico',
      paymentURL: paymentURLFromConfig,
      paymentContractAddress: paymentContractAddress,
      paymentProvider: paymentZKSyncProviderURL,
      nexusAppID: nexusAppIDPayment
    }];
  }
}
