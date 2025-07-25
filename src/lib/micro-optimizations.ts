// Micro-optimizations to reduce main thread work and parsing time

// Reduce React overhead with optimized imports
export const optimizeReactImports = () => {
  // Use production React build detection
  if (typeof window !== 'undefined' && 'React' in window) {
    // React is already loaded globally, avoid duplicate parsing
    return true;
  }
  return false;
};

// Defer non-critical JavaScript execution
export const deferNonCritical = (callback: () => void, priority: 'high' | 'normal' | 'low' = 'normal') => {
  const delay = priority === 'high' ? 0 : priority === 'normal' ? 16 : 100;
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: delay + 1000 });
  } else {
    setTimeout(callback, delay);
  }
};

// Optimize component rendering with batched updates
export const batchComponentUpdates = (updates: (() => void)[]) => {
  if ('scheduler' in window && 'unstable_batchedUpdates' in (window as any).scheduler) {
    (window as any).scheduler.unstable_batchedUpdates(() => {
      updates.forEach(update => update());
    });
  } else {
    // Fallback: execute immediately
    updates.forEach(update => update());
  }
};

// Reduce memory pressure with object pooling for frequently created objects
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 5) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    if (this.pool.length < 10) { // Max pool size
      this.pool.push(obj);
    }
  }
}

// Export utility
export const createObjectPool = <T>(createFn: () => T, resetFn: (obj: T) => void) => 
  new ObjectPool(createFn, resetFn);

// Preload critical modules to reduce parse time
export const preloadCriticalModules = () => {
  const criticalModules = [
    // Most frequently used components
    () => import('@/components/ui/button'),
    () => import('@/components/ui/input'),
    () => import('@/hooks/use-mobile'),
  ];

  // Preload after initial render
  deferNonCritical(() => {
    criticalModules.forEach(moduleLoader => {
      moduleLoader().catch(() => {
        // Silent fail for preloading
      });
    });
  }, 'low');
};