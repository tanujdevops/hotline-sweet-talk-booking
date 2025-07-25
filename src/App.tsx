
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Simple test components without complex dependencies
const TestIndex = () => (
  <div style={{ padding: "20px" }}>
    <h1>SweetyOnCall</h1>
    <p>Home page working with QueryClient and TooltipProvider</p>
  </div>
);

const TestNotFound = () => (
  <div style={{ padding: "20px" }}>
    <h1>404 - Page Not Found</h1>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  console.log("App with providers rendered");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TestIndex />} />
            <Route path="*" element={<TestNotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
