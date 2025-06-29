import { useEffect, useState } from 'react';
import { useLocation, Navigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_DETAILS } from '@/lib/pricing';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PhoneCall, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const statusMessages = {
  pending: "Your booking has been received and is being processed.",
  pending_payment: "Please complete payment to continue with your booking.",
  queued: "Your call is in the queue and will be initiated soon.",
  initiating: "We're preparing to connect your call...",
  calling: "Your call is being connected...",
  completed: "Your call has been completed. Thank you for using our service!",
  cancelled: "This booking has been cancelled.",
  failed: "We encountered an issue with this booking. Please contact support.",
  payment_failed: "Payment failed. Please try again.",
};

export default function WaitingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Get booking ID from URL params first, then fallback to state
  const bookingId = searchParams.get('booking_id') || location.state?.bookingId;
  const planKey = location.state?.planKey;
  
  const [bookingStatus, setBookingStatus] = useState<string>("pending");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  const paymentSuccess = searchParams.get('success') === 'true';
  const paymentCanceled = searchParams.get('canceled') === 'true';

  // Redirect to home if no booking ID
  if (!bookingId) {
    return <Navigate to="/" replace />;
  }

  const planDetails = planKey ? PRICING_DETAILS[planKey as keyof typeof PRICING_DETAILS] : null;

  useEffect(() => {
    if (paymentSuccess) {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed. Your call will be initiated soon.",
        variant: "default",
      });
      setPaymentError(null);
      // Force immediate status check after successful payment
      setTimeout(() => {
        fetchBookingStatus();
      }, 1000);
    } else if (paymentCanceled) {
      toast({
        title: "Payment Canceled",
        description: "Your payment was not completed. You can try again.",
        variant: "destructive",
      });
      setPaymentError("Your payment was not completed. You can try again using the button below.");
    }
  }, [paymentSuccess, paymentCanceled, toast]);

  const fetchBookingStatus = async () => {
    try {
      // Fetching booking status
      const { data, error } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking status:', error);
        return;
      }

      if (data) {
        // Booking status updated
        setBookingStatus(data.status);
        setPaymentStatus(data.payment_status || 'pending');
        
        // If queued, check queue position
        if (data.status === 'queued') {
          checkQueuePosition();
        }
      }
    } catch (error) {
      console.error('Error in fetching booking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkQueuePosition = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-vapi-concurrency', {
        body: { bookingId }
      });

      if (error) {
        console.error('Error checking queue position:', error);
        return;
      }

      if (data && data.queuePosition) {
        setQueuePosition(data.queuePosition);
      }
    } catch (error) {
      console.error('Error checking queue position:', error);
    }
  };

  useEffect(() => {
    if (!bookingId) return;
    
    fetchBookingStatus();
    
    // Set up real-time subscription for booking status changes
    const channel = supabase
      .channel('booking_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload) => {
          console.log('Real-time booking update:', payload);
          const newBooking = payload.new as any;
          setBookingStatus(newBooking.status);
          setPaymentStatus(newBooking.payment_status || 'pending');
          
          if (newBooking.status === 'queued') {
            checkQueuePosition();
          }
        }
      )
      .subscribe();

    // Set up polling as fallback
    const interval = setInterval(() => {
      fetchBookingStatus();
    }, 5000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    try {
      // Initiating payment process
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { bookingId }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Payment Error",
          description: "We couldn't process your payment request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.checkout_url) {
        // Redirecting to payment checkout
        window.location.href = data.checkout_url;
      } else {
        console.error("No checkout URL returned");
        toast({
          title: "Payment Error", 
          description: "No checkout URL returned. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in payment process:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calling':
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'pending':
      case 'initiating':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'queued':
        return 'bg-blue-500/20 text-blue-500';
      case 'pending_payment':
        return 'bg-purple-500/20 text-purple-500';
      case 'cancelled':
      case 'failed':
      case 'payment_failed':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const shouldShowPaymentButton = bookingStatus === 'pending_payment' && paymentStatus !== 'completed';

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
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{bookingId.slice(0, 6)}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingId.slice(0, 6));
                      }}
                      aria-label="Copy Booking ID"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8M4 6h16M4 18h16" /></svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Copy Booking ID</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {planDetails && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Selected Plan</p>
                <p className="font-medium">{planDetails.label}</p>
              </div>
            )}
            
            <div className={`rounded-lg p-4 mt-6 ${getStatusColor(bookingStatus)}`}>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : bookingStatus === 'calling' ? (
                  <PhoneCall className="h-5 w-5 animate-pulse" />
                ) : bookingStatus === 'queued' ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-current" />
                )}
                <p className="text-sm font-medium">
                  Status: {bookingStatus?.charAt(0).toUpperCase() + bookingStatus?.slice(1).replace('_', ' ')}
                </p>
              </div>
              <p className="text-sm mt-2">
                {statusMessages[bookingStatus as keyof typeof statusMessages] || "Processing your booking..."}
              </p>
              {bookingStatus === 'queued' && queuePosition && (
                <p className="text-sm mt-1 font-medium">
                  Queue position: #{queuePosition}
                </p>
              )}
            </div>
            
            {shouldShowPaymentButton && (
              <div className="rounded-lg bg-secondary p-4 mt-6">
                <div className="flex items-start space-x-2">
                  <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment Required</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please complete the payment to confirm your booking.
                    </p>
                    <Button 
                      onClick={handlePayment} 
                      disabled={processingPayment}
                      className="w-full bg-hotline hover:bg-hotline-dark"
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {paymentStatus === 'completed' && (
              <div className="rounded-lg bg-green-500/10 border border-green-200 p-4 mt-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Payment Complete</p>
                    <p className="text-sm text-green-600">
                      Your payment has been processed successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {paymentError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-200 p-4 mt-2">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-700">Payment Error</p>
                    <p className="text-sm text-rose-600">
                      {paymentError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Return to Home Button */}
        <div className="flex justify-center mt-8">
          <Link to="/">
            <Button className="bg-hotline hover:bg-hotline-dark flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v6m0 0h4m-4 0a2 2 0 01-2-2v-4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2z" /></svg>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
