import { useEffect, useState, useCallback } from 'react';
import { useLocation, Navigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_DETAILS } from '@/lib/pricing';
import { Loader2, PhoneCall, CreditCard, CheckCircle, AlertCircle, Clock, Copy, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Lazy load Supabase client only when needed
const getSupabase = async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

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

// iOS Safari detection
const isIOSSafari = () => {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const safari = /Safari/.test(ua) && !/Chrome/.test(ua);
  return iOS && webkit && safari;
};

export default function WaitingPage() {
  const location = useLocation();
  const { shortId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const paymentSuccess = searchParams.get('success') === 'true';
  const paymentCanceled = searchParams.get('canceled') === 'true';
  
  // Get booking ID - either from state (immediate navigation) or lookup by short ID
  const [bookingId, setBookingId] = useState<string | null>(location.state?.bookingId || null);
  const planKey = location.state?.planKey;
  
  const [bookingStatus, setBookingStatus] = useState<string>("pending");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isIOSDevice] = useState(() => isIOSSafari());
  
  // Bitcoin payment data
  const [bitcoinPayment, setBitcoinPayment] = useState<{
    bitcoin_address: string;
    bitcoin_amount: number;
    usd_amount: number;
    qr_code_data: string;
    payment_window_minutes: number;
  } | null>(null);
  const [paymentTimer, setPaymentTimer] = useState<number>(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [addressCopied, setAddressCopied] = useState(false);
  
  // Load Bitcoin payment data from sessionStorage
  useEffect(() => {
    const storedPayment = sessionStorage.getItem('blockonomics_payment');
    if (storedPayment) {
      try {
        const paymentData = JSON.parse(storedPayment);
        setBitcoinPayment(paymentData);
        
        // Generate QR code using a simple data URL approach
        // For a more robust solution, you might want to use a QR code library
        const qrSize = 200;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(paymentData.qr_code_data)}`;
        setQrCodeDataUrl(qrUrl);
        
        // Set up payment timer
        const windowMinutes = paymentData.payment_window_minutes || 20;
        setPaymentTimer(windowMinutes * 60); // Convert to seconds
        
        console.log("Loaded Bitcoin payment data:", paymentData);
      } catch (error) {
        console.error("Failed to parse Bitcoin payment data:", error);
      }
    }
  }, []);

  // Payment timer countdown
  useEffect(() => {
    if (paymentTimer > 0) {
      const interval = setInterval(() => {
        setPaymentTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [paymentTimer]);

  // Copy address to clipboard function
  const copyAddress = async () => {
    if (bitcoinPayment?.bitcoin_address) {
      try {
        await navigator.clipboard.writeText(bitcoinPayment.bitcoin_address);
        setAddressCopied(true);
        toast({
          title: "Address Copied",
          description: "Bitcoin address copied to clipboard",
          variant: "default",
        });
        setTimeout(() => setAddressCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy address:", error);
      }
    }
  };

  // Format timer display
  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Lookup full booking ID from short ID if needed
  const lookupBookingId = useCallback(async () => {
    if (!shortId || bookingId) return;
    
    try {
      setLoading(true);
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .ilike('id', `${shortId}%`)
        .limit(1)
        .single();
        
      if (error || !data) {
        console.error('Error looking up booking ID:', error);
        toast({
          title: "Booking Not Found",
          description: "The booking ID could not be found. Please check the link or contact support.",
          variant: "destructive",
        });
        return;
      }
      
      setBookingId(data.id);
    } catch (error) {
      console.error('Error in booking lookup:', error);
      toast({
        title: "Booking Lookup Failed",
        description: "Unable to find booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [shortId, bookingId, toast]);

  // Redirect to home if no short ID and no booking ID
  if (!shortId && !bookingId) {
    return <Navigate to="/" replace />;
  }

  const planDetails = planKey ? PRICING_DETAILS[planKey as keyof typeof PRICING_DETAILS] : null;

  // Run booking ID lookup on mount if needed
  useEffect(() => {
    lookupBookingId();
  }, [lookupBookingId]);

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

  const fetchBookingStatus = useCallback(async (force = false) => {
    try {
      // iOS Safari fix: Clear any stale state if forced refresh
      if (force && isIOSDevice) {
        setNeedsRefresh(false);
        setLoading(true);
      }

      // Fetching booking status
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking status:', error);
        // On iOS, if we get an error and it looks like a stale connection, suggest refresh
        if (isIOSDevice && error.message?.includes('network')) {
          setNeedsRefresh(true);
        }
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
        
        // Clear refresh flag on successful fetch
        setNeedsRefresh(false);
      }
    } catch (error) {
      console.error('Error in fetching booking status:', error);
      // iOS Safari often throws network errors on redirect, suggest refresh
      if (isIOSDevice) {
        setNeedsRefresh(true);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, isIOSDevice]);

  const checkQueuePosition = async () => {
    try {
      const supabase = await getSupabase();
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
    
    // iOS Safari specific handling
    if (isIOSDevice) {
      // Handle page visibility changes (iOS Safari suspends background tabs)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Page became visible, refresh data
          fetchBookingStatus(true);
        }
      };
      
      // Handle focus events (when user returns to tab)
      const handleFocus = () => {
        fetchBookingStatus(true);
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      // More aggressive polling for iOS
      const interval = setInterval(() => {
        if (!document.hidden) {
          fetchBookingStatus();
        }
      }, 3000);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      // Non-iOS: Use normal real-time subscription + polling
      let channel: any;
      
      const setupRealtime = async () => {
        const supabase = await getSupabase();
        channel = supabase
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
      };
      
      setupRealtime();

      const interval = setInterval(() => {
        fetchBookingStatus();
      }, 5000);
      
      return () => {
        clearInterval(interval);
        if (channel) {
          getSupabase().then(supabase => supabase.removeChannel(channel));
        }
      };
    }
  }, [bookingId, isIOSDevice, fetchBookingStatus]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    try {
      // Initiating payment process
      const supabase = await getSupabase();
      const { data, error } = await supabase.functions.invoke('create-paygate-invoice', {
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

      if (data && data.payment_url) {
        // iOS Safari specific handling for payment redirects
        if (isIOSDevice) {
          // Use location.assign instead of window.location.href for better iOS compatibility
          window.location.assign(data.payment_url);
        } else {
          window.location.href = data.payment_url;
        }
      } else {
        console.error("No payment URL returned");
        toast({
          title: "Payment Error", 
          description: "No payment URL returned. Please try again.",
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

  const handleManualRefresh = () => {
    setLoading(true);
    fetchBookingStatus(true);
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Booking ID:</span>
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
                      <Copy className="h-4 w-4" />
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
                {isIOSDevice && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleManualRefresh}
                    className="ml-auto"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
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
            
            {/* iOS Safari specific refresh prompt */}
            {needsRefresh && isIOSDevice && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-200 p-4 mt-4">
                <div className="flex items-start space-x-2">
                  <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">Refresh Needed</p>
                    <p className="text-sm text-blue-600 mb-3">
                      Please tap the refresh button to get the latest status update.
                    </p>
                    <Button 
                      onClick={handleManualRefresh}
                      size="sm"
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh Status
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {shouldShowPaymentButton && bitcoinPayment && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-200 p-4 mt-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start space-x-2">
                    <CreditCard className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bitcoin Payment Required</p>
                      <p className="text-sm text-muted-foreground">
                        Send exactly <strong>{bitcoinPayment.bitcoin_amount.toFixed(8)} BTC</strong> (${bitcoinPayment.usd_amount.toFixed(2)}) to complete your booking.
                      </p>
                    </div>
                  </div>
                  
                  {/* Payment Timer */}
                  {paymentTimer > 0 && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Payment window: {formatTimer(paymentTimer)}
                      </span>
                    </div>
                  )}
                  
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      {qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          alt="Bitcoin Payment QR Code"
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                          <QrCode className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bitcoin Address */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Bitcoin Address:</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-xs bg-white px-2 py-1 rounded border break-all">
                        {bitcoinPayment.bitcoin_address}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyAddress}
                        disabled={addressCopied}
                      >
                        {addressCopied ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Amount Details */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Amount (USD):</span>
                      <span>${bitcoinPayment.usd_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount (BTC):</span>
                      <span>{bitcoinPayment.bitcoin_amount.toFixed(8)} BTC</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    <strong>Important:</strong> Send the exact Bitcoin amount shown above. Your call will be initiated automatically once the payment is confirmed on the blockchain.
                  </div>
                </div>
              </div>
            )}
            
            {shouldShowPaymentButton && !bitcoinPayment && (
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
