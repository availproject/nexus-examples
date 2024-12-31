'use client';
import React, {
  useState,
  ChangeEventHandler,
  useRef,
  useEffect
} from 'react';
import ModalWrapper from './ModalWrapper';
import { Message, NexusInfo, NFT, RpcProof, TransferStatus } from 'lib/zknft/types';
import type { AccountApiResponse } from 'lib/zknft/index';
import { fetchUpdatesFromNexus, getAccountState, getSellerWallet, getStorageProof, lockNFT, ownerOf, transferNFT } from 'lib/zknft';
import { getPaymentOptions } from 'lib/zknft/paymentOptions';
import { bytesToHex } from "web3-utils";
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUrl } from 'nextjs-current-url';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCopy,
  faSpinner,
  faWallet,
  faExchangeAlt,
  faSignOutAlt
} from "@fortawesome/free-solid-svg-icons";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient, useWriteContract, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { nftContractAddress, nftMintProviderURL, paymentTokenAddr } from 'lib/zknft/config';
import { getPaymentChainProvider } from 'lib/zknft';
import type { PaymentOption } from 'lib/zknft/paymentOptions';
import { Contract, Provider } from 'zksync-ethers';

const REQUIRED_CHAIN_ID = 271; // NFT chain ID

interface BuyNftModalProps {
  open: boolean;
  nftID: number;
}

const TransferSteps = {
  NotStarted: 0,
  Locking: 1,
  Locked: 2,
  PaymentInProgress: 3,
  PaymentComplete: 4,
  MintingInProgress: 5,
  Complete: 6,
} as const;

type TransferStep = typeof TransferSteps[keyof typeof TransferSteps];

