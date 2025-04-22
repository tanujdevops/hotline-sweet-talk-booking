import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, PhoneCall, Clock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/ui/phone-input";
import { PRICING_TIERS, PRICING_DETAILS, type PricingTier } from "@/lib/pricing";

const BookingForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [pricingTier, setPricingTier] = useState<PricingTier>(PRICING_TIERS.STANDARD);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return false;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 7) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return false;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }

    if (!date) {
      toast({
        title: "Validation Error",
        description: "Please select a date for your call.",
        variant: "destructive",
      });
      return false;
    }

    if (!message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide some details about your call request.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const formattedDate = date ? new Date(date).toISOString() : null;
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          { 
            name, 
            phone: fullPhoneNumber, 
            email, 
            booking_date: formattedDate,
            message,
            pricing_tier: pricingTier,
          }])
        .select('booking_id');
      
      if (error) {
        console.error('Error saving booking:', error);
        toast({
          title: "Booking Failed",
          description: "There was a problem saving your booking. Please try again.",
          variant: "destructive",
        });
      } else {
        const newBookingId = data && data.length > 0 ? data[0].booking_id : null;
        
        toast({
          title: "Booking Confirmed!",
          description: `Your ${PRICING_DETAILS[pricingTier].duration}-minute call is scheduled for ${date ? format(date, "PPP") : "soon"}.`,
          variant: "default",
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
        } else {
          toast({
            title: "Something went wrong",
            description: "Booking was processed but couldn't retrieve the booking ID. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error in booking submission:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledDays = (date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  return (
    <section id="booking" className="py-20 px-4 bg-gradient-to-b from-black/90 to-background">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Book Your <span className="text-hotline">Sweet Talk</span> Session</h2>
            <p className="text-lg text-gray-300 mb-8">
              Fill out the form below and we'll schedule your call with one of our professional sweet talkers. Get ready for a pleasurable conversation!
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="rounded-full bg-hotline p-3">
                  <PhoneCall size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold">100% Confidential</h3>
                  <p className="text-muted-foreground text-sm">Your information is secure with us</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="rounded-full bg-hotline p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold">Secure Payment</h3>
                  <p className="text-muted-foreground text-sm">Your transactions are fully encrypted</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                <div className="rounded-full bg-hotline p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold">Cancel Anytime</h3>
                  <p className="text-muted-foreground text-sm">No contracts or commitments</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card p-8 rounded-xl border border-border shadow-lg transform hover:scale-[1.01] transition-transform duration-300">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-secondary/50 border-muted mt-2"
                  />
                </div>
                
                <PhoneInput
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  required
                />
                
                <div>
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary/50 border-muted mt-2"
                  />
                </div>
                
                <div>
                  <Label>Preferred Date <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary/50 border-muted mt-2",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={disabledDays}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Choose Your Experience <span className="text-destructive">*</span></Label>
                  <RadioGroup 
                    value={pricingTier} 
                    onValueChange={(value: PricingTier) => setPricingTier(value)} 
                    className="mt-2 space-y-4"
                  >
                    {Object.entries(PRICING_DETAILS).map(([tier, details]) => (
                      <div key={tier} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-hotline transition-colors">
                        <div className="flex items-start gap-2 flex-1">
                          <RadioGroupItem value={tier} id={tier} />
                          <div className="flex flex-col">
                            <Label htmlFor={tier} className="cursor-pointer text-lg">
                              {details.label}
                            </Label>
                            <span className="text-muted-foreground text-sm">{details.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-hotline" />
                          <span className="text-sm">{details.duration} min</span>
                          <span className="text-sm font-semibold ml-2">
                            {details.price === 0 ? 'FREE' : `$${details.price}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label htmlFor="message">Special Requests <span className="text-destructive">*</span></Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about your preferences or special requests"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="bg-secondary/50 border-muted mt-2 min-h-[100px]"
                  />
                </div>
              </div>
              
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-hotline hover:bg-hotline-dark text-white py-6 rounded-md transition-all duration-300"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : pricingTier === PRICING_TIERS.FREE_TRIAL ? (
                  "Start Your Free Trial"
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {`Book Your ${PRICING_DETAILS[pricingTier].duration}-Minute Call`}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By booking a call, you agree to our <a href="#" className="text-hotline hover:underline">Terms of Service</a> and <a href="#" className="text-hotline hover:underline">Privacy Policy</a>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingForm;
