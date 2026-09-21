import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { HomeHero } from '@/components/landing/home-hero';
import {
  HomeAnonymity,
  HomeCategories,
  HomeCta,
  HomeFaq,
  HomeFeatures,
  HomeFolders,
  HomeStats,
} from '@/components/landing/home-sections';

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HomeHero />
        <HomeStats />
        <HomeCategories />
        <HomeFeatures />
        <HomeAnonymity />
        <HomeFolders />
        <HomeFaq />
        <HomeCta />
      </main>
      <SiteFooter />
    </div>
  );
}
