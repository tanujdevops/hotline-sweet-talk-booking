import { useEffect, useState, useCallback } from 'react';
import { useLocation, Navigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_DETAILS } from '@/lib/pricing';
import { Loader2, PhoneCall, CreditCard, CheckCircle, AlertCircle, Clock, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import OptimizedHeroImage from "@/components/OptimizedHeroImage";

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
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isIOSDevice] = useState(() => isIOSSafari());
  
  // Bitcoin payment data
  const [bitcoinPayment, setBitcoinPayment] = useState<{
    bitcoin_address: string;
    bitcoin_amount: number;
    usd_amount: number;
    payment_window_minutes: number;
  } | null>(null);
  const [paymentTimer, setPaymentTimer] = useState<number>(0);
  const [addressCopied, setAddressCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          handleManualRefresh();
          break;
        case ' ':
          e.preventDefault();
          if (bitcoinPayment) {
            const walletString = `${bitcoinPayment.bitcoin_amount.toFixed(8)} BTC to ${bitcoinPayment.bitcoin_address}`;
            navigator.clipboard.writeText(walletString);
            toast({
              title: "Quick Copy Complete",
              description: "Payment details ready for your wallet",
            });
          }
          break;
        case 'a':
          e.preventDefault();
          if (bitcoinPayment) {
            copyAmount();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [bitcoinPayment, toast]);
  
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
              payment_window_minutes: statusData.paymentWindow
            };
            
            setBitcoinPayment(paymentData);
          }
          
          // Handle expired payments
          if (statusData.expired && statusData.remainingSeconds === 0) {
            // Clear Bitcoin payment data since it's expired
            setBitcoinPayment(null);
            sessionStorage.removeItem('blockonomics_payment');
            
            toast({
              title: "Payment Window Expired ⏰",
              description: "This payment window has expired. The booking has been cancelled.",
              variant: "destructive",
            });
            
            // Update booking status to reflect expiry
            setBookingStatus('payment_failed');
            setPaymentStatus('expired');
          }
          
          // Handle received payments with progressive status updates
          if (statusData.paymentReceived && paymentStatus !== 'completed') {
            setPaymentStatus('completed');
            
            // Show appropriate message based on payment progress
            const progress = statusData.paymentProgressStatus;
            if (progress) {
              toast({
                title: progress.message,
                description: progress.description,
                variant: progress.phase === 'confirmed' ? "default" : "default",
              });
            } else {
              toast({
                title: "Payment Received!",
                description: "Your Bitcoin payment has been detected. Processing...",
              });
            }
          }

          // Handle payment processing status (unconfirmed transactions)
          if (statusData.paymentProgressStatus?.phase === 'confirming' && paymentStatus === 'pending') {
            setPaymentStatus('processing');
            toast({
              title: statusData.paymentProgressStatus.message,
              description: statusData.paymentProgressStatus.description,
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
          // Show warning at 3 minutes remaining (only once)
          if (prev === 180 && bitcoinPayment) {
            toast({
              title: "Payment Window Closing Soon ⚠️",
              description: "Only 3 minutes remaining to complete your Bitcoin payment!",
              variant: "destructive",
            });
          }
          
          // Show final warning at 1 minute remaining
          if (prev === 60 && bitcoinPayment) {
            toast({
              title: "Final Warning ⏰",
              description: "Only 1 minute left! Complete payment now or booking will be cancelled.",
              variant: "destructive",
            });
          }
          
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [paymentTimer, bitcoinPayment, toast]);

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

          // Handle auto-expired payments from server
          if (statusData.currentPaymentStatus === 'expired' && paymentStatus !== 'expired') {
            setBitcoinPayment(null);
            sessionStorage.removeItem('blockonomics_payment');
            setBookingStatus('payment_failed');
            setPaymentStatus('expired');
            
            toast({
              title: "Payment Expired",
              description: "The payment window has closed and the booking has been cancelled.",
              variant: "destructive",
            });
          }

          // Also handle server status updates properly  
          if (statusData.currentPaymentStatus === 'expired') {
            setPaymentStatus('expired');
          }
        }
      } catch (error) {
        console.error('Error syncing timer:', error);
      }
    };

    // Faster sync during payment pending (10s vs 30s for better UX)
    const syncInterval = setInterval(syncTimer, 
      bitcoinPayment && (paymentStatus === 'pending' || paymentStatus === 'processing') ? 10000 : 30000
    );
    
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

  // Copy Bitcoin amount to clipboard function
  const copyAmount = async () => {
    if (bitcoinPayment?.bitcoin_amount) {
      try {
        const btcAmount = bitcoinPayment.bitcoin_amount.toFixed(8);
        await navigator.clipboard.writeText(btcAmount);
        setAmountCopied(true);
        toast({
          title: "Amount Copied",
          description: `${btcAmount} BTC copied to clipboard`,
          variant: "default",
        });
        setTimeout(() => setAmountCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy amount:", error);
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

  const shouldShowPaymentButton = bookingStatus === 'pending_payment' && paymentStatus !== 'completed' && paymentStatus !== 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/90 via-black/80 to-transparent relative overflow-hidden">
      {/* Hero-style optimized background */}
      <OptimizedHeroImage className="hero-bg opacity-20" />
      
      {/* Futuristic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-hotline/5 via-transparent to-hotline-pink/5 pointer-events-none" />
      
      <div className="container mx-auto relative z-10 flex justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="bg-black/30 backdrop-blur-lg border border-hotline/20 rounded-2xl shadow-2xl overflow-hidden">
            {/* Futuristic header with pulse glow effect */}
            <div className="pulse-glow bg-gradient-to-r from-hotline to-hotline-pink p-0.5 rounded-t-2xl">
              <div className="bg-black/80 backdrop-blur-sm rounded-t-2xl px-4 sm:px-6 py-6 sm:py-8 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4 text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text">
                  Booking Confirmed! ✨
                </h1>
                <p className="text-base sm:text-lg text-gray-200 font-medium">
                  Your AI connection details below
                </p>
              </div>
            </div>
            
            {/* Main content area */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Minimalist booking details */}
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-hotline/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Booking ID</p>
                      <p className="font-mono font-bold text-white text-sm sm:text-base">{bookingId?.slice(0, 6) || 'Loading...'}</p>
                    </div>
                    {planDetails && (
                      <div className="sm:border-l border-hotline/30 sm:pl-4">
                        <p className="text-xs sm:text-sm text-gray-400">Plan</p>
                        <p className="font-medium text-white text-sm sm:text-base">{planDetails.label}</p>
                      </div>
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (bookingId) {
                            navigator.clipboard.writeText(bookingId.slice(0, 6));
                          }
                        }}
                        className="text-hotline hover:text-hotline-pink hover:bg-hotline/10"
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
            
              {/* Modern status display with glassmorphism */}
              <div className={`relative rounded-2xl border-2 p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-lg ${getStatusColor(bookingStatus)} hover:scale-[1.02] transition-all duration-300`}>
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Animated status icon */}
                  <div className="relative">
                    {loading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-current" />
                    ) : bookingStatus === 'calling' ? (
                      <div className="relative">
                        <PhoneCall className="h-8 w-8 animate-pulse text-current" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      </div>
                    ) : bookingStatus === 'queued' ? (
                      <div className="relative">
                        <Clock className="h-8 w-8 text-current animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
                      </div>
                    ) : bookingStatus === 'completed' ? (
                      <CheckCircle className="h-8 w-8 text-current animate-pulse" />
                    ) : bookingStatus === 'pending_payment' ? (
                      <div className="relative">
                        <CreditCard className="h-8 w-8 text-current animate-bounce" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-hotline-pink rounded-full animate-ping" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-current animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-gradient-to-r from-current to-current/80 bg-clip-text mb-2">
                      {bookingStatus?.charAt(0).toUpperCase() + bookingStatus?.slice(1).replace('_', ' ')}
                    </h2>
                    <p className="text-sm sm:text-base font-medium text-current/90 mb-3">
                      {statusMessages[bookingStatus as keyof typeof statusMessages] || "Processing your booking..."}
                    </p>
                    
                    {bookingStatus === 'queued' && queuePosition && (
                      <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2">
                        <span className="text-xs sm:text-sm font-bold text-current">Queue position:</span>
                        <span className="text-base sm:text-lg font-black text-current">#{queuePosition}</span>
                      </div>
                    )}
                  </div>
                  
                  {isIOSDevice && (
                    <Button
                      size="sm"
                      onClick={handleManualRefresh}
                      className="bg-white/10 border-current/30 text-current hover:bg-white/20 backdrop-blur-sm pulse-glow"
                      disabled={loading}
                    >
                      <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
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
            
            {shouldShowPaymentButton && bitcoinPayment && paymentStatus !== 'expired' && (
              <div className="relative overflow-hidden rounded-2xl">
                {/* Futuristic payment container with animated border */}
                <div className="pulse-glow bg-gradient-to-r from-hotline to-hotline-pink p-0.5 rounded-2xl">
                  <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-hotline/20">
                    {/* Header with floating elements */}
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-6">
                        <div className="relative">
                          <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-r from-hotline to-hotline-pink rounded-full flex items-center justify-center shadow-2xl pulse-glow">
                            <CreditCard className="w-5 sm:w-7 h-5 sm:h-7 text-white animate-pulse" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 sm:w-4 h-3 sm:h-4 bg-hotline-pink rounded-full animate-ping" />
                        </div>
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text mb-1">
                            Bitcoin Payment Required
                          </h3>
                          <p className="text-gray-300 text-xs sm:text-sm">Send payment to activate your AI connection</p>
                        </div>
                      </div>
                      
                      {/* Futuristic countdown timer */}
                      {paymentTimer > 0 && (
                        <div className="relative inline-block">
                          <div className="bg-gradient-to-r from-hotline to-hotline-pink text-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-2xl flex items-center space-x-2 sm:space-x-4 pulse-glow shadow-2xl">
                            <Clock className="h-5 sm:h-6 w-5 sm:w-6 animate-spin" />
                            <div className="text-center">
                              <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider">
                                {formatTimer(paymentTimer)}
                              </div>
                              <div className="text-xs opacity-80 tracking-wide">TIME REMAINING</div>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-hotline to-hotline-pink rounded-2xl blur-lg opacity-30 -z-10" />
                        </div>
                      )}
                    </div>

                    {/* Holographic Bitcoin amount card */}
                    <div className="relative mb-6 sm:mb-8">
                      <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 border border-hotline/40 hover:border-hotline/60 transition-all duration-300">
                        <div className="text-center space-y-4 sm:space-y-6">
                          <div className="flex items-center justify-center space-x-2 mb-4">
                            <div className="w-2 h-2 bg-hotline-pink rounded-full animate-pulse" />
                            <p className="text-xs sm:text-sm text-gray-300 uppercase tracking-widest font-bold">SEND EXACTLY</p>
                            <div className="w-2 h-2 bg-hotline rounded-full animate-pulse" />
                          </div>
                          
                          {/* Main Bitcoin amount with futuristic styling */}
                          <div className="relative group">
                            <div className="text-center">
                              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text font-mono mb-2">
                                {bitcoinPayment.bitcoin_amount.toFixed(8)}
                              </div>
                              <div className="text-xl sm:text-2xl font-bold text-transparent bg-gradient-to-r from-hotline-pink to-hotline bg-clip-text">
                                BTC
                              </div>
                            </div>
                            
                            {/* Copy button with glow effect */}
                            <div className="flex justify-center mt-4 sm:mt-6">
                              <Button
                                onClick={copyAmount}
                                disabled={amountCopied}
                                className={`
                                  ${amountCopied 
                                    ? 'bg-green-600 hover:bg-green-700 border-green-600' 
                                    : 'bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90'
                                  } text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-xl shadow-2xl pulse-glow transition-all duration-300 min-w-[140px] sm:min-w-[160px]
                                `}
                              >
                                {amountCopied ? (
                                  <>
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-5 w-5 mr-2" />
                                    Copy Amount
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-hotline/20">
                            <p className="text-2xl font-bold text-gray-200">
                              ${bitcoinPayment.usd_amount.toFixed(2)} <span className="text-gray-400 text-lg">USD</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-hotline/20 to-hotline-pink/20 rounded-2xl blur-xl opacity-50 -z-10" />
                    </div>
                  
                    {/* Futuristic Bitcoin address card */}
                    <div className="relative">
                      <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-8 border border-hotline/40 hover:border-hotline/60 transition-all duration-300">
                        <div className="text-center mb-6">
                          <div className="flex items-center justify-center space-x-2 mb-4">
                            <div className="w-2 h-2 bg-hotline rounded-full animate-pulse" />
                            <p className="text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-lg font-bold uppercase tracking-widest">
                              Bitcoin Address
                            </p>
                            <div className="w-2 h-2 bg-hotline-pink rounded-full animate-pulse" />
                          </div>
                          <p className="text-gray-300 text-sm">Your unique payment destination</p>
                        </div>
                        
                        {/* Address display with holographic effect */}
                        <div className="relative mb-6">
                          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 rounded-xl p-6 border border-hotline/30 backdrop-blur-sm">
                            <code className="block text-gray-100 font-mono text-base md:text-lg break-all leading-relaxed text-center font-medium">
                              {bitcoinPayment.bitcoin_address}
                            </code>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-br from-hotline/10 to-hotline-pink/10 rounded-xl blur-lg opacity-70 -z-10" />
                        </div>
                        
                        {/* Enhanced copy button */}
                        <div className="flex justify-center">
                          <Button
                            onClick={copyAddress}
                            disabled={addressCopied}
                            className={`
                              ${addressCopied 
                                ? 'bg-green-600 hover:bg-green-700 border-green-600' 
                                : 'bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90'
                              } text-white px-10 py-4 text-lg font-bold rounded-xl shadow-2xl pulse-glow transition-all duration-300 min-w-[180px]
                            `}
                          >
                            {addressCopied ? (
                              <>
                                <CheckCircle className="h-6 w-6 mr-2 animate-pulse" />
                                Address Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-6 w-6 mr-2" />
                                Copy Address
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {/* Copy all button */}
                        <div className="flex justify-center mt-4">
                          <Button
                            onClick={() => {
                              const walletString = `Bitcoin Address: ${bitcoinPayment.bitcoin_address}\nAmount: ${bitcoinPayment.bitcoin_amount.toFixed(8)} BTC`;
                              navigator.clipboard.writeText(walletString);
                              toast({
                                title: "Payment Details Copied",
                                description: "Both address and amount copied for easy wallet pasting",
                                variant: "default",
                              });
                            }}
                            variant="outline"
                            className="bg-black/30 border-hotline/40 text-hotline hover:bg-hotline/10 hover:border-hotline/60 px-6 py-2 text-sm font-medium rounded-lg transition-all duration-300"
                          >
                            📋 Copy All Details
                          </Button>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-hotline/20 to-hotline-pink/20 rounded-2xl blur-xl opacity-40 -z-10" />
                    </div>
                  
                  {/* Streamlined Important Notice */}
                  <div className="bg-black/30 backdrop-blur-sm border border-hotline/30 rounded-xl p-4 hover:border-hotline/50 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-hotline animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">
                          <strong className="text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text">Important:</strong> Send the exact Bitcoin amount shown above. Your call starts automatically once payment confirms (10-30 minutes).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show expired payment message */}
            {paymentStatus === 'expired' && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-6 mt-6 shadow-lg backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-destructive">Payment Window Expired ⏰</p>
                    <p className="text-muted-foreground font-medium mt-2 mb-4">
                      The 20-minute payment window has closed and this booking has been cancelled. 
                      Bitcoin prices change quickly, so we require payment within the time window to ensure accurate pricing.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link to="/">
                        <Button className="bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90 text-white">
                          Create New Booking
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="border-hotline text-hotline hover:bg-hotline/10"
                      >
                        Refresh Status
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            
            {(paymentStatus === 'completed' || paymentStatus === 'processing') && (
              <div className="relative overflow-hidden rounded-2xl">
                <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-hotline/40">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <CheckCircle className="h-8 w-8 text-hotline animate-pulse" />
                      <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text">
                        {paymentStatus === 'completed' ? 'Payment Complete ✨' : 'Payment Detected 🔍'}
                      </h3>
                    </div>
                    <p className="text-gray-200 text-base">
                      {paymentStatus === 'completed' 
                        ? 'Your Bitcoin payment has been confirmed on the blockchain. Your call will be initiated shortly!'
                        : 'Your Bitcoin payment has been detected and is being confirmed on the blockchain.'
                      }
                    </p>
                  </div>
                  
                  {/* Blockchain confirmation progress */}
                  <div className="bg-black/60 rounded-xl p-6 border border-hotline/30">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-300 uppercase tracking-widest font-bold">Blockchain Confirmations</p>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="relative">
                          <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
                            paymentStatus === 'completed' 
                              ? 'bg-gradient-to-r from-hotline to-hotline-pink animate-pulse shadow-lg' 
                              : i < 2 
                                ? 'bg-gradient-to-r from-hotline to-hotline-pink animate-pulse shadow-lg'
                                : 'bg-gray-600'
                          }`} />
                          {(paymentStatus === 'completed' || i < 2) && (
                            <div className="absolute inset-0 bg-gradient-to-r from-hotline to-hotline-pink rounded-full blur-sm opacity-60 animate-ping" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-400">
                        {paymentStatus === 'completed' 
                          ? '6/6 confirmations - Ready to connect!' 
                          : '2/6 confirmations - Securing transaction...'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {paymentStatus === 'completed' && (
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-hotline to-hotline-pink text-white px-6 py-3 rounded-full pulse-glow">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        <span className="font-bold">Initiating your AI connection...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-hotline/20 to-hotline-pink/20 rounded-2xl blur-xl opacity-40 -z-10" />
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
            </div>
          </div>
        </div>
        
        {/* Floating Action Buttons */}
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 flex flex-col gap-3 z-20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleManualRefresh}
                className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-gradient-to-r from-hotline to-hotline-pink pulse-glow shadow-2xl hover:scale-110 transition-all duration-300"
                disabled={loading}
              >
                <RefreshCw className={`h-5 sm:h-6 w-5 sm:w-6 text-white ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <span>Refresh Status (R)</span>
            </TooltipContent>
          </Tooltip>
          
          {bitcoinPayment && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    const walletString = `${bitcoinPayment.bitcoin_amount.toFixed(8)} BTC to ${bitcoinPayment.bitcoin_address}`;
                    navigator.clipboard.writeText(walletString);
                    toast({
                      title: "Quick Copy Complete",
                      description: "Payment details ready for your wallet",
                    });
                  }}
                  className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-black/40 backdrop-blur-sm border border-hotline/40 text-hotline hover:bg-hotline/20 hover:border-hotline/60 hover:scale-110 transition-all duration-300"
                >
                  <Copy className="h-5 sm:h-6 w-5 sm:w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <span>Quick Copy (Space)</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Hero-style Return Home Button */}
        <div className="flex justify-center mt-8 sm:mt-12 pb-4">
          <Link to="/">
            <Button className="bg-gradient-to-r from-hotline to-hotline-pink hover:opacity-90 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl flex items-center gap-2 sm:gap-3 transition-all duration-300 shadow-2xl pulse-glow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 sm:h-6 w-5 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v6m0 0h4m-4 0a2 2 0 01-2-2v-4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Return to SweetyOnCall</span>
              <span className="sm:hidden">Home</span>
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Keyboard shortcuts handler */}
      <div className="sr-only">
        Press R to refresh, Space to quick copy
      </div>
    </div>
  );
}
