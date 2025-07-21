import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_TIERS, PRICING_DETAILS, type PricingTier } from "@/lib/pricing";
import { CallManager } from "@/lib/call-manager";

export function useBookingForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (
    name: string,
    email: string,
    phoneNumber: string,
    message: string
  ) => {
    // Name validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Please enter your name",
        variant: "destructive",
      });
      return false;
    }
    
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast({
        title: "Name must be between 2 and 100 characters",
        variant: "destructive",
      });
      return false;
    }

    // Basic name pattern validation (letters, spaces, common punctuation)
    if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
      toast({
        title: "Name contains invalid characters",
        variant: "destructive",
      });
      return false;
    }

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: "Please enter your email address",
        variant: "destructive",
      });
      return false;
    }

    // Email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // Email length validation
    if (trimmedEmail.length > 254) {
      toast({
        title: "Email address is too long",
        variant: "destructive",
      });
      return false;
    }

    // Phone number validation
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      toast({
        title: "Please enter your phone number",
        variant: "destructive",
      });
      return false;
    }

    // Phone number format validation (digits, spaces, hyphens, parentheses, plus)
    if (!/^[\d\s\-\(\)\+]+$/.test(trimmedPhone)) {
      toast({
        title: "Phone number contains invalid characters",
        variant: "destructive",
      });
      return false;
    }

    // Phone number length validation (7-15 digits for international numbers)
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      toast({
        title: "Please enter a valid phone number (7-15 digits)",
        variant: "destructive",
      });
      return false;
    }

    // Message validation
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast({
        title: "Please provide some details about your call",
        variant: "destructive",
      });
      return false;
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 500) {
      toast({
        title: "Message must be between 10 and 500 characters",
        variant: "destructive",
      });
      return false;
    }

    // Basic content filtering - reject if mostly special characters
    const letterCount = (trimmedMessage.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < trimmedMessage.length * 0.3) {
      toast({
        title: "Please provide a meaningful description",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async ({
    name,
    email,
    countryCode,
    phoneNumber,
    message,
    pricingTier
  }: {
    name: string;
    email: string;
    countryCode: string;
    phoneNumber: string;
    message: string;
    pricingTier: PricingTier;
  }) => {
    if (!validateForm(name, email, phoneNumber, message)) return;

    setIsSubmitting(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      // --- CONCURRENCY PRE-CHECK (account-level only) ---
      try {
        // Map frontend pricing tier to database plan key for concurrency check
        const planKeyMap: Record<PricingTier, 'free_trial' | 'standard' | 'extended'> = {
          [PRICING_TIERS.FREE_TRIAL]: 'free_trial',
          [PRICING_TIERS.ESSENTIAL]: 'standard',
          [PRICING_TIERS.DELUXE]: 'extended'
        };
        const dbPlanKey = planKeyMap[pricingTier];
        
        const concurrencyData = await CallManager.checkVapiConcurrency(dbPlanKey);
        
        if (!concurrencyData.canMakeCall) {
          toast({
            title: 'All agents are currently busy',
            description: concurrencyData.queuePosition
              ? `You are #${concurrencyData.queuePosition} in the queue. Please try again later.`
              : 'Please try again in a few minutes.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('Error checking VAPI concurrency:', error);
        toast({
          title: 'Service Check Failed',
          description: error instanceof Error ? error.message : 'Unable to verify service availability. Please try again.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      // --- END CONCURRENCY PRE-CHECK ---

      // Atomically create or update user to prevent race conditions
      let userId;
      
      try {
        const { data: userResult, error: userError } = await supabase
          .rpc('upsert_user', {
            p_name: name,
            p_email: email,
            p_phone: fullPhoneNumber
          });
        
        if (userError || !userResult) {
          console.error("Error upserting user:", userError);
          throw userError || new Error('Failed to create or update user');
        }
        
        userId = userResult;
        // User created or updated successfully
      } catch (userError) {
        console.error("Error in user upsert:", userError);
        throw new Error('Failed to process user information');
      }

      // Get plan data - map new pricing tiers to existing plan keys
      const planKeyMap: Record<PricingTier, 'free_trial' | 'standard' | 'extended'> = {
        [PRICING_TIERS.FREE_TRIAL]: 'free_trial',
        [PRICING_TIERS.ESSENTIAL]: 'standard',
        [PRICING_TIERS.DELUXE]: 'extended'
      };
      const dbPlanKey = planKeyMap[pricingTier];
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select()
        .eq('key', dbPlanKey)
        .single();

      if (planError) {
        console.error("Plan fetch error:", planError);
        throw planError;
      }

      // --- FREE TRIAL ELIGIBILITY CHECK BEFORE BOOKING CREATION ---
      if (pricingTier === PRICING_TIERS.FREE_TRIAL) {
        console.log('Checking free trial eligibility for user:', userId);
        
        const { data: eligibilityData, error: eligibilityError } = await supabase.rpc('check_free_trial_eligibility', {
          user_id: userId
        });
        
        console.log('Free trial eligibility result:', { eligibilityData, eligibilityError });
        
        if (eligibilityError) {
          console.error("Error checking free trial eligibility:", eligibilityError);
          toast({
            title: "Error",
            description: "Could not check free trial eligibility. Please try again.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        if (!eligibilityData) {
          console.log('User is not eligible for free trial');
          toast({
            title: "Free Trial Unavailable",
            description: "You can only use one free trial every 24 hours. Please try again later or choose a paid plan.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        console.log('User is eligible for free trial, proceeding...');
      }
      // --- END FREE TRIAL ELIGIBILITY CHECK ---

      // Create booking with correct initial status
      const initialStatus = pricingTier === PRICING_TIERS.FREE_TRIAL ? 'queued' : 'pending_payment';
      
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: userId,
            plan_id: planData.id,
            status: initialStatus,
            message,
            call_duration: PRICING_DETAILS[pricingTier].duration * 60,
            payment_status: pricingTier === PRICING_TIERS.FREE_TRIAL ? 'completed' : 'pending'
          }
        ])
        .select();

      if (bookingError) {
        console.error("Booking insert error:", bookingError);
        throw bookingError;
      }

      // Booking created successfully
      const bookingId = bookingData?.[0]?.id;

      if (!bookingId) {
        throw new Error('Failed to create booking');
      }

      // Handle different flows
      if (pricingTier === PRICING_TIERS.FREE_TRIAL) {
        console.log('Processing free trial booking:', bookingId);
        
        // Update user's last_free_trial timestamp
        console.log('Updating last_free_trial timestamp for user:', userId);
        const { error: updateError } = await supabase.rpc('update_last_free_trial', {
          user_id: userId
        });

        if (updateError) {
          console.error('Error updating last_free_trial:', updateError);
          // Don't fail the entire process for this, just log it
          console.warn('Continuing despite last_free_trial update error');
        } else {
          console.log('Successfully updated last_free_trial timestamp');
        }
        
        // For free trial, initiate call immediately
        toast({
          title: "Free Trial Booking Created!",
          description: "Your call is connecting instantly...",
        });
        
        try {
          console.log('Initiating free trial call with params:', { 
            bookingId, 
            phone: fullPhoneNumber, 
            name 
          });
          
          // Call the initiate-vapi-call function directly for free trials
          const callData = await CallManager.initiateVapiCall(bookingId, fullPhoneNumber, name);
          console.log('Free trial call initiated successfully:', callData);
        } catch (error) {
          console.error('Error in free trial call initiation:', error);
          toast({
            title: "Call Initiation Failed", 
            description: error instanceof Error ? error.message : "Unable to start your free trial call. Please try again.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        console.log('Navigating to waiting page...');
        navigate(`/waiting?booking_id=${bookingId}`, { 
          state: { 
            bookingId,
            planKey: dbPlanKey,
          }
        });
      } else {
        // For paid plans, redirect to payment first
        // Paid plan selected - creating payment session
        
        // Create payment session
        try {
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
        }
      }
    } catch (error) {
      console.error('Error in booking submission:', error);
      toast({
        title: "Booking Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit
  };
}
