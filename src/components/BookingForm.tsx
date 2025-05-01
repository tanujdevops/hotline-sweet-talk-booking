
import React, { useState } from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { PRICING_TIERS, PRICING_DETAILS, type PricingTier } from "@/lib/pricing";
import { useBookingForm } from "@/hooks/use-booking-form";
import { PhoneCall, CreditCard } from "lucide-react";

const BookingForm = () => {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [pricingTier, setPricingTier] = useState<PricingTier>(PRICING_TIERS.STANDARD);

  const { isSubmitting, handleSubmit } = useBookingForm();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit({
      name,
      countryCode,
      phoneNumber,
      message,
      pricingTier
    });
  };

  return (
    <section id="booking" className="py-6 md:py-20 px-4 bg-gradient-to-b from-black/90 to-background">
      <div className="container mx-auto max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-start">
          <div className="md:sticky md:top-24">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Book Your <span className="text-hotline">Sweet Talk</span> Session</h2>
            <p className="text-base md:text-lg text-gray-300 mb-6">
              Fill out the form and get ready for a pleasurable conversation!
            </p>
            
            <div className="space-y-4 hidden md:block">
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
          
          <div className="bg-card p-6 md:p-8 rounded-xl border border-border shadow-lg">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-4">
                <Input 
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-secondary/50 border-muted"
                />
                
                <PhoneInput
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  required
                />
              </div>

              <div className="space-y-2">
                <RadioGroup 
                  value={pricingTier} 
                  onValueChange={(value: PricingTier) => setPricingTier(value)} 
                  className="grid grid-cols-1 gap-2"
                >
                  {Object.entries(PRICING_DETAILS).map(([tier, details]) => (
                    <label
                      key={tier}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        pricingTier === tier ? "border-hotline bg-secondary/50" : "border-border hover:border-hotline"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value={tier} id={tier} />
                        <div>
                          <p className="font-medium">{details.label}</p>
                          <p className="text-sm text-muted-foreground">{details.description}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap">
                        {details.price === 0 ? 'FREE' : `$${details.price}`}
                      </p>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Textarea 
                placeholder="Tell us about your preferences or special requests"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="bg-secondary/50 border-muted min-h-[80px]"
              />

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
                    Book Now
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By booking, you agree to our <a href="#" className="text-hotline hover:underline">Terms</a> & <a href="#" className="text-hotline hover:underline">Privacy Policy</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingForm;
