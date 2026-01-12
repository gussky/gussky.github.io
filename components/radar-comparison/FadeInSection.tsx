import React from "react";
import { useVisibilityObserver } from "./useVisibilityObserver";

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: string; // Optional custom delay
  threshold?: number | number[]; // Optional custom threshold
}

export function FadeInSection({
  children,
  className = "",
  style = {},
  delay,
  threshold,
}: FadeInSectionProps) {
  const [ref, isVisible] = useVisibilityObserver<HTMLDivElement>(
    threshold ? { threshold } : undefined
  );

  const combinedStyle = {
    ...style,
    ...(delay ? { transitionDelay: delay } : {}),
  };

  return (
    <div
      ref={ref}
      className={`fade-in-section ${
        isVisible ? "is-visible" : ""
      } ${className}`}
      style={combinedStyle}
    >
      {children}
    </div>
  );
}
