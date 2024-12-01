import { CheckIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";

const defaultPlans = {
  monthly: [
    {
      title: "Basic",
      description: "Ideal for small teams or individual users with limited annotation needs",
      price: "$50",
      features: ["Core annotation tools ", "10,000 annotations", "Basic features"],
      highlighted: false,
    },
    {
      title: "Professional",
      description: "Perfect for growing teams requiring advanced features and higher annotation volumes",
      price: "$200",
      features: ["Enhanced collaboration tools", "Quality assurance features", "Priority support", "100,000 annotations", "Advanced features"],
      highlighted: true,
    },
    {
      title: "Enterprise",
      description: "Tailored for large organizations with extensive annotation requirements",
      price: "Contact us for pricing",
      features: ["All Professional features", "Dedicated account management", "Custom integrations", "Enterprise-grade security"], 
      highlighted: false,
    },
  ],
  yearly: [
    {
        title: "Basic",
        description: "Ideal for small teams or individual users with limited annotation needs",
        price: "$540",
        features: ["Core annotation tools ", "10,000 annotations", "Basic features"],
        highlighted: false,
      },
      {
        title: "Professional",
        description: "Perfect for growing teams requiring advanced features and higher annotation volumes",
        price: "$5400",
        features: ["Enhanced collaboration tools", "Quality assurance features", "Priority support", "100,000 annotations", "Advanced features"],
        highlighted: true,
      },
      {
        title: "Enterprise",
        description: "Tailored for large organizations with extensive annotation requirements",
        price: "Custom pricing",
        features: ["All Professional features", "Dedicated account management", "Custom integrations", "Enterprise-grade security"], 
        highlighted: false,
      },
  ],
};

const Pricing = () => {
  return (
    <div id="pricing">
      <h3
        className="text-3xl md:text-4xl lg:text-5xl font-medium text-center mt-10"
        id="pricing"
      >
        Pricing
      </h3>
      <p className="text-center mt-5 mb-10 text-lg font-normal">
        Flexible Pricing Plans to Suit Your Needs
      </p>

    {/* <h4 className="text-2xl text-center mt-5">
        Select from our affordable plans
    </h4> */}
    {/* <p className="text-center mt-2 mb-10 text-lg font-normal">
        Whether you're a small team or a large enterprise, we have a plan tailored for you.
    </p> */}
      <Tabs
        className="w-full max-w-4xl mx-auto my-10 mb-16 px-5"
        defaultValue="monthly"
      >
        <TabsList className="grid grid-cols-2 max-w-sm mx-auto">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {defaultPlans.monthly.map((plan, index) => (
              <Card
                key={index}
                className={`flex flex-col h-full ${
                  plan.highlighted ? "border-2 border-red-500" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-4xl font-bold">{plan.price}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      per month
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i}>
                        <CheckIcon className="w-4 h-4 mr-2 inline-block text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Get Started</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="yearly">
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {defaultPlans.yearly.map((plan, index) => (
              <Card
                key={index}
                className={`flex flex-col h-full ${
                  plan.highlighted ? "border-2 border-red-500" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-4xl font-bold">{plan.price}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      per year
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i}>
                        <CheckIcon className="w-4 h-4 mr-2 inline-block text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Get Started</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

    <p className="text-center text-sm text-gray-500 mt-5">
        *All plans come with a 14-day free trial.
    </p>
    <p className="text-center text-sm text-gray-500 mt-2">
        *All plans come with a 14-day free trial. Additional annotations are charged at $0.01 per annotation for Basic and $0.005 per annotation for Professional plans.
    </p>
    </div>
  );
};

export default Pricing;
