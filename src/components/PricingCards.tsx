
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Check, Star } from "lucide-react";

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
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Experience</span></h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Start with a free trial, then select the perfect plan for your desired conversation length.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Trial */}
          <Card className="relative bg-card rounded-xl p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Free Trial</h3>
                <p className="text-muted-foreground mt-1">Try it risk-free</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">30 sec</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$0</p>
              <p className="text-muted-foreground">no credit card required</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Experience our service</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Professional talkers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>No commitment</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-6 rounded-md transition-all duration-300 min-h-[44px]">
              Start Free Trial
            </Button>
          </Card>

          {/* Standard Plan */}
          <Card className="relative bg-card rounded-xl p-8 border-2 border-hotline transition-all duration-300 card-hover glass-effect scale-105 md:translate-y-[-1rem]">
            <div className="absolute -top-4 right-4 bg-hotline-gradient text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
              <Star size={14} className="text-white" />
              Most Popular
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Standard</h3>
                <p className="text-muted-foreground mt-1">Perfect length</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">3 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$2.49</p>
              <p className="text-muted-foreground">per call</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Premium talkers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Most popular duration</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>$0.83/minute value</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-hotline hover:bg-hotline-dark text-white py-6 rounded-md transition-all duration-300 min-h-[44px] pulse-glow">
              Choose Standard
            </Button>
          </Card>

          {/* Extended Plan */}
          <Card className="relative bg-card rounded-xl p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Extended</h3>
                <p className="text-muted-foreground mt-1">Longer connection</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">7 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$4.99</p>
              <p className="text-muted-foreground">best value ($0.71/min)</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Extended conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Volume discount</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Best price per minute</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-6 rounded-md transition-all duration-300 min-h-[44px]">
              Choose Extended
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingCards;
