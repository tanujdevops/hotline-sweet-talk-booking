
import React from 'react';
import { format } from 'date-fns';
import { Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BookingSuccessProps {
  bookingId: string;
  date?: Date;
  name: string;
  email: string;
}

const BookingSuccess = ({ bookingId, date, name, email }: BookingSuccessProps) => {
  return (
    <section id="booking-success" className="py-20 px-4 bg-gradient-to-b from-black/90 to-background">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-card p-8 rounded-xl border border-border shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-green-500/20 p-4 mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Booking Confirmed!</h2>
            <p className="text-lg text-gray-400 mb-8">
              We're excited to connect with you soon!
            </p>
            
            <div className="bg-secondary/30 p-6 rounded-lg w-full mb-8">
              <h3 className="text-xl font-semibold mb-4 text-hotline">Booking Details</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono font-bold">{bookingId}</span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{name}</span>
                </div>
                
                {date && (
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-muted-foreground">Date:</span>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-hotline" />
                      <span>{format(date, 'PPP')}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{email}</span>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-6">
              We've sent a confirmation email to <span className="font-semibold">{email}</span>. 
              Please keep a check on your email for further details and instructions.
            </p>
            
            <div className="w-full">
              <Link to="/">
                <Button 
                  className="bg-hotline hover:bg-hotline-dark w-full"
                >
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSuccess;
