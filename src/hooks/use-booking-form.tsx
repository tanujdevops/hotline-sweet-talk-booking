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
    email: string,
    date: Date | undefined,
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

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Please enter a valid email",
        variant: "destructive",
      });
      return false;
    }

    if (!date) {
      toast({
        title: "Please select a date",
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
    email,
    date,
    message,
    pricingTier
  }: {
    name: string;
    countryCode: string;
    phoneNumber: string;
    email: string;
    date: Date | undefined;
    message: string;
    pricingTier: PricingTier;
  }) => {
    if (!validateForm(name, phoneNumber, email, date, message)) return;

    setIsSubmitting(true);
    
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const formattedDate = date ? new Date(date).toISOString() : null;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert(
          { 
            name, 
            phone: fullPhoneNumber, 
            email 
          },
          { 
            onConflict: 'email',
            returning: true 
          }
        )
        .select()
        .single();

      if (userError) throw userError;

      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select()
        .eq('key', pricingTier)
        .single();

      if (planError) throw planError;

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: userData.id,
            plan_id: planData.id,
            scheduled_at: formattedDate,
            status: 'pending',
            message
          }
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

      toast({
        title: "Booking Confirmed!",
        description: "We'll process your request shortly.",
      });

      navigate('/waiting', { 
        state: { 
          bookingId: bookingData.id,
          planKey: pricingTier,
          scheduledAt: formattedDate
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
