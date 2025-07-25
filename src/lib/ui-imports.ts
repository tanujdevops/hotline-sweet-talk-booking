// Selective UI component imports to reduce bundle size
// Only import what's actually used in the application

// Core UI components used throughout the app
export { Button } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Toast system - essential for feedback
export { useToast } from "@/components/ui/use-toast";
export { Toaster } from "@/components/ui/toaster";

// Layout components
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Form components - used in booking
export { PhoneInput } from "@/components/ui/phone-input";

// Less frequently used components - lazy load these
export const LazyAccordion = async () => {
  const { Accordion, AccordionContent, AccordionItem, AccordionTrigger } = await import("@/components/ui/accordion");
  return { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
};

export const LazyDialog = async () => {
  const module = await import("@/components/ui/dialog");
  return module;
};

export const LazyTooltip = async () => {
  const { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } = await import("@/components/ui/tooltip");
  return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
};