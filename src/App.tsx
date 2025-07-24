
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Loading from "@/components/Loading";
import CriticalResourceLoader from "@/components/CriticalResourceLoader";
import QueryWrapper from "@/components/QueryWrapper";

// Lazy-loaded components for better code splitting and performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const WaitingPage = lazy(() => import("./pages/WaitingPage"));

const App = () => (
  <>
    <CriticalResourceLoader />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <QueryWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/waiting" element={<WaitingPage />} />
              <Route path="/booking-confirmation" element={<BookingConfirmation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </QueryWrapper>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </>
);

export default App;
