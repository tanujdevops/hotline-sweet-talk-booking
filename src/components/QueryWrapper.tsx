import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Create query client with optimal caching settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

interface QueryWrapperProps {
  children: ReactNode;
}

const QueryWrapper = ({ children }: QueryWrapperProps) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

export default QueryWrapper;