'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import InteractiveMap from './Jobs';
import JobPostsGrid from './JobPostsGrid';
const Hero = () => {
  const [isMapVisible, setIsMapVisible] = useState(false);

  const toggleView = () => {
    setIsMapVisible(prevState => !prevState);
  };

  return (
    <div className="pt-8 container px-5 md:px-7" id="home">
      <div className="flex flex-col w-full justify-center items-center">
        {/* Conditionally render Map or Job Grid */}
        {isMapVisible ? (
          <InteractiveMap />
        ) : (
          <JobPostsGrid />
        )}

        {/* Show Map button that toggles view */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={toggleView}
            className="px-6 py-3 text-lg bg-blue-600 text-white rounded-lg shadow-lg"
            style={{ transition: "all 0.3s ease" }}
          >
            {isMapVisible ? "Show List" : "Show Map"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
