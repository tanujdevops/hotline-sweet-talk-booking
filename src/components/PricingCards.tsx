
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Check, Star, Heart, ShieldCheck, Sparkles } from "lucide-react";

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
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Perfect <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Experience</span></h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Start with a risk-free trial, then select the package that matches your desires. Our most passionate callers prefer the 3-minute experience.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Trial */}
          <Card className="relative bg-card rounded-xl p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Free Trial</h3>
                <p className="text-muted-foreground mt-1">First taste of pleasure</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">30 sec</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$0</p>
              <p className="text-muted-foreground">no commitment needed</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Sample our elite service</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>No card required</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Available instantly</span>
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
                <p className="text-muted-foreground mt-1">Perfect passion</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">3 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$2.49</p>
              <p className="text-muted-foreground">best-selling experience</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Elite companions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Perfect duration</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Just $0.83/minute</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-hotline hover:bg-hotline-dark text-white py-6 rounded-md transition-all duration-300 min-h-[44px] pulse-glow">
              Choose Standard
            </Button>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                89% of callers choose this package
              </p>
            </div>
          </Card>

          {/* Extended Plan */}
          <Card className="relative bg-card rounded-xl p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold">Extended</h3>
                <p className="text-muted-foreground mt-1">Ultimate pleasure</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">7 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-4xl font-bold">$4.99</p>
              <p className="text-muted-foreground">premium value ($0.71/min)</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Extended satisfaction</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Best price per minute</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span>Premium experience</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-6 rounded-md transition-all duration-300 min-h-[44px]">
              Choose Extended
            </Button>
          </Card>
        </div>

        <div className="mt-12 flex justify-center items-center gap-8 flex-wrap">
          <div className="flex items-center gap-2 text-gray-300">
            <ShieldCheck size={20} className="text-hotline" />
            <span>100% Private & Secure</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Heart size={20} className="text-hotline" />
            <span>Satisfaction Guaranteed</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Sparkles size={20} className="text-hotline" />
            <span>Elite Companions</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCards;
