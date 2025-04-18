
import React, { useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Loading from "@/components/Loading";

// Lazy-loaded components for better performance
const Hero = lazy(() => import("@/components/Hero"));
const PricingCards = lazy(() => import("@/components/PricingCards"));
const BookingForm = lazy(() => import("@/components/BookingForm"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Footer = lazy(() => import("@/components/Footer"));

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
        <meta name="keywords" content="hotline service, phone conversations, intimate talks, premium calls, discreet chat, sweet talk, confidential calls" />
        <link rel="canonical" href="https://sweetyoncall.com/" />
        
        {/* Open Graph Tags */}
        <meta property="og:url" content="https://sweetyoncall.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SweetyOnCall - Premium Hotline Services" />
        <meta property="og:description" content="Experience intimate conversations with professional talkers. Premium hotline services that leave you feeling valued, understood, and completely satisfied." />
        <meta property="og:image" content="https://sweetyoncall.com/opengraph-image.png" />
        
        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@sweetyoncall" />
        <meta name="twitter:title" content="SweetyOnCall - Premium Hotline Services" />
        <meta name="twitter:description" content="Experience intimate conversations with professional talkers. Premium hotline services that leave you feeling valued, understood, and completely satisfied." />
        <meta name="twitter:image" content="https://sweetyoncall.com/opengraph-image.png" />
      </Helmet>
      
      <main className="min-h-screen bg-background text-foreground" role="main" itemScope itemType="https://schema.org/WebPage">
        <Suspense fallback={<Loading />}>
          <header role="banner">
            <Hero />
          </header>
          
          <section id="pricing-section" aria-labelledby="pricing-heading">
            <PricingCards />
          </section>
          
          <section id="booking-section" aria-labelledby="booking-heading">
            <BookingForm />
          </section>
          
          <section id="testimonials-section" aria-labelledby="testimonials-heading">
            <Testimonials />
          </section>
          
          <section id="faq-section" aria-labelledby="faq-heading">
            <FAQ />
          </section>
          
          <footer role="contentinfo">
            <Footer />
          </footer>
        </Suspense>
      </main>
    </>
  );
};

export default Index;
