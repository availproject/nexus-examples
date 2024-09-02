'use client';
import React, {
  useState,
  ChangeEventHandler,
  useRef,
  useEffect
} from 'react';
import ModalWrapper from './ModalWrapper';
import { Message, NexusInfo, NFT, RpcProof, TransferStatus } from 'lib/zknft/types';
import { fetchUpdatesFromNexus, getStorageProof, mintNFT } from 'lib/zknft';
import { bytesToHex } from "web3-utils";
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getBuyerAddress } from 'lib/zknft';
import { useUrl } from 'nextjs-current-url';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";

interface BuyNftModalProps {
  open: boolean;
}

export default async function BuyNftModal({
  open,
}: BuyNftModalProps) {
  const [buyer, setBuyer] = useState('');
  const [nftStatus, setNftStatus] = useState<TransferStatus | null>(null);
  const [paymentReceiptWithProof, setPaymentReceiptWithProof] = useState<[NexusInfo, RpcProof] | null>(null)
  //const [paymentAttemptDone, setPaymentAttemptDone] = useState(false);
  const router = useRouter();

  const closeModal = () => {
    // Close the modal and remove the query parameters from the URL
    router.replace('/');
  };
  const params = useSearchParams();
  const paymentAddress: string | null = params.get("selectedPaymentAddress") as string || null;
  const message: string | null = params.get("paymentReceipt");
  const currentUrl = paymentAddress && paymentAddress !== '' ? `http://localhost:3000/?buyNFT=true&selectedPaymentAddress=${paymentAddress}'` : `http://localhost:3000/?buyNFT=true`;
  console.log(currentUrl);
  const handleSend = async () => {
    if (paymentAddress && paymentReceiptWithProof && message) {
      let decodedMessage: Message = JSON.parse(message);
      const nexusStatus = paymentReceiptWithProof[0];
      const proof = paymentReceiptWithProof[1];

      // Call mintNFT and set status to the last step upon success
      mintNFT(nexusStatus as NexusInfo, proof, decodedMessage, (nexusStatus as NexusInfo).chainStateNumber).then((response) => {
        if (response) {
          console.log(response);
          setNftStatus(TransferStatus.NFTTransferred);
        } else {
          setPaymentReceiptWithProof(null);
          setNftStatus(TransferStatus.WaitingForPayment);
        }
      }).catch((error) => {
        console.error("Minting NFT failed:", error);
        setNftStatus(TransferStatus.NotInitiated); // Handle any errors during minting
      });
    }
  }
  const makePayment = () => {
    router.push(`http://localhost:3001/?amount=${100}&origin='${encodeURIComponent(currentUrl + "&paymentDone=true")}'`)
  }

  const check = () => {
    checkPaymentAndSet();

    router.refresh();
  }

  const checkPaymentAndSet = () => {
    console.log("SETTTINNGGGG")
    if (message) {
      let decodedMessage: Message = JSON.parse(message);
      let nexusStatus: NexusInfo | undefined = undefined;
      console.log("Fetching updates from nexus");
      fetchUpdatesFromNexus().then((i) => {
        nexusStatus = i;
        // Check if paymentReceipt is set
        if (decodedMessage && nexusStatus) {
          // Query proof using paymentReceipt
          const proof = getStorageProof(nexusStatus?.chainStateNumber, decodedMessage.messageId).then(
            proof => {
              if (proof) {
                // If proof is available, set status to PaymentDone
                setPaymentReceiptWithProof([nexusStatus as NexusInfo, proof]);
                setNftStatus(TransferStatus.PaymentDone);
              } else {
                // If proof is empty, set status to Waiting
                setNftStatus(TransferStatus.WaitingForPayment);
              }
            }).catch(error => {
              alert(error);

              setNftStatus(TransferStatus.NotInitiated);
            });
        } else {
          // If paymentReceipt is not set, set to WaitingForPayment
          setNftStatus(TransferStatus.WaitingForPayment);
        }
      }).catch((error) => {
        console.error("Failed to fetch updates from Nexus:", error);
        setNftStatus(TransferStatus.NotInitiated); // Handle fetch errors
      });
    } else {
      console.log("In else")
      setNftStatus(TransferStatus.NotInitiated);
    }
  }
  useEffect(() => {
    console.log("use effect triggered....");
    getBuyerAddress().then(address => {
      setBuyer(address)
    })

    checkPaymentAndSet();
  }, [message]);

  function ModalContent() {
    console.log(nftStatus);
    if (nftStatus === null) return (
      <div className='flex h-full justify-center items-center'>
        Loading hold on....
      </div>
    )
    else if (nftStatus === TransferStatus.NotInitiated) return (
      <div className='flex flex-col h-full justify-center items-center'>
        <button onClick={makePayment} disabled={false} className="mt-6 ml-auto mr-auto w-[200px] bg-transparent hover:bg-gray-900 text-white font-semibold py-2 px-4 border border-gray-700 rounded shadow disabled:bg-gray-900 disabled:cursor-not-allowed">
          Pay now!
        </button>
      </div>
    )
    else if (nftStatus == TransferStatus.WaitingForPayment) return (
      <div className='flex h-full justify-center items-center'>
        <div className='flex flex-col gap-4'>
          <button onClick={check} disabled={false} className="mt-6 ml-auto mr-auto w-[100px] h-[50px] bg-transparent hover:bg-gray-900 text-white font-semibold py-2 px-4 border border-gray-700 rounded shadow disabled:bg-gray-900 disabled:cursor-not-allowed">
            Check
          </button>

          {
            !paymentAddress ? (
              <a href={`http://localhost:3001/select_address/?origin=${encodeURIComponent(currentUrl)}`}>
                <button className="w-[150px] h-[40px] bg-gray-800/50 hover:bg-gray-900 text-white py-2 px-4 rounded shadow disabled:bg-gray-900 disabled:cursor-not-allowed">
                  Try Again.
                </button>
              </a>
            ) :
              <button onClick={makePayment} className="w-[150px] h-[50px] bg-gray-800/50 hover:bg-gray-900 text-white py-2 px-4 rounded shadow disabled:bg-gray-900 disabled:cursor-not-allowed">
                Try Again.
              </button>
          }
        </div>
      </div>
    )
    else if (nftStatus === TransferStatus.PaymentDone) return (
      <div className='flex flex-col h-full justify-center items-center'>
        <div className="w-full">
          <p className="flex w-full justify-between border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
            <span className="flex items-center text-ellipsis overflow-hidden">
              <FontAwesomeIcon
                className="mr-2"
                icon={faUser}
                style={{ fontSize: 14, color: "white" }}
              />
              {paymentAddress}
            </span>
          </p>
        </div>
        <button onClick={handleSend} disabled={false} className="mt-6 ml-auto mr-auto w-[100px] bg-transparent hover:bg-gray-900 text-white font-semibold py-2 px-4 border border-gray-700 rounded shadow disabled:bg-gray-900 disabled:cursor-not-allowed">
          Mint now!
        </button>
      </div>
    )
    else if (nftStatus === TransferStatus.NFTTransferred) return (
      <div className='flex flex-col justify-center items-center h-full'>
        It is all yours!
      </div>
    )
    else if (nftStatus === TransferStatus.TransferInProgress) return (
      <div className='flex flex-col justify-center items-center h-full'>
        Hold on will soon be yours.
      </div>
    )
  }

  return (
    <ModalWrapper
      isOpen={open}
      closeModal={closeModal}
      contentStyle="columns"
      className="h-2/3 w-3/4 md:max-h-[460px] md:max-w-[715px]"
    >
      <section className="relative h-full w-1/3 py-12 px-9 border-r border-[#1E1E24] hidden md:block">
        <h1 className="text-3xl text-white">Buy NFT now.</h1>
        <p className="font-display mt-4 text-white/80 text-sm font-medium">
          This is a mystery NFT, details will be revealed after minting.
        </p>
        <img className="absolute bottom-0 left-0 right-0" src="https://www.bleepstatic.com/content/hl-images/2022/05/13/binance-mystery-nft-box.jpg" />
      </section>
      <section className="h-full w-full md:w-2/3 p-8">
        <ModalContent />
      </section>
    </ModalWrapper>
  );
}
