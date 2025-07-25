
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import CriticalCSS from "@/components/CriticalCSS";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const WaitingPage = lazy(() => import("./pages/WaitingPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized loading component with skeleton
const Loading = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-secondary rounded w-64 mb-4"></div>
        <div className="h-4 bg-secondary rounded w-96 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-4 bg-secondary rounded"></div>
            <div className="h-4 bg-secondary rounded w-5/6"></div>
            <div className="h-4 bg-secondary rounded w-4/6"></div>
          </div>
          <div className="h-64 bg-secondary rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

// Optimized query client for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Reduce network requests during initial load
      refetchOnMount: false,
      // Disable background refetching during initial load
      refetchOnReconnect: false,
      // Use structural sharing for better performance
      structuralSharing: true,
    },
    mutations: {
      // Optimize mutation retries
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Critical CSS for LCP optimization */}
      <CriticalCSS />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/waiting" element={<WaitingPage />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund" element={<RefundPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
