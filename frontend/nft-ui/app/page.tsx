import { Carousel } from 'components/carousel';
import { ThreeItemGrid } from 'components/grid/three-items';
import Footer from 'components/layout/footer';
import { Suspense } from 'react';
import BuyNftModal from '../components/modals/BuyNftModal';
import { NFT } from 'lib/zknft/types';
import { getListedNFTs } from 'lib/zknft/listedNFTs';
import Loading from './loading';

async function MainContent() {
  const nfts: NFT[] = await getListedNFTs();
  
  return (
    <main className="mx-auto max-w-[1960px] p-4">
      <ThreeItemGrid featuredNFTs={nfts} />
      <Carousel products={nfts} />
      <Footer />
    </main>
  );
}

export default async function HomePage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const selectedBuy = searchParams.buyNFT?.toString() ?? null;
  const tokenID = searchParams.tokenID?.toString() ?? null;

  return (
    <div className="min-h-screen">
      <Suspense fallback={<Loading />}>
        <MainContent />
        {selectedBuy !== null && tokenID && (
          <BuyNftModal 
            open={true} 
            nftID={parseInt(tokenID)} 
          />
        )}
      </Suspense>
    </div>
  );
}
