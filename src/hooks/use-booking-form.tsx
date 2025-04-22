
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

      // Get user's IP for free trial tracking
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ 
          name, 
          phone: fullPhoneNumber, 
          email, 
          booking_date: formattedDate,
          message,
          pricing_tier: pricingTier,
          user_ip: ip,
        }])
        .select('booking_id');
      
      if (error) {
        if (error.message.includes('Free trial not available')) {
          toast({
            title: "Free Trial Not Available",
            description: "Please wait 24 hours between free trials.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      const newBookingId = data && data.length > 0 ? data[0].booking_id : null;

      // If it's a free trial, initiate the vAPI call
      if (pricingTier === PRICING_TIERS.FREE_TRIAL) {
        const { data: vapiResponse, error: vapiError } = await supabase.functions.invoke('vapi-call', {
          body: {
            name,
            phone: fullPhoneNumber,
          },
        });

        if (vapiError) {
          console.error('Error initiating vAPI call:', vapiError);
          toast({
            title: "Call Initiation Failed",
            description: "We couldn't initiate your call. Our team will contact you shortly.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Booking Confirmed!",
        description: "Your call has been scheduled.",
      });
      
      if (newBookingId) {
        navigate('/booking-confirmation', { 
          state: { 
            bookingId: newBookingId,
            date: date ? date.toISOString() : null,
            name,
            email
          }
        });
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
