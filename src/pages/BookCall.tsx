
import React from "react";
import BookingForm from "@/components/BookingForm";
import Footer from "@/components/Footer";

const BookCall = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">Book Your <span className="text-hotline">Call</span> Now</h1>
        <p className="text-xl text-center text-muted-foreground mb-12">
          Schedule your personalized sweet talk experience
        </p>
      </div>
      <BookingForm />
      <Footer />
    </div>
  );
};

export default BookCall;
