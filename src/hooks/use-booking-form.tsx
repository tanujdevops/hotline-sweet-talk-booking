
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_TIERS, type PricingTier } from "@/lib/pricing";

const DURATION_MAPPING = {
  [PRICING_TIERS.FREE_TRIAL]: 30,
  [PRICING_TIERS.STANDARD]: 180,
  [PRICING_TIERS.EXTENDED]: 420,
} as const;

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

      // First, upsert the user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({ 
          name, 
          phone: fullPhoneNumber 
        })
        .select();

      if (userError) {
        console.error("User upsert error:", userError);
        throw userError;
      }

      console.log("User data response:", userData);
      
      const userId = userData?.[0]?.id;
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

      toast({
        title: "Booking Confirmed!",
        description: "We'll process your request shortly.",
      });

      navigate('/waiting', { 
        state: { 
          bookingId: bookingData?.[0]?.id,
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
