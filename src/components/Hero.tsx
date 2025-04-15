
import React from 'react';
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";

const Hero = () => {
  const scrollToBooking = () => {
    const element = document.getElementById('booking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent opacity-70"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1542736667-7c405c485dd6')] bg-cover bg-center"></div>
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-xl md:max-w-2xl animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight text-white">
            Your <span className="text-hotline">Sweet Talk</span> is Just a Call Away
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-200">
            Connect with our professional talkers for intimate conversations that will leave you wanting more. Affordable rates with premium experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={scrollToBooking}
              className="bg-hotline hover:bg-hotline-dark text-white px-8 py-6 text-lg rounded-md flex items-center gap-2 transition-all duration-300">
              <PhoneCall size={18} />
              Book a Call Now
            </Button>
            <Button 
              variant="outline"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-hotline text-hotline hover:bg-hotline/10 px-8 py-6 text-lg rounded-md transition-all duration-300">
              View Pricing
            </Button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center">
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
};

export default Hero;
