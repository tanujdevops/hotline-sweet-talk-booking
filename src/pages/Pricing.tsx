
import React from "react";
import PricingCards from "@/components/PricingCards";
import Footer from "@/components/Footer";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Our <span className="text-hotline">Pricing</span> Plans</h1>
        <p className="text-xl text-center text-muted-foreground mb-12">
          Choose the perfect plan for your sweet talking needs
        </p>
      </div>
      <PricingCards />
      <Footer />
    </div>
  );
};

export default Pricing;
