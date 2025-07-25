// Performance utilities to reduce main thread work

// Debounce function for heavy operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for scroll/resize events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Idle callback for non-critical work
export function scheduleIdleWork(work: () => void, timeout = 5000) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(work, { timeout });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(work, 16);
  }
}

// Chunk large arrays to prevent main thread blocking
export function processInChunks<T>(
  array: T[],
  processor: (item: T) => void,
  chunkSize = 50,
  delay = 10
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    
    function processChunk() {
      const chunk = array.slice(index, index + chunkSize);
      chunk.forEach(processor);
      index += chunkSize;
      
      if (index < array.length) {
        setTimeout(processChunk, delay);
      } else {
        resolve();
      }
    }
    
    processChunk();
  });
}

// Optimize image loading
export function preloadCriticalImages(urls: string[]): Promise<void[]> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
  });
  
  return Promise.allSettled(promises) as Promise<void[]>;
}

// Memory-efficient observer for lazy loading
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}