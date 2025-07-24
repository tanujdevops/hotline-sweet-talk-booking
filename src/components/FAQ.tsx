
import React, { memo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircleQuestion, ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

import { faqData } from '@/data/faqData';

const FAQ = () => {
  const faqs = faqData;

  const scrollToBooking = () => {
    const element = document.getElementById('booking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="faq" className="py-20 px-4 bg-gradient-to-b from-black/90 to-background relative">
      <div className="absolute inset-0 bg-sensual-gradient opacity-30"></div>
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Frequently Asked <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Questions</span></h2>
          <p className="text-lg text-gray-300">
            Quick answers to common questions about our AI companion service.
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card border border-border rounded-lg px-6 overflow-hidden glass-effect"
            >
              <AccordionTrigger className="text-left py-4 font-medium hover:text-hotline transition-all">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-300 pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-12 p-6 rounded-xl border border-hotline/30 bg-black/30 backdrop-blur-sm text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageCircleQuestion size={24} className="text-hotline mr-2" />
            <h3 className="text-xl font-bold">Still have questions?</h3>
          </div>
          <p className="text-gray-300 mb-6">
            Our support team is available 24/7 to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:support@sweetyoncall.com" className="text-hotline hover:underline inline-flex items-center">
              Email Support <ArrowRight size={16} className="ml-1" />
            </a>
            <Button 
              onClick={scrollToBooking}
              className="bg-hotline hover:bg-hotline-dark text-white px-6 py-2 rounded-md transition-all duration-300">
              Book a Call Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(FAQ);
