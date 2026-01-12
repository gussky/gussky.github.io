import { useRef, useState, useEffect, type MutableRefObject } from 'react';

/**
 * Hook to track element visibility for fade-in/fade-out effects.
 * 
 * @param options IntersectionObserver options
 * @param triggerOnce If true, only triggers visibility once (fade-in only). False allows fade-out (continuous).
 */
export function useVisibilityObserver<T extends Element>(
  options: IntersectionObserverInit = { threshold: [0.1, 0.9] },
  triggerOnce: boolean = false
): [MutableRefObject<T | null>, boolean] {
  const containerRef = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => { 
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      const ratio = entry.intersectionRatio;

      const threshold = options.threshold;
      // If a single number threshold is passed (e.g. 0.2), use that.
      // If an array or undefined is passed, default to our hysteresis logic [0.1, 0.9].

      if (typeof threshold === 'number') {
        if (ratio >= threshold) {
             setIsVisible(true);
             if (triggerOnce) observer.unobserve(container);
        } else {
             if (!triggerOnce) setIsVisible(false);
        }
      } else {
          // Default Hysteresis Logic (assuming [0.1, 0.9] or similar array)
          if (ratio >= 0.9) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.unobserve(container);
            }
          } else if (ratio <= 0.1) {
            if (!triggerOnce) {
              setIsVisible(false);
            }
          }
      }
    }, options);

    observer.observe(container);
    return () => {
      if (container) observer.unobserve(container);
    };
  }, [containerRef, options, triggerOnce]);

  return [containerRef, isVisible];
}
