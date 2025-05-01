
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_TIERS, type PricingTier } from "@/lib/pricing";

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

  const initiateVapiCall = async (bookingId: string, phone: string, name: string) => {
    try {
      console.log("Checking VAPI concurrency...");
      // First, check concurrency
      const { data: concurrencyData, error: concurrencyError } = await supabase.functions.invoke('check-vapi-concurrency', {
        body: { bookingId }
      });

      if (concurrencyError) {
        console.error("Error checking VAPI concurrency:", concurrencyError);
        throw new Error("Failed to check call availability");
      }

      console.log("Concurrency check response:", concurrencyData);
      if (concurrencyData?.canMakeCall === false) {
        // Update booking status to queued
        await supabase
          .from('bookings')
          .update({ status: 'queued' })
          .eq('id', bookingId);
          
        console.log("Call queued due to concurrency limits");
        return;
      }

      // If we can make a call, initiate it
      console.log("Initiating VAPI call...");
      const { data: initiateData, error: initiateError } = await supabase.functions.invoke('initiate-vapi-call', {
        body: { bookingId, phone, name }
      });

      if (initiateError) {
        console.error("Error initiating VAPI call:", initiateError);
        throw new Error("Failed to initiate call");
      }

      console.log("VAPI call initiated:", initiateData);
      // Update booking status to calling
      await supabase
        .from('bookings')
        .update({ status: 'calling' })
        .eq('id', bookingId);
        
    } catch (error) {
      console.error("Error in VAPI call process:", error);
      throw error;
    }
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

      // First, check if the user exists
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
        
        // Optionally update the name if it's different
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
        // Create a new user
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

      // Get the plan data
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select()
        .eq('key', pricingTier)
        .single();

      if (planError) {
        console.error("Plan fetch error:", planError);
        throw planError;
      }

      console.log("Plan data response:", planData);

      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: userId,
            plan_id: planData.id,
            status: 'pending',
            message
          }
        ])
        .select();

      if (bookingError) {
        console.error("Booking insert error:", bookingError);
        throw bookingError;
      }

      console.log("Booking data response:", bookingData);
      const bookingId = bookingData?.[0]?.id;

      if (!bookingId) {
        throw new Error('Failed to create booking');
      }

      // Handle different flows for free trial vs paid plans
      if (pricingTier === PRICING_TIERS.FREE_TRIAL) {
        // For free trial, directly initiate VAPI call
        await initiateVapiCall(bookingId, fullPhoneNumber, name);
        
        toast({
          title: "Booking Confirmed!",
          description: "Your call will be initiated shortly.",
        });
      } else {
        // For paid plans, we'll update status to pending_payment
        // and redirect to a payment page (to be implemented)
        await supabase
          .from('bookings')
          .update({ status: 'pending_payment' })
          .eq('id', bookingId);
          
        toast({
          title: "Payment Required",
          description: "Please complete the payment to confirm your booking.",
        });
        
        // In a real implementation, we would integrate with Stripe here
        // and only call initiateVapiCall after successful payment
        
        // For now, we'll just simulate a successful payment for demo purposes
        console.log("Payment would be processed here for paid tier:", pricingTier);
        console.log("After payment success, we would initiate the VAPI call");
        
        // This is just a placeholder - in a real app, this would happen after payment confirmation
        // await initiateVapiCall(bookingId, fullPhoneNumber, name);
      }

      navigate('/waiting', { 
        state: { 
          bookingId,
          planKey: pricingTier,
        }
      });

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
