
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_TIERS, PRICING_DETAILS, type PricingTier } from "@/lib/pricing";

export function useBookingForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (
    name: string,
    phoneNumber: string,
    message: string
  ) => {
    if (!name.trim()) {
      toast({
        title: "Please enter your name",
        variant: "destructive",
      });
      return false;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 7) {
      toast({
        title: "Please enter a valid phone number",
        variant: "destructive",
      });
      return false;
    }

    if (!message.trim()) {
      toast({
        title: "Please provide some details",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async ({
    name,
    countryCode,
    phoneNumber,
    message,
    pricingTier
  }: {
    name: string;
    countryCode: string;
    phoneNumber: string;
    message: string;
    pricingTier: PricingTier;
  }) => {
    if (!validateForm(name, phoneNumber, message)) return;

    setIsSubmitting(true);
    
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      console.log("Form data being submitted:", { name, phone: fullPhoneNumber, pricingTier, message });

      // Check if user exists or create new user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select()
        .eq('phone', fullPhoneNumber)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching user:", fetchError);
        throw fetchError;
      }

      let userId;

      if (existingUser) {
        console.log("User already exists:", existingUser);
        userId = existingUser.id;

        if (existingUser.name !== name) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ name })
            .eq('id', userId);
          
          if (updateError) {
            console.error("Error updating user name:", updateError);
          }
        }
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ name, phone: fullPhoneNumber })
          .select();

        if (userError) {
          console.error("Error creating user:", userError);
          throw userError;
        }

        userId = newUser?.[0]?.id;
        console.log("New user created:", newUser);
      }

      if (!userId) {
        console.error("Failed to get user ID");
        throw new Error('Failed to create or get user');
      }

      // Get plan data
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select()
        .eq('key', pricingTier)
        .single();

      if (planError) {
        console.error("Plan fetch error:", planError);
        throw planError;
      }

      // Create booking with correct initial status
      const initialStatus = pricingTier === PRICING_TIERS.FREE_TRIAL ? 'pending' : 'pending_payment';
      
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

      console.log("Booking created:", bookingData);
      const bookingId = bookingData?.[0]?.id;

      if (!bookingId) {
        throw new Error('Failed to create booking');
      }

      // Handle different flows
      if (pricingTier === PRICING_TIERS.FREE_TRIAL) {
        // For free trial, immediately go to waiting page and call will be processed
        toast({
          title: "Free Trial Booking Created!",
          description: "Your call is being processed...",
        });
        
        navigate(`/waiting?booking_id=${bookingId}`, { 
          state: { 
            bookingId,
            planKey: pricingTier,
          }
        });
      } else {
        // For paid plans, redirect to payment first
        console.log("Paid plan selected - creating payment session");
        
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
