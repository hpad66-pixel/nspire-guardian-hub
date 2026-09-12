import { useEffect, useState } from 'react';
import './readiness-celebration.css';

export function ReadinessCelebration() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setVisible(false), 3200); return () => window.clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div aria-hidden className="readiness-celebration">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${5 + (i * 37) % 90}%`, animationDelay: `${(i % 6) * .12}s`, background: ['#10b981','#c4a35a','#6ee7b7','#8ddbd3'][i % 4], transform: `rotate(${i * 23}deg)` }} />)}</div>;
}
