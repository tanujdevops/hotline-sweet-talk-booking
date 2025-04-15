
import React from "react";
import Hero from "@/components/Hero";
import PricingCards from "@/components/PricingCards";
import BookingForm from "@/components/BookingForm";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <PricingCards />
      <BookingForm />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
