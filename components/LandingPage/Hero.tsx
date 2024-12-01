"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

import png1 from "@/public/static/1.png";
import png2 from "@/public/static/2.png";
import png3 from "@/public/static/3.png";

const Hero = () => {
  return (
    <div className="pt-32 container px-5 md:px-7" id="home">
      <div className="flex flex-col w-full justify-center items-center">
        <div className="mb-4 text-center text-base bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md shadow-md">
          Trusted by top domain experts and AI pioneers worldwide.
        </div>

        <h1 className="sm:text-5xl md:text-5xl lg:text-6xl text-4xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#7474BF] to-[#348AC7] pb-6 w-full leading-tight">
        Blolabel: Bridging Domain Experts and AI Innovators
        </h1>
        <p className="text-base text-center md:text-lg lg:text-xl xl:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl">
        Collaborate to teach AI smarter, faster, and better. Empower domain experts and AI professionals to drive innovation together.
        </p>
        <div className="button-group my-8 flex flex-col gap-y-4 md:gap-y-0 md:flex-row w-full justify-center items-center">
            <a href="/auth/signup">
            <Button
              variant="default"
              className="w-full md:w-auto md:mr-4 px-6 py-3 text-lg"
            >
              {/* link to features */}
              Explore Features 
            </Button>
            </a>
          <a href="/auth/login">
            <Button
              variant="outline"
              className="w-full md:w-auto md:mr-4 px-6 py-3 text-lg"
            >
              {/* link it */}
              Join the Platform
            </Button>
          </a>
        </div>
        <p className="text-xs md:text-sm text-center text-gray-500 dark:text-gray-400">
          * No upfront payment required
        </p>

        <Carousel
          plugins={[
            Autoplay({
              delay: 6000,
            }),
          ]}
          opts={{
            loop: true,
            align: "center",
          }}
          className="mb-10 mt-8 max-w-[1074px] w-full"
        >
          <CarouselContent className="m-0">
            <CarouselItem className="p-0 flex justify-center">
              <Image
                className="rounded-md w-full max-w-[1074px]"
                src={png1}
                alt="Carousel Image 1"
                width={1074}
                height={608}
                priority
              />
            </CarouselItem>
            <CarouselItem className="p-0 flex justify-center">
              <Image
                className="rounded-md w-full max-w-[1074px]"
                src={png2}
                alt="Carousel Image 2"
                width={1074}
                height={608}
              />
            </CarouselItem>
            <CarouselItem className="p-0 flex justify-center">
              <Image
                className="rounded-md w-full max-w-[1074px]"
                src={png3}
                alt="Carousel Image 3"
                width={1074}
                height={608}
              />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};

export default Hero;