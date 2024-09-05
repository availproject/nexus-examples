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
        url: "/img/nft-1.jpg",
        description: "mock NFT",
      },
      alt: "Photo by https://unsplash.com/@and_machines",
    },
    {
      id: "0",
      owner: "abc",
      price: 30,
      metadata: {
        name: "NFT 2",
        url: "/img/nft-2.jpg",
        description: "mock NFT",
      },
      alt: "Photo by https://unsplash.com/@hazelz"
    },
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
