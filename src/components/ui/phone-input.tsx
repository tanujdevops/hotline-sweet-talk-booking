
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PhoneInputProps {
  countryCode: string;
  setCountryCode: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  required?: boolean;
}

export const PhoneInput = ({ 
  countryCode, 
  setCountryCode, 
  phoneNumber, 
  setPhoneNumber,
  required = false 
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

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Phone Number {required && <span className="text-destructive">*</span>}</Label>
      <div className="flex gap-2">
        <div className="w-1/3">
          <Input
            id="country-code"
            placeholder="+1"
            value={countryCode}
            onChange={handleCountryCodeChange}
            className="bg-secondary/50 border-muted"
            maxLength={5} // Limit to reasonable country code length
          />
        </div>
        <div className="w-2/3">
          <Input
            id="phone"
            placeholder="Phone number"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            required={required}
            className="bg-secondary/50 border-muted"
            type="tel"
            maxLength={15} // Prevent extremely long phone numbers
          />
        </div>
      </div>
    </div>
  );
};
