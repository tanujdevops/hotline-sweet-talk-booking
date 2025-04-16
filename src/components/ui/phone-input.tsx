
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

// Comprehensive list of country codes with flags
const countryCodes = [
  { code: "+1", country: "US 🇺🇸" },
  { code: "+44", country: "UK 🇬🇧" },
  { code: "+93", country: "AF 🇦🇫" },
  { code: "+355", country: "AL 🇦🇱" },
  { code: "+213", country: "DZ 🇩🇿" },
  { code: "+376", country: "AD 🇦🇩" },
  { code: "+244", country: "AO 🇦🇴" },
  { code: "+54", country: "AR 🇦🇷" },
  { code: "+374", country: "AM 🇦🇲" },
  { code: "+61", country: "AU 🇦🇺" },
  { code: "+43", country: "AT 🇦🇹" },
  { code: "+994", country: "AZ 🇦🇿" },
  { code: "+973", country: "BH 🇧🇭" },
  { code: "+880", country: "BD 🇧🇩" },
  { code: "+375", country: "BY 🇧🇾" },
  { code: "+32", country: "BE 🇧🇪" },
  { code: "+501", country: "BZ 🇧🇿" },
  { code: "+229", country: "BJ 🇧🇯" },
  { code: "+975", country: "BT 🇧🇹" },
  { code: "+591", country: "BO 🇧🇴" },
  { code: "+387", country: "BA 🇧🇦" },
  { code: "+267", country: "BW 🇧🇼" },
  { code: "+55", country: "BR 🇧🇷" },
  { code: "+673", country: "BN 🇧🇳" },
  { code: "+359", country: "BG 🇧🇬" },
  { code: "+226", country: "BF 🇧🇫" },
  { code: "+257", country: "BI 🇧🇮" },
  { code: "+855", country: "KH 🇰🇭" },
  { code: "+237", country: "CM 🇨🇲" },
  { code: "+1", country: "CA 🇨🇦" },
  { code: "+238", country: "CV 🇨🇻" },
  { code: "+236", country: "CF 🇨🇫" },
  { code: "+235", country: "TD 🇹🇩" },
  { code: "+56", country: "CL 🇨🇱" },
  { code: "+86", country: "CN 🇨🇳" },
  { code: "+57", country: "CO 🇨🇴" },
  { code: "+269", country: "KM 🇰🇲" },
  { code: "+242", country: "CG 🇨🇬" },
  { code: "+243", country: "CD 🇨🇩" },
  { code: "+506", country: "CR 🇨🇷" },
  { code: "+385", country: "HR 🇭🇷" },
  { code: "+53", country: "CU 🇨🇺" },
  { code: "+357", country: "CY 🇨🇾" },
  { code: "+420", country: "CZ 🇨🇿" },
  { code: "+45", country: "DK 🇩🇰" },
  { code: "+253", country: "DJ 🇩🇯" },
  { code: "+670", country: "TL 🇹🇱" },
  { code: "+593", country: "EC 🇪🇨" },
  { code: "+20", country: "EG 🇪🇬" },
  { code: "+503", country: "SV 🇸🇻" },
  { code: "+240", country: "GQ 🇬🇶" },
  { code: "+291", country: "ER 🇪🇷" },
  { code: "+372", country: "EE 🇪🇪" },
  { code: "+251", country: "ET 🇪🇹" },
  { code: "+679", country: "FJ 🇫🇯" },
  { code: "+358", country: "FI 🇫🇮" },
  { code: "+33", country: "FR 🇫🇷" },
  { code: "+241", country: "GA 🇬🇦" },
  { code: "+220", country: "GM 🇬🇲" },
  { code: "+995", country: "GE 🇬🇪" },
  { code: "+49", country: "DE 🇩🇪" },
  { code: "+233", country: "GH 🇬🇭" },
  { code: "+30", country: "GR 🇬🇷" },
  { code: "+502", country: "GT 🇬🇹" },
  { code: "+224", country: "GN 🇬🇳" },
  { code: "+245", country: "GW 🇬🇼" },
  { code: "+592", country: "GY 🇬🇾" },
  { code: "+509", country: "HT 🇭🇹" },
  { code: "+504", country: "HN 🇭🇳" },
  { code: "+36", country: "HU 🇭🇺" },
  { code: "+354", country: "IS 🇮🇸" },
  { code: "+91", country: "IN 🇮🇳" },
  { code: "+62", country: "ID 🇮🇩" },
  { code: "+98", country: "IR 🇮🇷" },
  { code: "+964", country: "IQ 🇮🇶" },
  { code: "+353", country: "IE 🇮🇪" },
  { code: "+972", country: "IL 🇮🇱" },
  { code: "+39", country: "IT 🇮🇹" },
  { code: "+225", country: "CI 🇨🇮" },
  { code: "+81", country: "JP 🇯🇵" },
  { code: "+962", country: "JO 🇯🇴" },
  { code: "+7", country: "KZ 🇰🇿" },
  { code: "+254", country: "KE 🇰🇪" },
  { code: "+965", country: "KW 🇰🇼" },
  { code: "+996", country: "KG 🇰🇬" },
  { code: "+856", country: "LA 🇱🇦" },
  { code: "+371", country: "LV 🇱🇻" },
  { code: "+961", country: "LB 🇱🇧" },
  { code: "+266", country: "LS 🇱🇸" },
  { code: "+231", country: "LR 🇱🇷" },
  { code: "+218", country: "LY 🇱🇾" },
  { code: "+423", country: "LI 🇱🇮" },
  { code: "+370", country: "LT 🇱🇹" },
  { code: "+352", country: "LU 🇱🇺" },
  { code: "+389", country: "MK 🇲🇰" },
  { code: "+261", country: "MG 🇲🇬" },
  { code: "+265", country: "MW 🇲🇼" },
  { code: "+60", country: "MY 🇲🇾" },
  { code: "+960", country: "MV 🇲🇻" },
  { code: "+223", country: "ML 🇲🇱" },
  { code: "+356", country: "MT 🇲🇹" },
  { code: "+222", country: "MR 🇲🇷" },
  { code: "+230", country: "MU 🇲🇺" },
  { code: "+52", country: "MX 🇲🇽" },
  { code: "+373", country: "MD 🇲🇩" },
  { code: "+377", country: "MC 🇲🇨" },
  { code: "+976", country: "MN 🇲🇳" },
  { code: "+382", country: "ME 🇲🇪" },
  { code: "+212", country: "MA 🇲🇦" },
  { code: "+258", country: "MZ 🇲🇿" },
  { code: "+95", country: "MM 🇲🇲" },
  { code: "+264", country: "NA 🇳🇦" },
  { code: "+977", country: "NP 🇳🇵" },
  { code: "+31", country: "NL 🇳🇱" },
  { code: "+64", country: "NZ 🇳🇿" },
  { code: "+505", country: "NI 🇳🇮" },
  { code: "+227", country: "NE 🇳🇪" },
  { code: "+234", country: "NG 🇳🇬" },
  { code: "+850", country: "KP 🇰🇵" },
  { code: "+47", country: "NO 🇳🇴" },
  { code: "+968", country: "OM 🇴🇲" },
  { code: "+92", country: "PK 🇵🇰" },
  { code: "+507", country: "PA 🇵🇦" },
  { code: "+675", country: "PG 🇵🇬" },
  { code: "+595", country: "PY 🇵🇾" },
  { code: "+51", country: "PE 🇵🇪" },
  { code: "+63", country: "PH 🇵🇭" },
  { code: "+48", country: "PL 🇵🇱" },
  { code: "+351", country: "PT 🇵🇹" },
  { code: "+974", country: "QA 🇶🇦" },
  { code: "+40", country: "RO 🇷🇴" },
  { code: "+7", country: "RU 🇷🇺" },
  { code: "+250", country: "RW 🇷🇼" },
  { code: "+966", country: "SA 🇸🇦" },
  { code: "+221", country: "SN 🇸🇳" },
  { code: "+381", country: "RS 🇷🇸" },
  { code: "+232", country: "SL 🇸🇱" },
  { code: "+65", country: "SG 🇸🇬" },
  { code: "+421", country: "SK 🇸🇰" },
  { code: "+386", country: "SI 🇸🇮" },
  { code: "+252", country: "SO 🇸🇴" },
  { code: "+27", country: "ZA 🇿🇦" },
  { code: "+82", country: "KR 🇰🇷" },
  { code: "+211", country: "SS 🇸🇸" },
  { code: "+34", country: "ES 🇪🇸" },
  { code: "+94", country: "LK 🇱🇰" },
  { code: "+249", country: "SD 🇸🇩" },
  { code: "+597", country: "SR 🇸🇷" },
  { code: "+268", country: "SZ 🇸🇿" },
  { code: "+46", country: "SE 🇸🇪" },
  { code: "+41", country: "CH 🇨🇭" },
  { code: "+963", country: "SY 🇸🇾" },
  { code: "+886", country: "TW 🇹🇼" },
  { code: "+992", country: "TJ 🇹🇯" },
  { code: "+255", country: "TZ 🇹🇿" },
  { code: "+66", country: "TH 🇹🇭" },
  { code: "+228", country: "TG 🇹🇬" },
  { code: "+216", country: "TN 🇹🇳" },
  { code: "+90", country: "TR 🇹🇷" },
  { code: "+993", country: "TM 🇹🇲" },
  { code: "+256", country: "UG 🇺🇬" },
  { code: "+380", country: "UA 🇺🇦" },
  { code: "+971", country: "AE 🇦🇪" },
  { code: "+598", country: "UY 🇺🇾" },
  { code: "+998", country: "UZ 🇺🇿" },
  { code: "+58", country: "VE 🇻🇪" },
  { code: "+84", country: "VN 🇻🇳" },
  { code: "+967", country: "YE 🇾🇪" },
  { code: "+260", country: "ZM 🇿🇲" },
  { code: "+263", country: "ZW 🇿🇼" },
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
            <SelectContent className="max-h-[300px]">
              {countryCodes.map((country) => (
                <SelectItem key={`${country.code}-${country.country}`} value={country.code}>
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
