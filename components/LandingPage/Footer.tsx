import Image from "next/image";
import { MountainIcon } from "lucide-react";
import image from "@/public/static/image.png";

const Footer = () => {
  return (
    <>
      <footer className="py-12">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4 md:px-6">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
            <Image 
              src={image} 
              alt="Logo" 
              width={112}
              height={28}
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 w-full md:w-auto">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-50">Company</h4>
              <nav className="flex flex-col space-y-1">
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  About
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Careers
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Blog
                </a>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-50">Products</h4>
              <nav className="flex flex-col space-y-1">
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Features
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Pricing
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Integrations
                </a>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-50">Resources</h4>
              <nav className="flex flex-col space-y-1">
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Documentation
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Support
                </a>
                <a
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                  href="#"
                >
                  Community
                </a>
              </nav>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-50">Contact</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">partnerships@blomega.com</div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;