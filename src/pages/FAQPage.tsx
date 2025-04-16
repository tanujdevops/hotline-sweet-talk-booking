
import React from "react";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const FAQPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Frequently Asked <span className="text-hotline">Questions</span></h1>
        <p className="text-xl text-center text-muted-foreground mb-12">
          Find answers to common questions about our services
        </p>
      </div>
      <FAQ />
      <Footer />
    </div>
  );
};

export default FAQPage;
