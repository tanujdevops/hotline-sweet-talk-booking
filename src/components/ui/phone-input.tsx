
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhoneInputProps {
  countryCode: string;
  setCountryCode: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  required?: boolean;
}

// Common country codes with flags
const countryCodes = [
  { code: "+1", country: "US 🇺🇸" },
  { code: "+44", country: "UK 🇬🇧" },
  { code: "+61", country: "AU 🇦🇺" },
  { code: "+91", country: "IN 🇮🇳" },
  { code: "+86", country: "CN 🇨🇳" },
  { code: "+33", country: "FR 🇫🇷" },
  { code: "+49", country: "DE 🇩🇪" },
  { code: "+81", country: "JP 🇯🇵" },
  { code: "+7", country: "RU 🇷🇺" },
  { code: "+55", country: "BR 🇧🇷" },
];

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

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">Phone Number {required && <span className="text-destructive">*</span>}</Label>
      <div className="flex gap-2">
        <div className="w-1/3">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger id="country-code" className="bg-secondary/50 border-muted">
              <SelectValue placeholder="Code" />
            </SelectTrigger>
            <SelectContent>
              {countryCodes.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.code} {country.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
