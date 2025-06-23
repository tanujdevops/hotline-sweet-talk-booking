
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Check, Star, Heart, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PRICING_DETAILS, PRICING_TIERS } from "@/lib/pricing";

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
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">Choose Your Perfect <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Experience</span></h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Start with a risk-free trial, then select the package that matches your desires. All calls connect instantly - no waiting!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {/* Free Trial */}
          <Card className="relative bg-card rounded-xl p-6 md:p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold">{PRICING_DETAILS[PRICING_TIERS.FREE_TRIAL].label}</h3>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">First taste of pleasure</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">30 sec</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-3xl md:text-4xl font-bold">FREE</p>
              <p className="text-muted-foreground text-sm md:text-base">{PRICING_DETAILS[PRICING_TIERS.FREE_TRIAL].description}</p>
            </div>
            
            <ul className="space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-2">
                <Zap size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Instant connection</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">No card required</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Available instantly</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-4 md:py-6 rounded-md transition-all duration-300 min-h-[44px] text-sm md:text-base">
              Connect Now - Free
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="relative bg-card rounded-xl p-6 md:p-8 border-2 border-hotline transition-all duration-300 card-hover glass-effect md:scale-105 md:translate-y-[-1rem] z-10">
            <div className="absolute -top-4 right-4 bg-hotline-gradient text-white px-3 py-1 rounded-full text-xs md:text-sm font-medium shadow-lg flex items-center gap-1 md:gap-2">
              <Star size={14} className="text-white" />
              Most Popular
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold">{PRICING_DETAILS[PRICING_TIERS.PREMIUM].label}</h3>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">Perfect passion</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">3 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-3xl md:text-4xl font-bold">${PRICING_DETAILS[PRICING_TIERS.PREMIUM].price.toFixed(2)}</p>
              <p className="text-muted-foreground text-sm md:text-base">{PRICING_DETAILS[PRICING_TIERS.PREMIUM].description}</p>
            </div>
            
            <ul className="space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-2">
                <Zap size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Instant connection</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Elite companions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Just ${(PRICING_DETAILS[PRICING_TIERS.PREMIUM].price / 3).toFixed(2)}/minute</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-hotline hover:bg-hotline-dark text-white py-4 md:py-6 rounded-md transition-all duration-300 min-h-[44px] pulse-glow text-sm md:text-base">
              Connect Instantly
            </Button>

            <div className="mt-4 text-center">
              <p className="text-xs md:text-sm text-muted-foreground">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                89% of callers choose this package
              </p>
            </div>
          </Card>

          {/* Unlimited Plan */}
          <Card className="relative bg-card rounded-xl p-6 md:p-8 border border-border hover:border-hotline transition-all duration-300 card-hover glass-effect">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold">{PRICING_DETAILS[PRICING_TIERS.UNLIMITED].label}</h3>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">Ultimate pleasure</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                <Clock size={16} className="text-hotline" />
                <span className="text-sm">7 min</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-3xl md:text-4xl font-bold">${PRICING_DETAILS[PRICING_TIERS.UNLIMITED].price.toFixed(2)}</p>
              <p className="text-muted-foreground text-sm md:text-base">{PRICING_DETAILS[PRICING_TIERS.UNLIMITED].description}</p>
            </div>
            
            <ul className="space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-2">
                <Zap size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Instant connection</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">Extended satisfaction</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
                <span className="text-sm md:text-base">${(PRICING_DETAILS[PRICING_TIERS.UNLIMITED].price / 7).toFixed(2)}/minute value</span>
              </li>
            </ul>
            
            <Button 
              onClick={scrollToBooking}
              className="w-full bg-secondary hover:bg-hotline text-white py-4 md:py-6 rounded-md transition-all duration-300 min-h-[44px] text-sm md:text-base">
              Connect Instantly
            </Button>
          </Card>
        </div>

        <div className="mt-8 md:mt-12 flex justify-center items-center gap-4 md:gap-8 flex-wrap">
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <ShieldCheck size={18} className="text-hotline" />
            <span>100% Private & Secure</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <Zap size={18} className="text-hotline" />
            <span>Instant Connection</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <Sparkles size={18} className="text-hotline" />
            <span>Elite Companions</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCards;
