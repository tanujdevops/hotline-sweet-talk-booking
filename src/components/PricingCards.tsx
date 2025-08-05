import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Check, Star, ShieldCheck, Sparkles, Zap } from "@/components/ui/icons";
import { PRICING_DETAILS, PRICING_TIERS } from "@/lib/pricing";

const PricingCard = memo(({ tier, isPopular = false }: { tier: string; isPopular?: boolean }) => {
  const details = PRICING_DETAILS[tier as keyof typeof PRICING_DETAILS];
  const scrollToBooking = () => {
    const element = document.getElementById('booking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getDuration = () => {
    switch (tier) {
      case PRICING_TIERS.FREE_TRIAL: return '30 sec';
      case PRICING_TIERS.ESSENTIAL: return '4 min';
      case PRICING_TIERS.DELUXE: return '7 min';
      default: return '';
    }
  };

  const getFeatures = () => {
    switch (tier) {
      case PRICING_TIERS.FREE_TRIAL:
        return [
          'Instant connection',
          'No card required',
          'Available instantly'
        ];
      case PRICING_TIERS.ESSENTIAL:
        return [
          'Instant connection',
          'Elite companions',
          `Just $${(details.price / 4).toFixed(2)}/minute`
        ];
      case PRICING_TIERS.DELUXE:
        return [
          'Instant connection',
          'Extended satisfaction',
          `$${(details.price / 7).toFixed(2)}/minute value`
        ];
      default:
        return ['Instant connection'];
    }
  };

  return (
    <Card className={`relative bg-card rounded-xl p-6 md:p-8 border transition-all duration-300 card-hover glass-effect ${
      isPopular 
        ? 'border-2 border-hotline md:scale-105 md:translate-y-[-1rem] z-10' 
        : 'border-border hover:border-hotline'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 right-4 bg-hotline-gradient text-white px-3 py-1 rounded-full text-xs md:text-sm font-medium shadow-lg">
          ⭐ Most Popular
        </div>
      )}
      
      <header className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold">{details.label}</h3>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {tier === PRICING_TIERS.FREE_TRIAL ? 'First taste of pleasure' :
             tier === PRICING_TIERS.ESSENTIAL ? 'Perfect passion' : 'Ultimate pleasure'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full text-sm">
          <Clock size={16} className="text-hotline" />
          {getDuration()}
        </div>
      </header>
      
      <div className="mb-6">
        <p className="text-3xl md:text-4xl font-bold mb-2">
          {tier === PRICING_TIERS.FREE_TRIAL ? 'FREE' : `$${details.price.toFixed(2)}`}
        </p>
        <p className="text-muted-foreground text-sm md:text-base">{details.description}</p>
      </div>
      
      <ul className="space-y-3 mb-6 md:mb-8">
        {getFeatures().map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm md:text-base">
            <Check size={18} className="text-hotline mt-1 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      
      <Button 
        onClick={scrollToBooking}
        className={`w-full py-4 md:py-6 rounded-md transition-all duration-300 min-h-[44px] text-sm md:text-base ${
          isPopular 
            ? 'bg-hotline hover:bg-hotline-dark text-white pulse-glow' 
            : 'bg-secondary hover:bg-hotline text-white'
        }`}>
        {tier === PRICING_TIERS.FREE_TRIAL ? 'Connect Now - Free' : 'Connect Instantly'}
      </Button>

      {isPopular && (
        <p className="mt-4 text-center text-xs md:text-sm text-muted-foreground">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          89% of callers choose this package
        </p>
      )}
    </Card>
  );
});

const PricingCards = () => {
  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-background to-black/90">
      <div className="container mx-auto">
        <header className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
            Choose Your Perfect <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Experience</span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Start with a risk-free trial, then select the package that matches your desires. All calls connect instantly - no waiting!
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          <PricingCard tier={PRICING_TIERS.FREE_TRIAL} />
          <PricingCard tier={PRICING_TIERS.ESSENTIAL} isPopular />
          <PricingCard tier={PRICING_TIERS.DELUXE} />
        </div>

        <footer className="mt-8 md:mt-12 flex justify-center items-center gap-4 md:gap-8 flex-wrap">
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <ShieldCheck size={18} className="text-hotline" />
            100% Private & Secure
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <Zap size={18} className="text-hotline" />
            Instant Connection
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
            <Sparkles size={18} className="text-hotline" />
            Elite Companions
          </div>
        </footer>
      </div>
    </section>
  );
};

export default memo(PricingCards);