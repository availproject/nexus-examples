'use client';
import { transfer } from 'lib/zknft';
import React, { useState, useEffect } from 'react';
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faUser,
  faSpinner,
  faWallet,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient, useWriteContract, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { config, zkSyncChain } from '../components/providers/WagmiProvider';

const REQUIRED_CHAIN_ID = 271;

export default function Home() {
  const searchParams = useSearchParams();
  const preSetTo: string | null = searchParams.get("to");
  const preSetAmount: string | null = searchParams.get("amount");
  const preSetNFTID: number | null = searchParams.get("nftID") ? parseInt(searchParams.get("nftID") as string) : null;
  const origin: string | null = searchParams.get("origin") || null;
  const originURL = decodeURIComponent(origin as string);
  const urlWithoutQuotes = originURL.replace(/'/g, '');

  // Wagmi hooks
  const { address, isConnected, chainId } = useAccount();
  const { connect, error: connectError } = useConnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [amount, setAmount] = useState<number | null>(preSetAmount ? parseInt(preSetAmount) : null);
  const [to, setTo] = useState<string>(preSetTo || "");
  const [from, setFrom] = useState<string>("");
  const [nftID, setNftID] = useState<number | null>(preSetNFTID || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const switchToZkSync = async () => {
    console.log('Current chain ID:', chainId);
    if (chainId !== REQUIRED_CHAIN_ID) {
      try {
        console.log('Switching to zkSync network...');
        if (!switchChainAsync) {
          throw new Error('Chain switching not available');
        }
        await switchChainAsync({
          chainId: REQUIRED_CHAIN_ID,
        });
        console.log('Successfully switched to zkSync');
        return true;
      } catch (error) {
        console.error('Failed to switch network:', error);
        setError('Please switch to zkSync network manually');
        return false;
      }
    }
    return true;
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect({ connector: injected() });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setError('Failed to connect wallet or switch network');
    } finally {
      setIsConnecting(false);
    }
  };

  // Update error state when connect error changes
  useEffect(() => {
    if (connectError) {
      setError(connectError.message);
    }
  }, [connectError]);

  // Update from address when wallet connects
  useEffect(() => {
    if (address && !from) {
      setFrom(address);
    }
  }, [address, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet first");
      }

      if (chainId !== REQUIRED_CHAIN_ID) {
        throw new Error("Please switch to zkSync network");
      }

      if (!amount || !to || !nftID) {
        throw new Error("Please fill in all required fields");
      }

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      if (!writeContractAsync) {
        throw new Error("Failed to get contract write function");
      }

      const amountInWei = ethers.parseEther(amount.toString());
      const result = await transfer(
        amountInWei,
        address,
        nftID,
        to,
        writeContractAsync,
        publicClient
      );

      if (!result) {
        throw new Error("Transfer failed");
      }

      setSuccess(true);
      if (urlWithoutQuotes) {
        const messageData = { ...result[2] };
        console.log(messageData);
        if (typeof messageData.nonce === 'bigint') {
          messageData.nonce = messageData.nonce.toString();
        }
        window.location.href = urlWithoutQuotes + `&receiptHash=${result[1]}&paymentBlockNumber=${result[0]}&paymentReceipt=${JSON.stringify(messageData)}`;
      }
    } catch (e: any) {
      console.error("Payment error:", e);
      setError(e.message || "An error occurred during payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">NFT Payment</h1>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
            <p className="text-gray-400 mb-4">Please connect your wallet to continue</p>
            {error && (
              <div className="p-4 mb-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}
            <button
              onClick={() => handleConnect()}
              disabled={isConnecting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
                  Connecting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faWallet} className="h-4 w-4" />
                  Connect MetaMask
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            {chainId !== REQUIRED_CHAIN_ID && (
              <div className="p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-200 flex items-center justify-between">
                <span>Please switch to the correct network</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    switchToZkSync();
                  }}
                  className="ml-2 px-3 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-sm"
                >
                  Switch Network
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Connected Address</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={address}
                    disabled
                    className="w-full p-3 bg-gray-700 rounded-lg text-gray-300"
                  />
                  <button
                    onClick={() => disconnect()}
                    className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    type="button"
                    title="Disconnect Wallet"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">NFT ID</label>
                <input
                  type="number"
                  value={nftID || ""}
                  onChange={(e) => setNftID(parseInt(e.target.value))}
                  placeholder="Enter NFT ID"
                  className="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                  required
                  disabled={preSetNFTID !== null}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount (ETH)</label>
                <input
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  placeholder="Enter amount in ETH"
                  className="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                  required
                  disabled={preSetAmount !== null}
                  step="any"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">To Address</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Enter recipient address"
                  className="w-full p-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                  required
                  disabled={preSetTo !== null}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
                  Payment successful!
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isConnected || chainId !== REQUIRED_CHAIN_ID}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faSpinner} spin className="h-4 w-4" />
                    Processing...
                  </span>
                ) : (
                  "Make Payment"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
