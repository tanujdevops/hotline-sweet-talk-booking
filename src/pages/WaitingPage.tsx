
import { useEffect, useState } from 'react';
import { useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_DETAILS } from '@/lib/pricing';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PhoneCall, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Check URL parameters first, then location state
  const bookingId = searchParams.get('booking_id') || (location.state?.bookingId);
  const planKey = location.state?.planKey;
  
  const [bookingStatus, setBookingStatus] = useState<string>("pending");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Check URL for success or canceled payment
  const paymentSuccess = searchParams.get('success') === 'true';
  const paymentCanceled = searchParams.get('canceled') === 'true';

  // Redirect if no booking data
  if (!bookingId) {
    return <Navigate to="/" replace />;
  }

  const planDetails = planKey ? PRICING_DETAILS[planKey as keyof typeof PRICING_DETAILS] : null;

  useEffect(() => {
    // Show toast messages for payment results
    if (paymentSuccess) {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed. Your call will be initiated soon.",
        variant: "default",
      });
      
      // Check payment status immediately when success=true is in URL
      checkPaymentStatus();
    } else if (paymentCanceled) {
      toast({
        title: "Payment Canceled",
        description: "Your payment was not completed. You can try again.",
        variant: "destructive",
      });
    }
  }, [paymentSuccess, paymentCanceled, toast]);

  // Function to check payment status from Stripe
  const checkPaymentStatus = async () => {
    try {
      console.log("Checking payment status for booking:", bookingId);
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { bookingId }
      });

      if (error) {
        console.error('Error checking payment status:', error);
        return;
      }

      console.log("Payment status check response:", data);
      
      if (data && data.status === 'completed') {
        setPaymentStatus('completed');
        // Refresh booking status to see updated status
        fetchBookingStatus();
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Function to fetch booking status
  const fetchBookingStatus = async () => {
    try {
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
        console.log("Booking status:", data);
        setBookingStatus(data.status);
        setPaymentStatus(data.payment_status || 'pending');
        
        // If payment is completed but status is still pending_payment, check payment status
        if (data.status === 'pending_payment' && data.payment_status !== 'completed') {
          checkPaymentStatus();
        }
      }
    } catch (error) {
      console.error('Error in fetching booking status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch status immediately and then every 5 seconds
    fetchBookingStatus();
    const interval = setInterval(fetchBookingStatus, 5000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    try {
      console.log("Initiating payment for booking:", bookingId);
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
        console.log("Redirecting to Stripe checkout:", data.checkout_url);
        // Redirect to Stripe Checkout
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
            
            {bookingStatus === 'pending_payment' && (
              <div className="rounded-lg bg-secondary p-4 mt-6">
                <div className="flex items-start space-x-2">
                  {paymentStatus === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {paymentStatus === 'completed' 
                        ? 'Payment Complete' 
                        : 'Payment Required'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {paymentStatus === 'completed'
                        ? 'Your payment has been processed. Your call will be initiated soon.'
                        : 'Please complete the payment to confirm your booking.'}
                    </p>
                    
                    {paymentStatus !== 'completed' && (
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
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {paymentCanceled && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-200 p-4 mt-2">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-700">Payment Canceled</p>
                    <p className="text-sm text-rose-600">
                      Your payment was not completed. You can try again using the button above.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
