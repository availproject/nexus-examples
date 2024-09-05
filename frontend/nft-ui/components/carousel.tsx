'use client';
import Link from 'next/link';
import { GridTileImage } from './grid/tile';
import { NFT } from 'lib/zknft/types';

export async function Carousel() {
  // Collections that start with `hidden-*` are hidden from the search page.
  const products: NFT[] = [
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
    {
      id: "0",
      owner: "abc",
      price: 400,
      metadata: {
        name: "NFT 3",
        url: "/img/nft-3.jpg",
        description: "mock NFT",
      },
      alt: "Photo by https://unsplash.com/@sonance"
    }
  ];

  if (!products?.length) return null;

  // Purposefully duplicating products to make the carousel loop and not run out of products on wide screens.
  const carouselProducts = [...products, ...products, ...products];

  return (
    <div className=" w-full overflow-x-auto pb-6 pt-1">
      <ul className="flex animate-carousel gap-4">
        {carouselProducts.map((product, i) => (
          <div
            key={`${product.metadata.name.toLowerCase()}${i}`}
            className="relative aspect-square h-[30vh] max-h-[275px] w-2/3 max-w-[475px] flex-none md:w-1/3"
          >
            <GridTileImage
              alt={product.metadata.name}
              label={{
                title: product.metadata.name,
                amount: product.price.toLocaleString(),
                currencyCode: "AVAIL"
              }}
              src={product.metadata.url}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            />
          </div>
        ))}
      </ul>
    </div>
  );
}
