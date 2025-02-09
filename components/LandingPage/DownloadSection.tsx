import React from "react";
import Image from "next/image";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const DownloadSection: React.FC = () => {
  return (
    <div className="container mx-auto py-12 text-center">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-6">
      Access Blolabel Anywhere
      </h2>
      <p className="text-lg font-normal mb-8">
      Use Blolabel directly from your browser—no downloads needed.
      </p>
      <div className="flex justify-center">
        <a href="/auth/signup">
        <Button
          
          variant="default"
          rel="noopener noreferrer"
          className="w-full md:w-auto md:mr-4 px-6 py-3 text-lg"
        >
          <Rocket className="mr-2" />
          Access Blolabel
        </Button>
        </a>
      </div>
  </div>
  );
};

export default DownloadSection;
