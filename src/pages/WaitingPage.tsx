
import { useEffect, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_DETAILS } from '@/lib/pricing';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PhoneCall } from 'lucide-react';

const statusMessages = {
  pending: "Your booking has been received and is being processed.",
  pending_payment: "Please complete payment to continue with your booking.",
  queued: "Your call is in the queue and will be initiated soon.",
  initiating: "We're preparing to connect your call...",
  calling: "Your call is being connected...",
  completed: "Your call has been completed. Thank you for using our service!",
  cancelled: "This booking has been cancelled.",
  failed: "We encountered an issue with this booking. Please contact support.",
};

export default function WaitingPage() {
  const location = useLocation();
  const { bookingId, planKey } = location.state || {};
  const [bookingStatus, setBookingStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  // Redirect if no booking data
  if (!bookingId) {
    return <Navigate to="/" replace />;
  }

  const planDetails = PRICING_DETAILS[planKey];

  useEffect(() => {
    const fetchBookingStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single();

        if (error) {
          console.error('Error fetching booking status:', error);
          return;
        }

        if (data) {
          setBookingStatus(data.status);
        }
      } catch (error) {
        console.error('Error in fetching booking status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch status immediately and then every 5 seconds
    fetchBookingStatus();
    const interval = setInterval(fetchBookingStatus, 5000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calling':
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'pending':
      case 'queued':
      case 'initiating':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'pending_payment':
        return 'bg-blue-500/20 text-blue-500';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Booking Confirmed!</CardTitle>
            <CardDescription>Your booking details are below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-mono font-medium">{bookingId}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selected Plan</p>
              <p className="font-medium">{planDetails.label}</p>
            </div>
            
            <div className={`rounded-lg p-4 mt-6 ${getStatusColor(bookingStatus)}`}>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  bookingStatus === 'calling' ? (
                    <PhoneCall className="h-5 w-5 animate-pulse" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-current" />
                  )
                )}
                <p className="text-sm font-medium">
                  Status: {bookingStatus?.charAt(0).toUpperCase() + bookingStatus?.slice(1)}
                </p>
              </div>
              <p className="text-sm mt-2">
                {statusMessages[bookingStatus as keyof typeof statusMessages] || "Processing your booking..."}
              </p>
            </div>
            
            {planDetails.price > 0 && bookingStatus === 'pending_payment' && (
              <div className="rounded-lg bg-secondary p-4 mt-6">
                <p className="text-sm font-medium">Payment Required</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Please complete the payment to confirm your booking.
                </p>
                <Button className="w-full bg-hotline hover:bg-hotline-dark">
                  Proceed to Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
