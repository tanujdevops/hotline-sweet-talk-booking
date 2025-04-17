
import React from 'react';
import { Button } from "@/components/ui/button";
import { PhoneCall, ShieldCheck, Clock, Heart } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Hero = () => {
  const isMobile = useIsMobile();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/80 to-transparent opacity-90"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1542736667-7c405c485dd6')] bg-cover bg-center bg-fixed"></div>
      </div>
      
      <div className="container mx-auto relative z-10 flex justify-center">
        <div className={`max-w-xl md:max-w-3xl text-center animate-fade-in ${!isMobile ? 'px-8' : ''}`}>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight text-white font-cormorant">
            Discover <span className="text-hotline-pink bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Intimate Connections</span> That Transform Your Day
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto font-montserrat">
            Experience the thrill of genuine conversation with our professional talkers. Every moment is crafted to leave you feeling valued, understood, and completely satisfied.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 md:mb-12">
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full">
              <ShieldCheck size={16} className="text-hotline" />
              <span className="text-sm md:text-base text-gray-200">100% Confidential</span>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full">
              <Clock size={16} className="text-hotline" />
              <span className="text-sm md:text-base text-gray-200">24/7 Availability</span>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full">
              <Heart size={16} className="text-hotline" />
              <span className="text-sm md:text-base text-gray-200">Premium Experience</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => scrollToSection('booking')}
              className="bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90 text-white px-6 py-5 text-base md:text-lg rounded-md flex items-center gap-2 transition-all duration-300 shadow-lg pulse-glow">
              <PhoneCall size={18} />
              Speak With a Sweety Today
            </Button>
            <Button 
              variant="outline"
              onClick={() => scrollToSection('pricing')}
              className="border-hotline-pink text-hotline-pink hover:bg-hotline-pink/10 px-6 py-5 text-base md:text-lg rounded-md transition-all duration-300">
              View Our Packages
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-400 flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Only 3 slots left for tonight's conversations!</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 left-0 right-0 flex justify-center animate-bounce">
        <button 
          onClick={() => scrollToSection('pricing')} 
          aria-label="Scroll down"
          className="text-hotline opacity-75 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-hotline rounded-full p-1"
        >
          <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
      </div>
    </section>
  );
};

export default Hero;
