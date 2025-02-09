'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import InteractiveMap from './Jobs';
import JobPostsGrid from './JobPostsGrid';
import { List, Map } from 'lucide-react';

const Hero = () => {
  const [isGridVisible, setIsGridVisible] = useState(false);

  const toggleView = () => setIsGridVisible(prev => !prev);

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 " id="home">
      <div className="relative flex flex-col w-full items-center">
        {/* Content Toggle */}
        <div className="w-full overflow-hidden rounded-xl">
          {isGridVisible ? <JobPostsGrid /> : <InteractiveMap />}
        </div>

        {/* Floating Toggle Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={toggleView}
            className="px-6 py-3 text-lg bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
          >
            {isGridVisible ? (
              <>
                Show Map <Map className="ml-2 h-5 w-5" />
              </>
            ) : (
              <>
                Show List <List className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
