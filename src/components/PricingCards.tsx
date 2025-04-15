
import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";

const PricingCards = () => {
  const scrollToBooking = () => {
    const element = document.getElementById('booking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-background to-black/90">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your <span className="text-hotline">Experience</span></h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Select the perfect package that suits your desires. Quality conversation at affordable rates.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-card rounded-xl p-8 border border-border hover:border-hotline transition-all duration-300 card-hover">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Quick Tease</h3>
                <p className="text-muted-foreground mt-1">Perfect for a quick chat</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">2 minutes</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$2</p>
              <p className="text-muted-foreground">per call</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Professional sweet talkers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Private, discreet conversation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Available 24/7</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-6 rounded-md transition-all duration-300">
              Book Now
            </Button>
          </div>
          
          {/* Premium Plan */}
          <div className="bg-card rounded-xl p-8 border-2 border-hotline relative card-hover glow">
            <div className="absolute -top-4 right-4 bg-hotline-gradient text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Extended Pleasure</h3>
                <p className="text-muted-foreground mt-1">For deeper connections</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">4 minutes</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$3</p>
              <p className="text-muted-foreground">per call</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Premium sweet talkers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Longer, more satisfying conversation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Personalized experience</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Priority connection</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-hotline hover:bg-hotline-dark text-white py-6 rounded-md transition-all duration-300">
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCards;
