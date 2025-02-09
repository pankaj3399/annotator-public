'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { List, Map } from 'lucide-react';
import InteractiveMap from './Jobs';
import JobPostsGrid from './JobPostsGrid';

const Hero = () => {
  const [isGridVisible, setIsGridVisible] = useState(false);
  
  const toggleView = () => setIsGridVisible(prev => !prev);
  
  return (
    <div className="relative min-h-screen">
      {/* Main Content */}
      <div className="h-full">
        {isGridVisible ? (
          <JobPostsGrid />
        ) : (
          <InteractiveMap />
        )}
      </div>

      {/* Centered Toggle Button */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Button 
          onClick={toggleView}
          className="flex items-center gap-2 px-4 py-2 shadow-lg"
        >
          {isGridVisible ? (
            <>
              <Map className="w-4 h-4" />
              <span>Show Map</span>
            </>
          ) : (
            <>
              <List className="w-4 h-4" />
              <span>Show List</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Hero;