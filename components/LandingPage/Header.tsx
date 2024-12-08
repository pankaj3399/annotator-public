"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ModeToggle } from "./ThemeToggle";

import image from "@/public/static/image.png";

const Header = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const handleScroll = (id: string, offset: number = 100) => {
    const element = document.getElementById(id);
    if (element) {
      const position =
        element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: position, behavior: "smooth" });
    }
  };

  const renderLinks = () => (
    <>
      <Button
        className="text-base dark:text-[#ECECEC] p-0"
        variant="link"
        onClick={() => handleScroll("home")}
      >
        Home
      </Button>
      <Button
        className="text-base dark:text-[#ECECEC] p-0"
        variant="link"
        onClick={() => handleScroll("features")}
      >
        Features
      </Button>
      <Button
        className="text-base dark:text-[#ECECEC] p-0"
        variant="link"
        onClick={() => handleScroll("pricing")}
      >
        Pricing
      </Button>
      <Button
        className="text-base dark:text-[#ECECEC] p-0"
        variant="link"
        onClick={() => handleScroll("faq")}
      >
        FAQ
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <div className="w-full h-16 bg-white/20 dark:bg-header/20 backdrop-blur-lg top-0 fixed border-b-[1px] border-[#e5e7eb] dark:border-gray-700 z-[999]">
        <div className="container mx-auto flex justify-between items-center h-full">
          <Image
            src={image}
            alt="Logo"
            width={112}
            height={28}
            className="h-14 w-auto object-contain"
            priority
          />

          <div className="flex space-x-4">{renderLinks()}</div>
          <div className="flex space-x-4">
            <a href="/auth/login">
              <Button variant="default">Login</Button>
            </a>
            <a href="/auth/signup">
              <Button variant="default">Sign Up</Button>
            </a>
            <ModeToggle />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sheet>
      <div className="flex container py-3 gap-x-3 justify-between items-center fixed top-0 bg-transparent backdrop-blur-lg z-[998]">
        <Image
          src={image}
          alt="Logo"
          width={112}
          height={28}
          className="h-14 w-auto object-contain"
          priority
        />
    
        <div className="flex items-center gap-x-4">
          <ModeToggle />
          <SheetTrigger>
            <svg
              className="w-8 h-8 dark:text-white"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </SheetTrigger>
        </div>
      </div>
      <SheetContent
        side="top"
        className="dark:bg-header bg-white rounded-t-lg border-t-0 p-4 z-[998]"
      >
        <SheetHeader className="flex justify-between items-center">
          <Image
            src={image}
            alt="Logo"
            width={112}
            height={28}
            className="h-14 w-auto object-contain"
            priority
          />
          <SheetClose />
        </SheetHeader>
        <SheetDescription className="flex flex-col justify-center items-center mt-4 space-y-4">
          {renderLinks()}
        </SheetDescription>
        <SheetFooter className="flex flex-col gap-y-2 mt-6">
          <a href="/auth/login">
            <Button variant="default" className="w-full">
              Login
            </Button>
          </a>
          <a href="/auth/signup">
            <Button variant="default" className="w-full">
              Sign Up
            </Button>
          </a>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default Header;