import React, { useEffect, Suspense, memo } from "react";
import { useLocation } from "react-router-dom";
import SEO from "@/components/SEO";
import JsonLd from "@/components/JsonLd";
import AiCopyHint from "@/components/AiCopyHint";
import { faqData } from "@/data/faqData";
import {
  LazySection,
  OptimizedHero,
  OptimizedPricingCards,
  OptimizedBookingForm,
  OptimizedTestimonials,
  OptimizedFAQ,
  OptimizedFooter
} from "@/components/PerformanceOptimizer";

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

  // FAQ data for structured data
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // HowTo structured data
  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Book a Call with SweetyOnCall",
    "description": "A step-by-step guide to booking your intimate conversation with SweetyOnCall.",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Choose Your Package",
        "text": "Select either the Free Trial (30 seconds), Essential (3 minutes), or Deluxe (7 minutes) package based on your preferences.",
        "url": "https://sweetyoncall.com/#pricing"
      },
      {
        "@type": "HowToStep",
        "name": "Fill Out Booking Form",
        "text": "Complete the booking form with your contact information and preferred date and time for your call.",
        "url": "https://sweetyoncall.com/#booking"
      },
      {
        "@type": "HowToStep",
        "name": "Add Special Requests",
        "text": "Specify any preferences you have for your talker or the conversation topic.",
        "url": "https://sweetyoncall.com/#booking"
      },
      {
        "@type": "HowToStep",
        "name": "Complete Payment",
        "text": "Process your secure payment using one of our supported payment methods.",
        "url": "https://sweetyoncall.com/#booking"
      },
      {
        "@type": "HowToStep",
        "name": "Receive Confirmation",
        "text": "Check your email for booking confirmation and details about your scheduled call.",
        "url": "https://sweetyoncall.com/booking-confirmation"
      }
    ]
  };

  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SweetyOnCall",
    "url": "https://sweetyoncall.com",
    "logo": "https://sweetyoncall.com/logo.png",
    "description": "Premium hotline service offering intimate conversations with professional talkers. 100% confidential and private.",
    "email": "support@sweetyoncall.com",
    "foundingDate": "2022-01-01",
    "slogan": "Connect with a Sweety, anytime, anywhere",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": "support@sweetyoncall.com",
        "contactType": "customer service",
        "availableLanguage": ["English"],
        "hoursAvailable": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      }
    ],
    "sameAs": [
      "https://facebook.com/sweetyoncall",
      "https://twitter.com/sweetyoncall",
      "https://instagram.com/sweetyoncall"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "10000"
    }
  };

  // Individual review data now includes required aggregateRating
  const reviewsData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "SweetyOnCall",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "8"
    },
    "review": [
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Alex K."
        },
        "reviewBody": "The quality of conversation was amazing. Such attention to detail and genuine interest in what I had to say. Will definitely call again!"
      },
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Jamie T."
        },
        "reviewBody": "I was nervous at first, but the talker made me feel so comfortable. Those 4 minutes felt like a genuine connection. Worth every penny."
      }
    ]
  };

  // BreadcrumbList structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://sweetyoncall.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Pricing",
        "item": "https://sweetyoncall.com/#pricing"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Book a Call",
        "item": "https://sweetyoncall.com/#booking"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "FAQ",
        "item": "https://sweetyoncall.com/#faq"
      },
      {
        "@type": "ListItem",
        "position": 5,
        "name": "Booking Confirmation",
        "item": "https://sweetyoncall.com/booking-confirmation"
      }
    ]
  };

  // Combine FAQs for GEO
  const faqsForAi = [
    {
      question: "How does SweetyOnCall's booking process work?",
      answer: "Simply fill out our booking form with your preferred date and call type. After you complete your payment, you'll receive a confirmation with details for your scheduled call."
    },
    {
      question: "What payment methods does SweetyOnCall accept?",
      answer: "We accept all major credit cards, PayPal, and select cryptocurrencies. All transactions are secure and encrypted for your privacy."
    },
    {
      question: "Are my conversations with SweetyOnCall confidential?",
      answer: "Absolutely. We maintain strict confidentiality of all customer information. We never share, sell, or expose your personal details or conversation content with anyone."
    },
    {
      question: "Can I choose a specific talker at SweetyOnCall?",
      answer: "Yes! In the special requests section of the booking form, you can specify preferences for your talker, including any particular qualities you're looking for."
    },
    {
      question: "How long do SweetyOnCall conversations last?",
      answer: "We offer two package options: Quick Tease (2 minutes) and Extended Pleasure (4 minutes). Choose the one that best fits your needs and schedule."
    }
  ];

  // AI prompt questions for GEO
  const promptQuestions = [
    "How do I book a call with SweetyOnCall?",
    "What are SweetyOnCall's pricing options?",
    "Is SweetyOnCall confidential?",
    "How do I pay for SweetyOnCall services?",
    "What happens if I miss my SweetyOnCall appointment?",
    "Can I request a specific talker on SweetyOnCall?",
    "What makes SweetyOnCall different from other hotline services?"
  ];

  return (
    <>
      {/* SEO Component */}
      <SEO 
        title="SweetyOnCall - Premium Hotline Services | Sweet Talk Booking"
        description="Experience intimate conversations with AI companions. Premium hotline services offering personalized, confidential conversations."
        keywords="hotline service, phone conversations, intimate talks, premium calls, discreet chat, sweet talk, confidential calls"
        canonical="https://sweetyoncall.com/"
        ogType="website"
        ogImage="https://sweetyoncall.com/opengraph-image.png"
        twitterCard="summary_large_image"
      />
      
      {/* Structured Data with JsonLd components - Each in a separate script tag to avoid duplication */}
      <JsonLd data={faqStructuredData} />
      <JsonLd data={howToData} />
      <JsonLd data={organizationData} />
      <JsonLd data={reviewsData} />
      <JsonLd data={breadcrumbData} />
      
      {/* GEO optimization with AiCopyHint */}
      <AiCopyHint
        description="SweetyOnCall provides intimate phone conversations with AI companions who are trained to make you feel valued and understood. Our service is 100% confidential and available 24/7, with packages starting at just $2.49 for a 3-minute call."
        keywords="phone conversations, intimate talks, premium calls, sweet talk service, confidential chat, professional talkers"
        entityType="business_service"
        entityProperties={{
          industry: 'entertainment',
          offering: 'phone conversations',
          target_audience: 'adults seeking connection',
          features: {
            confidentiality: 'guaranteed',
            availability: '24/7',
            pricing: 'affordable',
            experience: 'personalized'
          }
        }}
        promptQuestions={promptQuestions}
        faqs={faqsForAi}
      />
      
      <main className="min-h-screen bg-background text-foreground" role="main" itemScope itemType="https://schema.org/WebPage">
        
        
        <header role="banner">
          <LazySection>
            <OptimizedHero />
          </LazySection>
        </header>
        
        <section id="pricing" aria-labelledby="pricing-heading">
          <div className="sr-only">
            <h2 id="pricing-heading">Our Pricing Options</h2>
          </div>
          <LazySection>
            <OptimizedPricingCards />
          </LazySection>
        </section>
        
        <section id="booking" aria-labelledby="booking-heading">
          <div className="sr-only">
            <h2 id="booking-heading">Book Your Call</h2>
          </div>
          <LazySection>
            <OptimizedBookingForm />
          </LazySection>
        </section>
        
        <section id="testimonials" aria-labelledby="testimonials-heading">
          <div className="sr-only">
            <h2 id="testimonials-heading">Client Testimonials</h2>
          </div>
          <LazySection>
            <OptimizedTestimonials />
          </LazySection>
        </section>
        
        <section id="faq" aria-labelledby="faq-heading">
          <div className="sr-only">
            <h2 id="faq-heading">Frequently Asked Questions</h2>
          </div>
          <LazySection>
            <OptimizedFAQ />
          </LazySection>
        </section>
        
        <footer role="contentinfo">
          <LazySection>
            <OptimizedFooter />
          </LazySection>
        </footer>
      </main>
    </>
  );
};

export default Index;
