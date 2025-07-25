// Centralized icon imports to optimize bundle size
// Only import icons that are actually used across the app
export {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  CreditCard,
  Facebook,
  Home,
  Instagram,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  Twitter,
  X,
  Zap,
  // Add other frequently used icons here
} from "lucide-react";

// For less frequently used icons, still import directly to enable tree shaking
export * from "lucide-react";