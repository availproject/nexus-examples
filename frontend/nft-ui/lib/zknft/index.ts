import { NFT, Menu, MenuType, Message, RpcProof, NexusInfo, TransferStatus } from './types';

import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import { AbiCoder, Contract, ethers, JsonRpcProvider, keccak256, TransactionReceipt, Wallet } from 'ethers';
import { Provider, types } from 'zksync-ethers';
import { nexusAppID, nexusRPCUrl, nftMintProviderURL, paymentContractAddress, privateKeyZkSync2, stateManagerNFTChainAddr, storageNFTChainAddress, paymentZKSyncProviderURL, privateKeyZkSync, nftContractAddress, nexusAppIDPayment, nftChainMailboxAddress, paymentChainMailboxAddress } from './config';
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

export async function ownerOf(tokenId: number): Promise<string> {
  const provider = new Provider(nftMintProviderURL);
  const nftContract = new Contract(nftContractAddress, nftContractAbi, provider);
  return await (nftContract as any).ownerOf(tokenId);
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
        //TODO: Change below to select from payment options.
        appId: nexusAppIDPayment,
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
  console.log("Next nonce", payerAddress);
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
  await tx.wait();
  // ata
  // : 
  // "0x000000000000000000000000b175236e0bdcaed34d1c29f4c22824070029a49a000000000000000000000000618263ce921f7dd5f4f40c29f6c524aaf97b9bbd00000000000000000000000000000000000000000000000000000000000000110000000000000000000000000000000000000000000000008ac7230489e800000000000000000000000000003126ea852fe05177b94e94009aebf72a83401b46"
  // from
  // : 
  // "0xB175236E0bdcaED34D1c29f4c22824070029a49A"
  // nexusAppIDFrom
  // : 
  // "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d"
  // nexusAppIDTo
  // : 
  // ['0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d']
  // nonce
  // : 
  // 11n
  // to
  // : 
  // ['0x618263CE921F7dd5F4f40C29f6c524Aaf97b9bbd']
  // [[Prototype]]
  // : 
  Object
  // Log expected message format for comparison
  const expectedMessage: Message = {
    nexusAppIDFrom: paymentDetails.nexusAppID,
    nexusAppIDTo: [paymentDetails.nexusAppID],
    from: payerAddress,
    to: [await signerNFT.getAddress()],
    nonce: nextNonce,
    data: ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256', 'uint256', 'address'],
      [payerAddress, await signerNFT.getAddress(), tokenId, ethers.parseEther("10"), paymentDetails.tokenAddress]
    )
  };
  console.log('Expected message format:', expectedMessage);

  const receipt: TransactionReceipt = await tx.wait();
  console.log('Expected message format:', expectedMessage);

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

    // Create ethers contract instance with signer
    const provider = getSellerWallet();
    const contract = new ethers.Contract(nftContractAddress, nftContractAbi, provider);

    console.log('Executing NFT transfer with formatted params:', {
      height: BigInt(nexus.response.account.height),
      message,
      encodedProof,
    });

    // Send transaction directly through ethers contract
    const tx = await (contract as any).transferNFT(
      BigInt(nexus.response.account.height),
      message,
      encodedProof,
      {
        chainId: 271
      }
    );

    console.log('Transaction hash:', tx.hash);

    // Wait for transaction receipt
    console.log('Waiting for transaction receipt...');
    const receipt = await tx.wait();

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
  receiptHash: string,
): Promise<RpcProof | undefined> {
  let paymentContract = new Contract(
    paymentContractAddress,
    paymentAbi,
    new Provider(paymentDetails.paymentProvider)
  );
  const mailboxContract = new Contract(paymentChainMailboxAddress, mailboxAbi.abi, new Provider(paymentZKSyncProviderURL));
  const mapping = await (mailboxContract as any).messages(receiptHash);
  console.log("✅  Mapping exists", mapping);
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

  const calculatedReceiptHash = keccak256(encodedReceipt);

  console.log("Calculated receipt hash", calculatedReceiptHash);
  console.log("Expected receipt hash", receiptHash);

  const storageSlot: bigint = await (paymentContract as any).getStorageLocationForReceipt(receiptHash);
  console.log("Storage slot", storageSlot, batchNumber);
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
