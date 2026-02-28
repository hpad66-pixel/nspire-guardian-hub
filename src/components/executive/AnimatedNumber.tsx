import { useState, useEffect } from "react";

interface AnimatedNumberProps {
  value: number | string;
  suffix?: string;
  duration?: number;
}

export function AnimatedNumber({ value, suffix = "", duration = 1200 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number | string>(typeof value === "string" ? value : 0);

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplay(value);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <span className="stat-number">{display}{suffix}</span>;
}
