
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircleQuestion, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FAQ = () => {
  const faqs = [
    {
      question: "How does the booking process work?",
      answer: "Simply fill out our booking form with your preferred date and call type. After you complete your payment, you'll receive a confirmation with details for your scheduled call."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and select cryptocurrencies. All transactions are secure and encrypted for your privacy."
    },
    {
      question: "How do I know when my call will happen?",
      answer: "After booking, you'll receive a confirmation email with your scheduled date. We'll also send you a reminder 30 minutes before your call."
    },
    {
      question: "Is my personal information kept confidential?",
      answer: "Absolutely. We maintain strict confidentiality of all customer information. We never share, sell, or expose your personal details with anyone."
    },
    {
      question: "Can I request a specific talker?",
      answer: "Yes! In the special requests section of the booking form, you can specify preferences for your talker, including any particular qualities you're looking for."
    },
    {
      question: "What happens if I miss my scheduled call?",
      answer: "If you miss your scheduled call, we'll attempt to reach you twice. If we can't connect, you can reschedule for a small fee or receive a partial credit toward a future call."
    },
    {
      question: "Can I extend my call if I want more time?",
      answer: "Currently, call durations are fixed at either 2 or 4 minutes based on your package selection. To get more time, you'll need to book another session."
    },
    {
      question: "Is there a cancellation policy?",
      answer: "You can cancel or reschedule your call up to 2 hours before the scheduled time with no penalty. Cancellations within 2 hours of the call time may be subject to a fee."
    }
  ];

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
            Have questions about our service? Find answers to common inquiries below.
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
            Our support team is available 24/7 to assist you with any inquiries.
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

export default FAQ;
