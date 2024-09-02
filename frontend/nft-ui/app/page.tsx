import { Carousel } from 'components/carousel';
import { ThreeItemGrid } from 'components/grid/three-items';
import Footer from 'components/layout/footer';
import { Suspense, useRef, useState } from 'react';
import BuyNftModal from '../components/modals/BuyNftModal';
import { headers } from 'next/headers';
import { NFT } from 'lib/zknft/types';

export default async function HomePage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const nfts: NFT[] = [
    {
      id: "0",
      owner: "abc",
      price: 10,
      metadata: {
        name: "NFT 1",
        url: "https://storage.googleapis.com/nftimagebucket/tokens/0x60e4d786628fea6478f785a6d7e704777c86a7c6/preview/5933.png",
        description: "mock NFT",
      }
    },
    {
      id: "0",
      owner: "abc",
      price: 30,
      metadata: {
        name: "NFT 2",
        url: "https://storage.googleapis.com/nftimagebucket/tokens/0x60e4d786628fea6478f785a6d7e704777c86a7c6/preview/5933.png",
        description: "mock NFT",
      }
    }
  ];

  const selectedBuy = searchParams.buyNFT?.toString() ?? null;

  return (
    <>
      <ThreeItemGrid featuredNFTs={nfts} />
      <Suspense>
        <Carousel />
        <Suspense>
          <Footer />
        </Suspense>
      </Suspense>
      {selectedBuy !== null && <BuyNftModal open={selectedBuy !== null} />}
    </>
  );
}
