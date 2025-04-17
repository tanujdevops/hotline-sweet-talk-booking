
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  countryCode: string;
  setCountryCode: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  required?: boolean;
  className?: string;
}

export const PhoneInput = ({ 
  countryCode, 
  setCountryCode, 
  phoneNumber, 
  setPhoneNumber,
  required = false,
  className
}: PhoneInputProps) => {
  // Validate phone number input to allow only digits
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    setPhoneNumber(value);
  };

  // Handle country code input, ensuring it starts with '+'
  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Ensure the country code starts with '+'
    if (!value.startsWith('+')) {
      value = '+' + value.replace(/\+/g, '');
    }
    
    // Allow only digits and the '+' symbol
    value = value.replace(/[^\d+]/g, '');
    
    setCountryCode(value);
  };

  // Format the phone number with spaces for better readability
  const formatPhoneNumber = (value: string) => {
    // Simple formatting for display purposes
    if (value.length <= 3) return value;
    if (value.length <= 6) return `${value.slice(0, 3)} ${value.slice(3)}`;
    return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
  };

  const displayPhoneNumber = formatPhoneNumber(phoneNumber);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="phone" className="flex items-center gap-1.5">
        <Phone size={16} className="text-hotline-pink" />
        <span>Phone Number</span> 
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative flex rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-hotline focus-within:border-hotline">
        <div className="relative">
          <Input
            id="country-code"
            placeholder="+1"
            value={countryCode}
            onChange={handleCountryCodeChange}
            className="border-0 rounded-none w-[70px] text-center font-medium bg-primary/5 focus-visible:ring-0"
            maxLength={5}
            aria-label="Country code"
          />
          <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-input"></div>
        </div>
        <Input
          id="phone"
          placeholder="Phone number"
          value={displayPhoneNumber}
          onChange={handlePhoneNumberChange}
          required={required}
          className="border-0 bg-transparent focus-visible:ring-0 flex-1"
          type="tel"
          maxLength={15}
          aria-label="Phone number"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        We'll only contact you regarding your booking.
      </p>
    </div>
  );
};
