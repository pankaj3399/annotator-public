import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Image from "next/image";

import analytics from "@/public/static/analytics.png";
import token from "@/public/static/token.png";
import codecollab from "@/public/static/codecollab.png";
import hero from "@/public/static/hero.png";

const Features = () => {
  return (
    <>
      <div className="container py-10 text-center" id="features">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium">
          Seamless Collaboration, Smarter AI
        </h2>
        <p className="mt-5 mb-10 text-lg font-normal">
          Sign up today and start collaborating with{" "}
          <span className="font-medium text-[#348AC7]">Blolabel.</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mdlg:gap-8">
          <div>
            <Card className="text-start">
              <CardHeader>
                <CardDescription>
                  <Image
                    src={analytics}
                    alt="feature"
                    className="w-20 h-20 rounded-full inline-block"
                  />
                </CardDescription>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Track, analyze, and optimize your AI projects with real-time
                  data and expert-driven insights.
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="text-start">
              <CardHeader>
                <CardDescription>
                  <Image
                    src={token}
                    alt="feature"
                    className="w-20 h-20 rounded-full inline-block"
                  />
                </CardDescription>
                <CardTitle>Hassle-Free Payments for Experts</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Easily manage expert payouts with a secure and flexible
                  payment system tailored for smooth workflows.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card className="text-start">
              <CardHeader>
                <CardDescription>
                  <Image
                    src={codecollab}
                    alt="feature"
                    className="w-20 h-20 rounded-full inline-block"
                  />
                </CardDescription>
                <CardTitle>Seamless Chat for Real-Time Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-center">
                <p className="pb-10 md:pb-0 md:pr-10">
                  Streamline communication with built-in chat tools—making it
                  easier for experts and PMs to collaborate, clarify, and refine
                  during predictions.
                </p>
                <Image src={hero} alt="" className="w-full max-w-[400px]" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Features;
