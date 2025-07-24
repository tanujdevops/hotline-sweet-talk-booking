import React from 'react';
import { 
  Check, Clock, Star, ShieldCheck, Sparkles, Zap, 
  PhoneCall, CreditCard, Heart, Phone
} from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const iconMap = {
  Check,
  Clock, 
  Star,
  ShieldCheck,
  Sparkles,
  Zap,
  PhoneCall,
  CreditCard,
  Heart,
  Phone
};

const Icon: React.FC<IconProps> = ({ name, size = 18, className = '' }) => {
  const IconComponent = iconMap[name as keyof typeof iconMap];
  
  if (!IconComponent) {
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
};

export default Icon;