function ProgressBar({ currentStep }: { currentStep: TransferStep }) {
  const steps = [
    "Initiate Transfer",
    "Lock NFT",
    "Make Payment",
    "Complete Transfer"
  ];

  const currentProgress = (currentStep / (Object.keys(TransferSteps).length - 1)) * 100;

  return (
    <div className="w-full mb-4">
      <div className="w-full h-2 bg-gray-800 rounded-full">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${currentProgress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`text-xs ${currentStep >= index * 2 ? 'text-blue-400' : 'text-gray-500'}`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusMessage({ status }: { status: TransferStatus }) {
  const messages = {
    [TransferStatus.NotInitiated]: "Ready to initiate transfer",
    [TransferStatus.WaitingForLock]: "Locking NFT...",
    [TransferStatus.WaitingForPayment]: "NFT locked. Ready for payment",
    [TransferStatus.PaymentDone]: "Payment successful",
    [TransferStatus.TransferInProgress]: "Transfer in progress",
    [TransferStatus.NFTTransferred]: "Transfer complete"
  };

  return (
    <div className={`text-sm ${status === TransferStatus.NotInitiated ? 'text-gray-400' : 'text-blue-400'} mb-4`}>
      {messages[status] || "Processing..."}
    </div>
  );
}

export default function BuyNftModal({
  open,
  nftID,
}: BuyNftModalProps) {
  //const [buyer, setBuyer] = useState('');
  const [nftStatus, setNftStatus] = useState<TransferStatus | null>(null);
  const [paymentReceiptWithProof, setPaymentReceiptWithProof] = useState<[AccountApiResponse, RpcProof] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  //const [paymentAttemptDone, setPaymentAttemptDone] = useState(false);
  const router = useRouter();

  // Wallet connection
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Form state
  const [payingFromAddress, setPayingFromAddress] = useState<string>('');
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption | null>(null);
  const [paymentTokenSymbol, setPaymentTokenSymbol] = useState<string>('');

  const isPaymentSelected = selectedPaymentOption !== null;

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayingFromAddress(e.target.value);
  };

  const useConnectedWalletAddress = () => {
    if (isConnected && connectedAddress) {
      setPayingFromAddress(connectedAddress);
    }
  };

  const closeModal = () => {
    // Close the modal and remove the query parameters from the URL
    router.replace('/');
  };
  const params = useSearchParams();
  const paymentAddress: string | null = params.get("selectedPaymentAddress") as string || null;
  const paymentBlockNumber: string | null = params.get("paymentBlockNumber") as string || null;
  const receiptHash: string | null = params.get("receiptHash") as string || null;
  const message: string | null = params.get("paymentReceipt");
  const currentUrl = paymentAddress && paymentAddress !== '' ? `http://localhost:3000/?buyNFT=true&tokenID=${nftID}&selectedPaymentAddress=${paymentAddress}'` : `http://localhost:3000/?buyNFT=true&tokenID=${nftID}`;

  // Debug selected payment option
  useEffect(() => {
    console.log('Selected Payment Option:', selectedPaymentOption);
  }, [selectedPaymentOption]);

  // Fetch payment options
  useEffect(() => {
    getPaymentOptions().then((options) => {
      console.log('Available Payment Options:', options);
      setPaymentOptions(options);
    });
    console.log("receiptHash", receiptHash);
    if (receiptHash) {
      setNftStatus(TransferStatus.WaitingForPayment);
    } else {
      setNftStatus(TransferStatus.NotInitiated);
    }
    if (nftID && connectedAddress) {
      console.log('Checking NFT ownership...');
      ownerOf(nftID).then((owner: string) => {
        console.log('NFT owner:', owner);
        if (owner.toLowerCase() === connectedAddress.toLowerCase()) {
          setNftStatus(TransferStatus.NFTTransferred);
        }
      }).catch((err: any) => {
        console.log('Error checking NFT ownership:', err);
      });
    }
  }, []);

  const switchToNFTChain = async () => {
    console.log('Current chain ID:', chainId);
    if (chainId !== REQUIRED_CHAIN_ID) {
      try {
        console.log('Switching to NFT chain...');
        if (!switchChainAsync) {
          throw new Error('Chain switching not available');
        }
        await switchChainAsync({
          chainId: REQUIRED_CHAIN_ID,
        });
        console.log('Successfully switched to NFT chain');
        return true;
      } catch (error) {
        console.error('Failed to switch network:', error);
        alert('Please switch to NFT chain network manually');
        return false;
      }
    }
    return true;
  };

  const handleSend = async () => {
    console.log("handleSend", paymentAddress, paymentReceiptWithProof, message);
    if (!payingFromAddress) {
      useConnectedWalletAddress();
    }

    if (payingFromAddress && paymentReceiptWithProof && message) {
      setIsLoading(true);
      try {
        // First ensure we're on the right chain
        const switched = await switchToNFTChain();
        if (!switched) {
          setIsLoading(false);
          return;
        }

        let decodedMessage: Message = JSON.parse(message);
        const nexusStatus = paymentReceiptWithProof[0];
        const proof = paymentReceiptWithProof[1];

        console.log('Minting NFT with:', {
          nexusStatus,
          decodedMessage,
          proof
        });

        const receipt = await transferNFT(
          nexusStatus,
          proof,
          decodedMessage,
          writeContractAsync,
          publicClient
        );

        console.log('NFT minted successfully:', receipt);
        setNftStatus(TransferStatus.NFTTransferred);
      } catch (error) {
        console.error("Minting NFT failed:", error);
        alert("NFT Minting failed, refresh page and retry.");
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log('Missing required parameters:', {
        payingFromAddress,
        paymentReceiptWithProof: !!paymentReceiptWithProof,
        message: !!message
      });
    }
  }

  const initiateTransfer = () => {
    setNftStatus(TransferStatus.WaitingForLock);
    lockNFT(selectedPaymentOption as PaymentOption, nftID, payingFromAddress).then(() => {
      setNftStatus(TransferStatus.WaitingForPayment);
      // router.push(`http://localhost:3001/?amount=${100}&origin='${encodeURIComponent(currentUrl + "&paymentDone=true")}'`)
    }).catch((error) => {
      console.error("Locking NFT failed:", error);
      alert("NFT Locking failed, refresh page and retry.");
      setNftStatus(TransferStatus.NotInitiated); // Handle any errors during locking
    });
  }

  const check = () => {
    checkPaymentAndSet();
    router.refresh();
  }

  const checkPaymentAndSet = () => {
    if (message && paymentBlockNumber && receiptHash) {
      let paymentOption = selectedPaymentOption;
      if (!paymentOption) {
        getPaymentOptions().then((options) => {
          console.log('Available Payment Options:', options);
          if (options && options.length > 0) {
            setSelectedPaymentOption(options[0] as PaymentOption);
            paymentOption = options[0] as PaymentOption;
          } else {
            console.error('No payment options available');
            return;
          }
        }).catch(error => {
          console.error('Failed to get payment options:', error);
          return;
        });
      }

      setIsLoading(true);
      let decodedMessage: Message;
      try {
        decodedMessage = JSON.parse(message);
        console.log('Decoded message:', decodedMessage);
      } catch (error) {
        console.error('Failed to parse message:', error);
        setIsLoading(false);
        return;
      }

      if (!paymentOption) {
        console.error('No payment option available');
        setIsLoading(false);
        return;
      }

      getAccountState(paymentOption as PaymentOption)
        .then((nexusStatus) => {
          console.log('Got nexus status:', nexusStatus);
          if (decodedMessage && nexusStatus) {
            return getStorageProof(
              nexusStatus.response.account.height,
              decodedMessage,
              paymentOption as PaymentOption,
              receiptHash
            ).then(proof => {
              console.log('Got storage proof:', proof);
              if (proof && proof.value != "0x0000000000000000000000000000000000000000000000000000000000000000") {
                setPaymentReceiptWithProof([nexusStatus, proof]);
                setNftStatus(TransferStatus.PaymentDone);
              } else {
                setNftStatus(TransferStatus.WaitingForPayment);
              }
            });
          }
        })
        .catch((error) => {
          console.error('Failed to process payment:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      console.log('Missing required parameters:', {
        message: !!message,
        paymentBlockNumber: !!paymentBlockNumber,
        receiptHash: !!receiptHash
      });
    }
  };
  useEffect(() => {
    // getBuyerAddress().then(address => {
    //   setBuyer(address)
    // })
    console.log("message", message)
    checkPaymentAndSet();
  }, [message]);

  function ModalContent() {
    if (nftStatus === null) return (
      <div className='flex h-full justify-center items-center'>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );

    const currentStep = nftStatus === TransferStatus.NotInitiated ? TransferSteps.NotStarted
      : nftStatus === TransferStatus.WaitingForLock ? TransferSteps.Locking
        : nftStatus === TransferStatus.WaitingForPayment ? TransferSteps.Locked
          : nftStatus === TransferStatus.PaymentDone ? TransferSteps.PaymentComplete
            : nftStatus === TransferStatus.NFTTransferred ? TransferSteps.Complete
              : TransferSteps.NotStarted;

    return (
      <div className='flex flex-col h-full justify-between'>
        <div>
          <ProgressBar currentStep={currentStep} />
          <StatusMessage status={nftStatus} />
        </div>
      </div>
    );
  }

  function ModalSideBar() {
    if (nftStatus === TransferStatus.PaymentDone) return (<>
      <h1 className="text-3xl text-white">Payment successful!</h1>
      <p className="font-display mt-4 text-white/80 text-sm font-medium">
        Mint your mystery NFT right now.
      </p>
    </>
    )
    else if (nftStatus === TransferStatus.NFTTransferred) return (<>
      <h1 className="text-3xl text-white">Success!</h1>
      <p className="font-display mt-4 text-white/80 text-sm font-medium">
        The NFT has now been transferred to your account.
      </p>
    </>)
    else return (<>
      <h1 className="text-3xl text-white">Buy NFT now.</h1>
      <p className="font-display mt-4 text-white/80 text-sm font-medium">
        This is the {nftID}th NFT in the collection. Buy now to experience the future with Nexus.
      </p>
    </>)
  }

  return (
    <ModalWrapper
      isOpen={open}
      closeModal={closeModal}
      contentStyle="columns"
      className="h-[600px] w-[90%] max-w-[800px] overflow-hidden"
    >
      <section className="relative h-full w-1/3 py-8 px-6 border-r border-gray-800 hidden md:block bg-gray-900">
        <ModalSideBar />
        <img
          className="absolute bottom-0 left-0 right-0 w-full object-cover h-48 opacity-50"
          src="https://www.bleepstatic.com/content/hl-images/2022/05/13/binance-mystery-nft-box.jpg"
        />
      </section>
      <section className="h-full w-full md:w-2/3 p-6 bg-gray-900 overflow-y-auto">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Connect Wallet</h2>
            <p className="text-gray-400 mb-4">Please connect your wallet to continue</p>
            <button
              onClick={handleConnect}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Connect MetaMask
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-white">Connected Wallet</h2>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                <span className="font-mono text-sm text-gray-300 truncate">
                  {connectedAddress?.substring(0, 6)}...{connectedAddress?.substring(connectedAddress.length - 4)}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => {
                      if (connectedAddress) {
                        navigator.clipboard.writeText(connectedAddress);
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faCopy} className="text-sm" />
                  </button>
                  <button
                    onClick={() => disconnect()}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Disconnect Wallet"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Paying From Address</label>
                <div className="flex items-center space-x-2">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={payingFromAddress}
                      onChange={handleAddressChange}
                      disabled={nftStatus !== TransferStatus.NotInitiated}
                      placeholder="Enter wallet address"
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>
                  {isConnected && (
                    <button
                      onClick={useConnectedWalletAddress}
                      className="p-3 bg-gray-800 text-blue-400 rounded-lg hover:bg-gray-700 transition-colors"
                      title="Use Connected Wallet"
                    >
                      <FontAwesomeIcon icon={faWallet} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Payment Option</label>
                <div className="relative">
                  <select
                    value={selectedPaymentOption?.tokenAddress || ''}
                    onChange={(e) => {
                      const option = paymentOptions.find(opt => opt.tokenAddress === e.target.value);
                      setSelectedPaymentOption(option || null);
                    }}
                    disabled={nftStatus !== TransferStatus.NotInitiated}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 appearance-none disabled:opacity-50"
                  >
                    <option value="">Select Payment Option</option>
                    {paymentOptions.map((option) => (
                      <option key={option.tokenAddress} value={option.tokenAddress}>
                        {option.tokenName} ({option.tokenSymbol}) - {option.chainName}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <FontAwesomeIcon icon={faExchangeAlt} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-grow">
              <ModalContent />
            </div>

            <div className="mt-auto pt-4">
              {nftStatus === TransferStatus.NotInitiated && (
                <button
                  onClick={() => initiateTransfer()}
                  disabled={isLoading || !isPaymentSelected || !payingFromAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  Initiate Transfer
                  {isLoading && <FontAwesomeIcon className="ml-2" icon={faSpinner} spin={true} />}
                </button>
              )}

              {nftStatus === TransferStatus.WaitingForPayment && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      console.log("currentUrl", currentUrl);
                      router.push(`http://localhost:3001/?amount=${10}&nftID=${nftID}&to=${await getSellerWallet().getAddress()}&origin='${encodeURIComponent(currentUrl + "&paymentDone=true")}'`)
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors"
                  >
                    Make Payment
                  </button>
                  <button
                    onClick={check}
                    disabled={isLoading}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Check Payment Status
                    {isLoading && <FontAwesomeIcon className="ml-2" icon={faSpinner} spin={true} />}
                  </button>
                </div>
              )}

              {nftStatus === TransferStatus.PaymentDone && (
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Complete Transfer
                  {isLoading && <FontAwesomeIcon className="ml-2" icon={faSpinner} spin={true} />}
                </button>
              )}

              {nftStatus === TransferStatus.NFTTransferred && (
                <div className="text-center text-green-400 font-semibold text-lg">
                  Transfer Complete! 🎉
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </ModalWrapper>
  );
}
