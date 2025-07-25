
import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { PhoneCall, ShieldCheck, Clock, Heart, Zap } from "@/components/ui/icons";
import { useIsMobile } from "@/hooks/use-mobile";
import OptimizedHeroImage from "./OptimizedHeroImage";

const Hero = () => {
  const isMobile = useIsMobile();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-16 overflow-hidden bg-gradient-to-b from-black/90 via-black/80 to-transparent">
      {/* Optimized background image with progressive loading */}
      <OptimizedHeroImage />
      <div className="container mx-auto relative z-10 flex justify-center">
        <div className={`max-w-xl md:max-w-3xl text-center ${!isMobile ? 'px-8' : ''}`}>
          <h1 className="hero-heading text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight text-white font-cormorant">
            Experience <span className="text-hotline-pink bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">AI-Enhanced Intimacy</span> for Deeper Connections
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto font-montserrat">
            Connect instantly with AI companions who understand your needs. They're available 24/7.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8 md:mb-12">
            {[
              { icon: ShieldCheck, text: '100% Private & Discreet' },
              { icon: Zap, text: 'Instant Connection' },
              { icon: Clock, text: 'Available 24/7' },
              { icon: Heart, text: 'Personalized Experience' }
            ].map(({ icon: Icon, text }, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full text-sm md:text-base text-gray-200">
                <Icon size={16} className="text-hotline" />
                {text}
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => scrollToSection('booking')}
              className="bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90 text-white px-6 py-5 text-base md:text-lg rounded-md flex items-center gap-2 transition-all duration-300 shadow-lg pulse-glow">
              <PhoneCall size={18} />
              Connect Instantly - Free Trial
            </Button>
            <Button 
              variant="outline"
              onClick={() => scrollToSection('pricing')}
              className="border-hotline-pink text-hotline-pink hover:bg-hotline-pink/10 px-6 py-5 text-base md:text-lg rounded-md transition-all duration-300">
              View Instant Call Packages
            </Button>
          </div>
          
          <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              AI companions online - connect now!
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-hotline animate-pulse" />
              Your call starts immediately!
            </div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => scrollToSection('pricing')} 
        aria-label="Scroll down"
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-hotline opacity-75 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-hotline rounded-full p-1 animate-bounce"
      >
        <svg className="w-8 h-8" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </button>
    </section>
  );
};

export default memo(Hero);
