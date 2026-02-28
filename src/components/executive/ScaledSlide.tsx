import { useState, useEffect, useRef, type ReactNode } from "react";

interface ScaledSlideProps {
  children: ReactNode;
}

/**
 * Renders children at a fixed 1920×1080 canvas, then scales
 * the entire thing to fit the parent container.
 * This makes all px values inside slides behave as "presentation pixels."
 */
export function ScaledSlide({ children }: ScaledSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const sx = width / 1920;
      const sy = height / 1080;
      setScale(Math.min(sx, sy));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <div
        className="absolute"
        style={{
          width: 1920,
          height: 1080,
          left: "50%",
          top: "50%",
          marginLeft: -960,
          marginTop: -540,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
