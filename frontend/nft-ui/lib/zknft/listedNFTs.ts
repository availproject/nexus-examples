import { Contract } from 'ethers';
import { Provider } from 'zksync-ethers';
import { nftContractAddress, nftMintProviderURL } from './config';
import nftContractAbi from './nft.json';
import { getSellerWallet } from './index';
import { NFT } from './types';

export interface ListedNFT {
  tokenId: number;
  owner: string;
}

export async function getListedNFTs(): Promise<NFT[]> {
  console.log('\n\nFetching listed NFTs...', nftMintProviderURL);
  const provider = new Provider(nftMintProviderURL);
  const sellerWallet = getSellerWallet();
  const nftContract = new Contract(nftContractAddress, nftContractAbi, provider);
  const listedNFTs: NFT[] = [];
  const sellerAddress = await sellerWallet.getAddress();

  try {
    // Query NFTs from 1 to 20
    for (let tokenId = 2; tokenId <= 20; tokenId++) {
      try {
        console.log('Querying NFT ID: ', tokenId, nftMintProviderURL, nftContractAddress);
        const owner = await (nftContract as any).ownerOf(tokenId);
        // Check if the owner is the seller
        if (owner === sellerAddress) {
          listedNFTs.push({
            id: tokenId,
            owner: owner,
            price: 10,
            metadata: {
              name: `NFT ${tokenId}`,
              url: `/img/nft-${(tokenId % 3) + 1}.jpg`,
              description: `NFT ${tokenId} from collection`,
            },
            alt: `NFT ${tokenId} Image`,
          });

          // Break if we've found 10 NFTs
          if (listedNFTs.length === 10) {
            break;
          }
        }
      } catch (error: any) {
        console.log('Error while querying NFT ID: ', tokenId, nftContractAddress);
        // Skip if token doesn't exist (ownerOf reverts)
        if (error?.message?.includes('execution reverted')) {
          continue;
        }
        throw error; // Re-throw if it's a different error
      }
    }

    return listedNFTs;
  } catch (error) {
    console.error('Error fetching listed NFTs:', error);
    return [];
  }
}