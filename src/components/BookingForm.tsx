
import React, { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, PhoneCall } from "lucide-react";

const BookingForm = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [callType, setCallType] = useState("quick");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Booking Confirmed!",
        description: "We'll be calling you at the scheduled time. Get ready for a pleasurable conversation!",
        variant: "default",
      });
      
      // Reset form
      setName("");
      setPhone("");
      setEmail("");
      setDate(undefined);
      setCallType("quick");
      setMessage("");
      setIsSubmitting(false);
    }, 1500);
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
          
          <div className="bg-card p-8 rounded-xl border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-secondary/50 border-muted mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="bg-secondary/50 border-muted mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
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
                  <Label>Preferred Date & Time</Label>
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Choose Your Experience</Label>
                  <RadioGroup value={callType} onValueChange={setCallType} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quick" id="quick" />
                      <Label htmlFor="quick" className="cursor-pointer">Quick Tease - $2 (2 minutes)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="extended" id="extended" />
                      <Label htmlFor="extended" className="cursor-pointer">Extended Pleasure - $3 (4 minutes)</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label htmlFor="message">Special Requests (Optional)</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us about any preferences or special requests"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-secondary/50 border-muted mt-2 min-h-[100px]"
                  />
                </div>
              </div>
              
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-hotline hover:bg-hotline-dark text-white py-6 rounded-md transition-all duration-300"
              >
                {isSubmitting ? "Processing..." : "Book Your Call Now"}
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
