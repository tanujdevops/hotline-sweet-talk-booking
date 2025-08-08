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
  
  // Load Bitcoin payment data and get real timer from API
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!bookingId) return;

      // First, try to load from sessionStorage for immediate display
      const storedPayment = sessionStorage.getItem('blockonomics_payment');
      if (storedPayment) {
        try {
          const paymentData = JSON.parse(storedPayment);
          setBitcoinPayment(paymentData);
          
          // Generate branded QR code
          const qrSize = 256;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(paymentData.qr_code_data)}&color=9b87f5&bgcolor=ffffff`;
          setQrCodeDataUrl(qrUrl);
          
          console.log("Loaded Bitcoin payment data from sessionStorage:", paymentData);
        } catch (error) {
          console.error("Failed to parse Bitcoin payment data:", error);
        }
      }

      // Get real timer status from API
      try {
        const supabase = await getSupabase();
        const { data: statusData, error: statusError } = await supabase.functions.invoke('get-blockonomics-status', {
          body: { bookingId }
        });

        if (statusError) {
          console.error('Error getting Blockonomics status:', statusError);
          return;
        }

        if (statusData?.success) {
          console.log("Blockonomics status:", statusData);
          
          // Set the real remaining time from server
          setPaymentTimer(statusData.remainingSeconds);
          
          // If no sessionStorage data but we have payment details, populate it
          if (!storedPayment && statusData.bitcoinAddress) {
            const paymentData = {
              bitcoin_address: statusData.bitcoinAddress,
              bitcoin_amount: statusData.bitcoinAmount,
              usd_amount: statusData.bitcoinAmount * statusData.bitcoin_price_usd || 0, // Approximate
              qr_code_data: `bitcoin:${statusData.bitcoinAddress}?amount=${statusData.bitcoinAmount}&label=SweetyOnCall%20Payment`,
              payment_window_minutes: statusData.paymentWindow
            };
            
            setBitcoinPayment(paymentData);
            
            // Generate QR code
            const qrSize = 256;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(paymentData.qr_code_data)}&color=9b87f5&bgcolor=ffffff`;
            setQrCodeDataUrl(qrUrl);
          }
          
          // Handle expired payments
          if (statusData.expired && statusData.remainingSeconds === 0) {
            toast({
              title: "Payment Window Expired",
              description: "This payment window has expired. Please create a new payment.",
              variant: "destructive",
            });
          }
          
          // Handle received payments
          if (statusData.paymentReceived) {
            setPaymentStatus('completed');
            toast({
              title: "Payment Received!",
              description: "Your Bitcoin payment has been detected. Waiting for confirmations...",
            });
          }
        }
      } catch (error) {
        console.error('Error fetching payment status:', error);
      }
    };

    loadPaymentData();
  }, [bookingId, toast]);

  // Payment timer countdown with periodic server sync
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

  // Periodically sync timer with server to handle clock drift
  useEffect(() => {
    if (!bookingId || !bitcoinPayment) return;

    const syncTimer = async () => {
      try {
        const supabase = await getSupabase();
        const { data: statusData, error: statusError } = await supabase.functions.invoke('get-blockonomics-status', {
          body: { bookingId }
        });

        if (statusError) {
          console.error('Error syncing timer:', statusError);
          return;
        }

        if (statusData?.success) {
          // Update timer if there's significant drift (>5 seconds)
          const currentTimer = paymentTimer;
          const serverTimer = statusData.remainingSeconds;
          const drift = Math.abs(currentTimer - serverTimer);
          
          if (drift > 5) {
            console.log(`Timer drift detected: ${drift}s, syncing to server time`);
            setPaymentTimer(serverTimer);
          }

          // Handle received payments
          if (statusData.paymentReceived && paymentStatus !== 'completed') {
            setPaymentStatus('completed');
            toast({
              title: "Payment Received!",
              description: "Your Bitcoin payment has been detected. Processing...",
            });
          }
        }
      } catch (error) {
        console.error('Error syncing timer:', error);
      }
    };

    // Sync every 30 seconds
    const syncInterval = setInterval(syncTimer, 30000);
    
    return () => clearInterval(syncInterval);
  }, [bookingId, bitcoinPayment, paymentTimer, paymentStatus, toast]);

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
        return 'bg-green-500/10 text-green-600 border-green-500/30 backdrop-blur-sm';
      case 'completed':
        return 'bg-hotline/10 text-hotline border-hotline/30 backdrop-blur-sm';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 backdrop-blur-sm';
      case 'initiating':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 backdrop-blur-sm';
      case 'queued':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30 backdrop-blur-sm';
      case 'pending_payment':
        return 'bg-hotline-pink/10 text-hotline-pink border-hotline-pink/30 backdrop-blur-sm';
      case 'cancelled':
      case 'failed':
      case 'payment_failed':
        return 'bg-destructive/10 text-destructive border-destructive/30 backdrop-blur-sm';
      default:
        return 'bg-secondary/10 text-muted-foreground border-border/30 backdrop-blur-sm';
    }
  };

  const shouldShowPaymentButton = bookingStatus === 'pending_payment' && paymentStatus !== 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/90 via-black/80 to-transparent py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradient overlay for brand consistency */}
      <div className="absolute inset-0 bg-gradient-to-br from-hotline/5 via-transparent to-hotline-pink/5 pointer-events-none" />
      
      <div className="max-w-md mx-auto relative z-10">
        <Card className="bg-black/30 backdrop-blur-sm border border-hotline/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">
              Booking Confirmed! ✨
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Your booking details are below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Booking ID:</span>
                <span className="font-mono font-medium">{bookingId?.slice(0, 6) || 'Loading...'}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (bookingId) {
                          navigator.clipboard.writeText(bookingId.slice(0, 6));
                        }
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
            
            <div className={`rounded-xl border-2 p-6 mt-6 shadow-2xl ${getStatusColor(bookingStatus)}`}>
              <div className="flex items-center gap-3">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-current" />
                ) : bookingStatus === 'calling' ? (
                  <PhoneCall className="h-6 w-6 animate-pulse text-current" />
                ) : bookingStatus === 'queued' ? (
                  <Clock className="h-6 w-6 text-current" />
                ) : bookingStatus === 'completed' ? (
                  <CheckCircle className="h-6 w-6 text-current" />
                ) : bookingStatus === 'pending_payment' ? (
                  <CreditCard className="h-6 w-6 text-current" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-current" />
                )}
                <div className="flex-1">
                  <p className="text-lg font-bold text-current">
                    {bookingStatus?.charAt(0).toUpperCase() + bookingStatus?.slice(1).replace('_', ' ')}
                  </p>
                  <p className="text-sm font-medium text-current opacity-80 mt-1">
                    {statusMessages[bookingStatus as keyof typeof statusMessages] || "Processing your booking..."}
                  </p>
                  {bookingStatus === 'queued' && queuePosition && (
                    <p className="text-sm font-bold text-current mt-2 bg-white bg-opacity-20 rounded-full px-3 py-1 inline-block">
                      Queue position: #{queuePosition}
                    </p>
                  )}
                </div>
                {isIOSDevice && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualRefresh}
                    className="bg-white bg-opacity-20 border-current text-current hover:bg-white hover:bg-opacity-30"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
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
              <div className="bg-gradient-to-br from-hotline/10 via-black/20 to-hotline-pink/10 border-2 border-hotline/30 rounded-xl p-6 mt-6 shadow-2xl backdrop-blur-sm">
                <div className="flex flex-col space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-hotline to-hotline-pink rounded-full flex items-center justify-center shadow-lg">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">
                        Bitcoin Payment Required
                      </h3>
                    </div>
                    
                    {/* Payment Timer - Prominent */}
                    {paymentTimer > 0 && (
                      <div className="bg-gradient-to-r from-hotline to-hotline-pink text-white px-4 py-2 rounded-full inline-flex items-center space-x-2 mb-4">
                        <Clock className="h-5 w-5" />
                        <span className="font-bold text-lg">
                          {formatTimer(paymentTimer)}
                        </span>
                        <span className="text-sm">remaining</span>
                      </div>
                    )}
                  </div>

                  {/* Amount Display - Large and Prominent */}
                  <div className="bg-secondary/30 rounded-xl p-6 border-2 border-hotline/10 shadow-inner">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wide">Send Exactly</p>
                      <p className="text-3xl font-black text-hotline-pink font-mono">
                        {bitcoinPayment.bitcoin_amount.toFixed(8)} BTC
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        ${bitcoinPayment.usd_amount.toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                  
                  {/* QR Code - Large and Centered */}
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-br from-white/95 to-gray-50/95 p-6 rounded-2xl shadow-2xl border-2 border-hotline/30 backdrop-blur-sm">
                      {qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          alt="SweetyOnCall Bitcoin Payment QR Code"
                          className="w-64 h-64 rounded-xl shadow-lg"
                        />
                      ) : (
                        <div className="w-64 h-64 bg-secondary/30 rounded-xl flex items-center justify-center">
                          <QrCode className="h-16 w-16 text-hotline animate-pulse" />
                        </div>
                      )}
                      <p className="text-center text-sm text-gray-700 mt-4 font-medium">
                        📱 Scan with your Bitcoin wallet
                      </p>
                    </div>
                  </div>
                  
                  {/* Bitcoin Address - Clean and Copyable */}
                  <div className="bg-gradient-to-r from-gray-900/95 to-black/95 rounded-xl p-4 border border-hotline/20 backdrop-blur-sm shadow-xl">
                    <p className="text-gray-200 text-sm font-medium mb-3 text-center">Bitcoin Address</p>
                    <div className="flex items-center space-x-3 bg-black/50 rounded-lg p-3 border border-hotline/10">
                      <code className="flex-1 text-white font-mono text-sm break-all bg-transparent">
                        {bitcoinPayment.bitcoin_address}
                      </code>
                      <Button
                        size="sm"
                        onClick={copyAddress}
                        disabled={addressCopied}
                        className={`
                          ${addressCopied 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-hotline hover:bg-hotline-dark text-white'
                          } transition-all duration-200 px-4 py-2
                        `}
                      >
                        {addressCopied ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Important Notice */}
                  <div className="bg-secondary/50 border-l-4 border-hotline p-4 rounded-r-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-hotline" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-muted-foreground">
                          <strong>Important:</strong> Send the exact Bitcoin amount shown above. Your call will be initiated automatically once the payment is confirmed on the blockchain (usually within 10-30 minutes).
                        </p>
                      </div>
                    </div>
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
              <div className="rounded-xl bg-hotline/10 border-2 border-hotline/30 p-6 mt-4 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-hotline" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-hotline-dark">Payment Complete ✨</p>
                    <p className="text-muted-foreground font-medium mt-1">
                      Your Bitcoin payment has been confirmed on the blockchain. Your call will be initiated shortly!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {paymentError && (
              <div className="rounded-xl bg-destructive/10 border-2 border-destructive/30 p-6 mt-4 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">Payment Issue</p>
                    <p className="text-muted-foreground font-medium mt-1">
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
            <Button className="bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90 text-white px-6 py-4 text-lg rounded-md flex items-center gap-3 transition-all duration-300 shadow-2xl backdrop-blur-sm border border-hotline/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v6m0 0h4m-4 0a2 2 0 01-2-2v-4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2z" /></svg>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
