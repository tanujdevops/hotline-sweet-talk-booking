
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Hero from "@/components/Hero";
import PricingCards from "@/components/PricingCards";
import BookingForm from "@/components/BookingForm";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    // Handle hash navigation
    const hash = location.hash;
    if (hash) {
      // Remove the # symbol
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Wait a bit for the page to fully render before scrolling
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  // Handle pathname-based navigation
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/pricing') {
      const element = document.getElementById('pricing');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else if (path === '/bookcall') {
      const element = document.getElementById('booking');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else if (path === '/faq') {
      const element = document.getElementById('faq');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>SweetyOnCall - Premium Hotline Services | Sweet Talk Booking</title>
        <meta name="description" content="Experience intimate conversations with professional talkers. Premium hotline services that leave you feeling valued, understood, and completely satisfied." />
        <meta name="keywords" content="hotline service, phone conversations, intimate talks, premium calls, discreet chat" />
      </Helmet>
      
      <main className="min-h-screen bg-background text-foreground">
        <Hero />
        <PricingCards />
        <BookingForm />
        <Testimonials />
        <FAQ />
        <Footer />
      </main>
    </>
  );
};

export default Index;
