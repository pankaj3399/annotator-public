import React from 'react'
import Hero from '@/components/LandingPage/Hero';
import DownloadSection from '@/components/LandingPage/DownloadSection';
import Brands from '@/components/LandingPage/Brands';
import Features from '@/components/LandingPage/Features';
import Pricing from '@/components/LandingPage/Pricing';
import Newsletter from '@/components/LandingPage/Newsletter';
import FAQSection from '@/components/LandingPage/FAQSection';
import IndexPage from '@/components/LandingPage/Blog';
import OurTeam from '@/components/LandingPage/OurTeam';
import "@/styles/landing.css";
import JobPostsGrid from '@/components/LandingPage/Jobs';
import Footer from '@/components/LandingPage/Footer';
const Landingpage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden">
      <div className="relative z-10 w-full">
        <Hero />
        {/* <DownloadSection /> */}
        {/* <Brands /> */}
        {/* <Features /> */}
        {/* <Pricing /> */}
        {/* <Newsletter /> */}
        {/* <IndexPage /> */}
        {/* <JobPostsGrid /> */}
        {/* <FAQSection /> */}
        {/* <OurTeam /> */}
        <Footer />
      </div>
    </div>
  );
}

export default Landingpage