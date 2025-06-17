import React from 'react';

// Animated Counter component
export const Counter: React.FC<{
  from: number;
  to: number;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
  fontSize?: string | number;
  color?: string;
  fontWeight?: string | number;
}> = ({ from, to, delay = 0, duration = 1000, style, className, fontSize, color, fontWeight }) => {
  const [value, setValue] = React.useState(from);
  React.useEffect(() => {
    let raf: number;
    let start: number | null = null;
    let timeout: NodeJS.Timeout;
    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(from + (to - from) * progress);
      setValue(current);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    timeout = setTimeout(() => {
      raf = requestAnimationFrame(animate);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [from, to, delay, duration]);
  return (
    <span
      className={className}
      style={{ fontSize, color, fontWeight, ...style }}
    >
      {value}
    </span>
  );
};