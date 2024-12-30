import { NFT, Menu, MenuType, Message, RpcProof, NexusInfo, TransferStatus } from './types';
import { hexToAddress } from "./utils";
import * as ed from '@noble/ed25519';
import { bytesToHex, hexToNumberString } from "web3-utils";
import { sha512 } from '@noble/hashes/sha512';
import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import nexusAbi from "./nexusStateManager.json";
import { AbiCoder, Contract, ethers, JsonRpcProvider, keccak256, TransactionReceipt, Wallet } from 'ethers';
import { Provider, types } from 'zksync-ethers';
import { nexusAppID, nexusRPCUrl, nftMintProviderURL, paymentContractAddress, privateKeyZkSync2, stateManagerNFTChainAddr, storageNFTChainAddress, paymentZKSyncProviderURL, privateKeyZkSync, nftContractAddress, nexusAppIDPayment, nftChainMailboxAddress, paymentChainMailboxAddress } from './config';
import { StorageProofProvider } from './storageManager';
import axios from 'axios';
import { getPaymentOptions, PaymentOption } from './paymentOptions';
import mailboxAbi from "./mailbox.json"

type NexusState = {
  stateRoot: string;
};
type AccountState = {
  statement: string;
  state_root: string;
  start_nexus_hash: string;
  last_proof_height: number;
  height: number;
};
export type AccountApiResponse = {
  info: NexusState;
  chainStateNumber: number;
  response: {
    account: AccountState;
    proof: string[];
    value_hash: string;
    nexus_header: {
      parent_hash: string;
      prev_state_root: string;
      state_root: string;
      avail_header_hash: string;
      number: number;
    };
    value_hash_hex: string;
  };
};

function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function getProvider(): Provider {
  let provider = new Provider(nftMintProviderURL);

  return provider;
}

export function getBuyerWallet(provider?: Provider): Wallet {
  return new Wallet(privateKeyZkSync2, provider)
}

export function getSellerWallet(): Wallet {
  return new Wallet(privateKeyZkSync, getProvider())
}

export async function getAccountState(selectedPaymentOption: PaymentOption) {
  console.log('Fetching account state...', selectedPaymentOption);
  const response = await fetch('/api/nexus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'getAccountState',
      params: {
        provider: nexusRPCUrl,
        appId: selectedPaymentOption.nexusAppID,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Failed to get account state:', data);
    throw new Error(data.error || 'Failed to get account state');
  }

  return data;
}

export async function lockNFT(paymentDetails: PaymentOption, tokenId: number, payerAddress: string): Promise<any> {
  let signerNFT: Wallet = getSellerWallet();
  let paymentContract = new Contract(paymentContractAddress, paymentAbi, new Provider(paymentDetails.paymentProvider));
  let nftContract = new Contract(nftContractAddress, nftContractAbi, signerNFT);
  console.log(" Locking NFT id", tokenId);
  const nextNonce = BigInt(await (paymentContract as any).getCurrentNonce(payerAddress)) + BigInt(1);

  const tx = await (nftContract as any).lockNFT(
    tokenId,
    //TODO: Change to configurable value
    ethers.parseEther("10"),
    nextNonce,
    paymentDetails.tokenAddress,
    await signerNFT.getAddress(),
    payerAddress,
    //TODO: Give option to recieve NFT on different address than payment
    payerAddress,
  );

  // Wait for the transaction to be mined
  const receipt: TransactionReceipt = await tx.wait();
}

export async function transferNFT(
  nexus: AccountApiResponse,
  proof: RpcProof,
  message: Message,
  writeContractAsync: any,
  publicClient: any,
): Promise<any | undefined> {
  try {
    // Update nexus state through API
    await fetch('/api/nexus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateNexusState',
        params: {
          nexusHeader: nexus.response.nexus_header,
          account: nexus.response,
        },
      }),
    });
    //http://localhost:3000/?buyNFT=true&tokenID=15&paymentDone=true&receiptHash=0x155c7a11676f98ad2925618047d7528e0ecc2193a10ec36d24919db7e6f82c38&paymentBlockNumber=653&paymentReceipt=%7B%22nexusAppIDFrom%22:%220x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d%22,%22nexusAppIDTo%22:%5B%220x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e%22%5D,%22data%22:%220x000000000000000000000000b175236e0bdcaed34d1c29f4c22824070029a49a000000000000000000000000618263ce921f7dd5f4f40c29f6c524aaf97b9bbd000000000000000000000000000000000000000000000000000000000000000f0000000000000000000000000000000000000000000000008ac7230489e800000000000000000000000000003126ea852fe05177b94e94009aebf72a83401b46%22,%22from%22:%220x118d10E9Cf00472EA7BF006838Ea554c64CccAA8%22,%22to%22:%5B%220x3126ea852Fe05177b94e94009aEbF72A83401b46%22%5D,%22nonce%22:%229%22%7D

    console.log('Transferring NFT with params:', {
      height: nexus.response.account.height,
      message,
      proof
    });

    // Get encoded proof from API
    console.log('Encoding proof...');
    const proofResponse = await fetch('/api/nexus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'encodeMessageProof',
        params: {
          proof,
        },
      }),
    });

    if (!proofResponse.ok) {
      throw new Error('Failed to encode proof');
    }

    const { encodedProof } = await proofResponse.json();

    // Execute contract call
    console.log('Executing NFT transfer with formatted params:', {
      height: BigInt(nexus.response.account.height),
      message,
      encodedProof,
    });

    const txHash = await writeContractAsync({
      address: nftContractAddress as `0x${string}`,
      abi: nftContractAbi,
      functionName: "transferNFT",
      args: [
        BigInt(nexus.response.account.height),
        message,
        encodedProof
      ],
      account: writeContractAsync.account,
      chainId: 272, // Set a reasonable gas limit
      gasLimit: 1000000
    });

    console.log('Transaction hash:', txHash);

    // Wait for transaction receipt
    console.log('Waiting for transaction receipt...');
    const receipt = await writeContractAsync.waitForTransactionReceipt({
      hash: txHash,
      chainId: 272,
    });

    console.log('NFT transfer complete:', receipt);
    return receipt;

  } catch (error) {
    console.error('Transfer NFT error:', error);
    throw error;
  }
}

