import { NextResponse } from 'next/server';
import { NexusClient, Networks, ProofManagerClient, ZKSyncVerifier } from 'nexus-js';
import {
  nexusAppID,
  nexusAppIDPayment,
  nftMintProviderURL,
  paymentZKSyncProviderURL,
  nftChainMailboxAddress,
  paymentChainMailboxAddress,
  stateManagerNFTChainAddr,
  privateKeyZkSync,
  privateKeyZkSync2,
  stateManagerPaymentChainAddr
} from '../../../lib/zknft/config';
import mailboxAbi from '../../../lib/zknft/mailbox.json';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('API Request:', body);

    const { action, params } = body;
    if (!action || !params) {
      return NextResponse.json(
        { error: 'Missing action or params' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'getAccountState': {
        console.log('Getting account state with params:', params);
        const { provider, appId } = params;

        if (!provider || !appId) {
          return NextResponse.json(
            { error: 'Missing provider or appId' },
            { status: 400 }
          );
        }

        try {
          const nexusClient = new NexusClient(provider, appId);
          const result = await nexusClient.getAccountState();
          console.log('Account state result:', result);
          return NextResponse.json(result);
        } catch (error) {
          console.error('Error getting account state:', error);
          return NextResponse.json(
            { error: 'Failed to get account state', details: error.message },
            { status: 500 }
          );
        }
      }

      case 'getStorageProof': {
        console.log('Getting storage proof with params:', params);
        const { batchNumber, message, storageKey } = params;

        if (!batchNumber || !message || !storageKey) {
          return NextResponse.json(
            { error: 'Missing required parameters for storage proof' },
            { status: 400 }
          );
        }

        try {
          console.log('Storage key:', storageKey);
          const zksyncAdapter = new ZKSyncVerifier({
            [nexusAppID]: {
              rpcUrl: nftMintProviderURL,
              mailboxContract: nftChainMailboxAddress,
              stateManagerContract: stateManagerNFTChainAddr,
              appID: nexusAppID,
              chainId: "270",
              type: Networks.ZKSync,
              privateKey: privateKeyZkSync
            },
            [nexusAppIDPayment]: {
              rpcUrl: paymentZKSyncProviderURL,
              mailboxContract: paymentChainMailboxAddress,
              stateManagerContract: stateManagerPaymentChainAddr,
              appID: nexusAppID,
              chainId: "271",
              type: Networks.ZKSync,
              privateKey: privateKeyZkSync2
            }
          }, {
            rpcUrl: nftMintProviderURL,
            mailboxContract: nftChainMailboxAddress,
            stateManagerContract: stateManagerNFTChainAddr,
            appID: nexusAppID,
            chainId: "272",
            type: Networks.ZKSync,
            privateKey: privateKeyZkSync,
          }, mailboxAbi.abi);


          const proof = await zksyncAdapter.getReceiveMessageProof(
            batchNumber,
            message,
            { storageKey }
          );
          return NextResponse.json(proof);
        } catch (error) {
          console.error('Error getting storage proof:', error);
          return NextResponse.json(
            { error: 'Failed to get storage proof', details: error.message },
            { status: 500 }
          );
        }
      }

      case 'encodeMessageProof': {
        console.log('Encoding message proof with params:', params);
        const { proof } = params;

        if (!proof) {
          return NextResponse.json(
            { error: 'Missing proof parameter' },
            { status: 400 }
          );
        }

        try {
          const zksyncAdapter = new ZKSyncVerifier({
            [nexusAppID]: {
              rpcUrl: nftMintProviderURL,
              mailboxContract: nftChainMailboxAddress,
              stateManagerContract: stateManagerNFTChainAddr,
              appID: nexusAppID,
              chainId: "272",
              type: Networks.ZKSync,
              privateKey: privateKeyZkSync
            },
            [nexusAppIDPayment]: {
              rpcUrl: paymentZKSyncProviderURL,
              mailboxContract: paymentChainMailboxAddress,
              stateManagerContract: stateManagerNFTChainAddr,
              appID: nexusAppIDPayment,
              chainId: "271",
              type: Networks.ZKSync,
              privateKey: privateKeyZkSync2
            }
          }, {
            rpcUrl: nftMintProviderURL,
            mailboxContract: nftChainMailboxAddress,
            stateManagerContract: stateManagerNFTChainAddr,
            appID: nexusAppID,
            chainId: "272",
            type: Networks.ZKSync,
            privateKey: privateKeyZkSync,
          }, mailboxAbi.abi);

          const encodedProof = zksyncAdapter.encodeMessageProof(proof);
          return NextResponse.json({ encodedProof });
        } catch (error) {
          console.error('Error encoding message proof:', error);
          return NextResponse.json(
            { error: 'Failed to encode message proof', details: error.message },
            { status: 500 }
          );
        }
      }

      case 'updateNexusState': {
        console.log('Updating nexus state with params:', params);
        const { nexusHeader, account } = params;

        if (!nexusHeader || !account) {
          return NextResponse.json(
            { error: 'Missing nexus header or account data' },
            { status: 400 }
          );
        }

        try {
          const proofManagerClient = new ProofManagerClient(
            stateManagerNFTChainAddr,
            nftMintProviderURL,
            privateKeyZkSync
          );

          await proofManagerClient.updateNexusBlock(
            nexusHeader.number,
            `0x${nexusHeader.state_root}`,
            `0x${nexusHeader.avail_header_hash}`,
            ""
          );

          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(account.proof);
          await proofManagerClient.updateChainState(
            nexusHeader.number,
            account.proof,
            nexusAppIDPayment,
            account.account
          );

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Error updating nexus state:', error);
          return NextResponse.json(
            { error: 'Failed to update nexus state', details: error.message },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
