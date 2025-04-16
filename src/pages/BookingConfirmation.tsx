
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import BookingSuccess from '@/components/BookingSuccess';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const BookingConfirmation = () => {
  const location = useLocation();
  const { bookingId, date, name, email } = location.state || {};

  if (!bookingId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <h1 className="text-3xl font-bold mb-6">Booking Not Found</h1>
        <p className="mb-8 text-muted-foreground">We couldn't find the booking information you're looking for.</p>
        <Link to="/">
          <Button className="bg-hotline hover:bg-hotline-dark flex items-center gap-2">
            <Home size={16} />
            Return Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BookingSuccess 
        bookingId={bookingId} 
        date={date ? new Date(date) : undefined} 
        name={name} 
        email={email} 
      />
    </div>
  );
};

export default BookingConfirmation;
