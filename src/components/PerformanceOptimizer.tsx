import { lazy, Suspense, memo, useState, useEffect, useRef } from 'react';

// Optimized loading component for smaller sections
const SectionLoader = memo(() => (
  <div className="animate-pulse p-8">
    <div className="h-8 bg-secondary rounded w-64 mb-4"></div>
    <div className="h-4 bg-secondary rounded w-96 mb-2"></div>
    <div className="h-4 bg-secondary rounded w-80"></div>
  </div>
));

// Enhanced intersection observer based lazy loading
export const LazySection = memo(({ 
  children, 
  fallback = <SectionLoader />,
  rootMargin = "200px",
  threshold = 0.01
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
});

// Pre-optimized component imports with better chunking
export const OptimizedHero = lazy(() => 
  import('@/components/Hero').then(module => ({ default: memo(module.default) }))
);

export const OptimizedPricingCards = lazy(() => 
  import('@/components/PricingCards').then(module => ({ default: memo(module.default) }))
);

export const OptimizedBookingForm = lazy(() => 
  import('@/components/BookingForm').then(module => ({ default: memo(module.default) }))
);

export const OptimizedTestimonials = lazy(() => 
  import('@/components/Testimonials').then(module => ({ default: memo(module.default) }))
);

export const OptimizedFAQ = lazy(() => 
  import('@/components/FAQ').then(module => ({ default: memo(module.default) }))
);

export const OptimizedFooter = lazy(() => 
  import('@/components/Footer').then(module => ({ default: memo(module.default) }))
);