export async function getStorageProof(
  batchNumber: number,
  message: Message,
  paymentDetails: PaymentOption,
): Promise<RpcProof | undefined> {
  let paymentContract = new Contract(
    paymentContractAddress,
    paymentAbi,
    new Provider(paymentDetails.paymentProvider)
  );

  const encodedReceipt = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(bytes32 nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address from, address[] to, uint256 nonce)"],
    [{
      nexusAppIDFrom: message.nexusAppIDFrom,
      nexusAppIDTo: message.nexusAppIDTo,
      data: message.data,
      from: message.from,
      to: message.to,
      nonce: message.nonce
    }]
  );

  const receiptHash = keccak256(encodedReceipt);
  const storageSlot: bigint = await (paymentContract as any).getStorageLocationForReceipt(receiptHash);
  console.log("Storage slot", storageSlot);
  const response = await fetch('/api/nexus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'getStorageProof',
      params: {
        batchNumber,
        message,
        storageKey: storageSlot.toString(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get storage proof');
  }

  return response.json();
}

export async function fetchUpdatesFromNexus(): Promise<NexusInfo | undefined> {
  try {
    let response = await axios.get(nexusRPCUrl + "/account-hex", {
      params: {
        app_account_id: nexusAppID,
      },
    });
    return {
      chainStateNumber: response.data.account.height,
      info: {
        stateRoot: "0x" + response.data.nexus_header.state_root,
        blockHash: "0x" + response.data.nexus_header.state_root, // fix
      },
      response: response.data,
    };
  } catch (e) {
    console.log("error", e);
    return undefined;
  }
}

export async function getMenu(type: MenuType): Promise<Menu[]> {
  if (type == MenuType.main) {
    return [
      {
        title: "Home",
        path: "/"
      },
      {
        title: "About",
        path: "/about"
      }
    ]
  } else {
    return [
      {
        title: "Home",
        path: "/"
      },
      {
        title: "About",
        path: "/about"
      }
    ];
  }
}

export function getPaymentChainProvider(): Provider {
  let provider = new Provider(paymentZKSyncProviderURL);
  return provider;
}
