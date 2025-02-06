import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FAQSection = () => {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32" id="faq">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-gray-100 mb-10">
          Frequently Asked Questions
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full max-w-4xl mx-auto space-y-4"
        >
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Do I have to pay to use the platform?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-400">
              No, Blolabel is completely free for experts. You’ll earn payments
              for your completed tasks, and we ensure a secure and transparent
              payout process.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg font-medium text-gray-900 dark:text-gray-100">
              How do I get paid, and what are the options?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-400">
              Payments are processed securely through methods like PayPal,
              Venmo, bank transfers, and more. You can set your preferred
              payment method in your account settings.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Can I change my subscription plan later?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-400">
              Yes, you can upgrade or downgrade your subscription anytime
              through your account settings. Changes will apply at the start of
              your next billing cycle.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Do you offer customer support for experts?
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 dark:text-gray-400">
            Yes, we provide 24/7 support for all experts via email and live chat. Whether it’s about task clarification or payment inquiries, we’re here to help.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
