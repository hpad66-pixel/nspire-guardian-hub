import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  Crosshair,
  Droplets,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GLORIETA_SITE_LAYOUT,
  SITE_MAP_LAYERS,
  countAssetsByKind,
  matchLayoutAsset,
  type SiteMapAsset,
  type SiteMapLayerKey,
  type SiteMapLayout,
} from '@/lib/site-map/glorietaSiteLayout';

export interface SiteMapDbAsset {
  id: string;
  name: string;
  asset_type: string;
  status?: string;
  location_description?: string | null;
}

export interface SiteAssetMapProps {
  layout?: SiteMapLayout;
  /** Live DB assets (matched by drawing code / name) */
  dbAssets?: SiteMapDbAsset[];
  /** Compact hero mode vs full interactive studio */
  variant?: 'hero' | 'full' | 'portal';
  className?: string;
  onSelectAsset?: (asset: SiteMapAsset, db: SiteMapDbAsset | null) => void;
  /** CTA when an inspectable asset is selected */
  inspectAction?: {
    label: string;
    onClick: (asset: SiteMapAsset, db: SiteMapDbAsset | null) => void;
  };
  readOnly?: boolean;
}

const KIND_STYLE: Record<string, { fill: string; ring: string; text: string }> = {
  manhole: { fill: '#1D6FE8', ring: '#93C5FD', text: '#fff' },
  cleanout: { fill: '#C4A35A', ring: '#F5E6C8', text: '#1A1714' },
  retention_pond: { fill: '#0EA5E9', ring: '#7DD3FC', text: '#fff' },
};

export function SiteAssetMap({
  layout = GLORIETA_SITE_LAYOUT,
  dbAssets = [],
  variant = 'full',
  className,
  onSelectAsset,
  inspectAction,
  readOnly = false,
}: SiteAssetMapProps) {
  const counts = useMemo(() => countAssetsByKind(layout), [layout]);
  const [layers, setLayers] = useState<Record<SiteMapLayerKey, boolean>>({
    manhole: true,
    cleanout: true,
    retention_pond: true,
    building: true,
    sewer: true,
  });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [scale, setScale] = useState(variant === 'hero' ? 1.05 : 1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => layout.assets.find((a) => a.code === selectedCode) ?? null,
    [layout.assets, selectedCode],
  );
  const selectedDb = selected ? matchLayoutAsset(selected, dbAssets) : null;

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    setScale((prev) => {
      const next = Math.min(3.2, Math.max(0.55, prev * factor));
      if (cx != null && cy != null && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const px = cx - rect.left - rect.width / 2;
        const py = cy - rect.top - rect.height / 2;
        const k = next / prev;
        setTx((t) => px - (px - t) * k);
        setTy((t) => py - (py - t) * k);
      }
      return next;
    });
  }, []);

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    zoomBy(factor, e.clientX, e.clientY);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-pin]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
    setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const toggleLayer = (key: SiteMapLayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectPin = (asset: SiteMapAsset) => {
    setSelectedCode(asset.code);
    const db = matchLayoutAsset(asset, dbAssets);
    onSelectAsset?.(asset, db);
  };

  const heightClass =
    variant === 'hero'
      ? expanded
        ? 'h-[min(70vh,640px)]'
        : 'h-[320px] md:h-[380px]'
      : variant === 'portal'
        ? 'h-[min(72vh,680px)]'
        : 'h-[min(78vh,720px)]';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[var(--apas-sapphire)]/15',
        'bg-gradient-to-br from-[#0D3B30] via-[#0F4A3C] to-[#1A1714] text-[#FDFCF9]',
        'shadow-[0_20px_60px_-20px_rgba(13,59,48,0.55)]',
        className,
      )}
      data-testid="site-asset-map"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[var(--apas-sapphire)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-[var(--apas-emerald)]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-72 rounded-full bg-[var(--apas-gold,#C4A35A)]/10 blur-3xl" />

      {/* Compact chrome for portal/hero only — full project tab is map-first (no header). */}
      {variant !== 'full' && (
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5 md:py-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                <MapIcon className="h-4 w-4 text-[var(--apas-gold,#C4A35A)]" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--apas-gold,#C4A35A)]">
                  Property command map
                </p>
                <h3 className="font-display text-lg font-bold leading-tight md:text-xl">
                  {layout.title}
                </h3>
              </div>
            </div>
            <p className="pl-10 text-xs text-white/65 md:text-sm">
              {layout.subtitle} · {layout.address}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-400/30 bg-emerald-500/15 font-semibold text-emerald-200">
              {counts.total} inspectable assets
            </Badge>
            <Badge className="border-white/15 bg-white/10 font-medium text-white/80">
              As-built sourced
            </Badge>
            {variant === 'hero' && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <Minimize2 className="mr-1.5 h-3.5 w-3.5" /> : <Maximize2 className="mr-1.5 h-3.5 w-3.5" />}
                {expanded ? 'Compact' : 'Expand'}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={cn('relative grid', variant === 'hero' && !expanded ? 'lg:grid-cols-[1fr]' : 'lg:grid-cols-[220px_1fr]')}>
        {/* Legend / layers */}
        {(variant !== 'hero' || expanded) && (
          <aside className="relative z-10 space-y-4 border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:border-white/10">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">Layers</p>
              <div className="space-y-1.5">
                {SITE_MAP_LAYERS.map((layer) => {
                  const count =
                    layer.key === 'building'
                      ? counts.building
                      : layer.key === 'sewer'
                        ? layout.sewerLines.length
                        : counts[layer.countKey as 'manhole' | 'cleanout' | 'retention_pond'] ?? 0;
                  const on = layers[layer.key];
                  return (
                    <button
                      key={layer.key}
                      type="button"
                      onClick={() => toggleLayer(layer.key)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition',
                        on ? 'bg-white/12 ring-1 ring-white/15' : 'bg-white/5 text-white/45',
                      )}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/30"
                        style={{ background: on ? layer.color : '#64748B' }}
                      />
                      <span className="flex-1 font-medium">{layer.label}</span>
                      <span className="text-xs text-white/50">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">Directions</p>
              <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0D3B30] ring-2 ring-[var(--apas-gold,#C4A35A)]/50">
                  <Compass className="h-6 w-6 text-[var(--apas-gold,#C4A35A)]" />
                  <span className="absolute -top-1 text-[10px] font-bold text-[var(--apas-gold,#C4A35A)]">N</span>
                </div>
                <div className="text-xs leading-relaxed text-white/70">
                  <p className="font-semibold text-white">Alexandria Drive</p>
                  <p>North edge of plan · buildings south of drive</p>
                  <p className="mt-1 text-white/45">{layout.scaleNote}</p>
                </div>
              </div>
            </div>

            {!readOnly && (
              <div className="rounded-xl bg-gradient-to-br from-[var(--apas-sapphire)]/25 to-transparent p-3 ring-1 ring-[var(--apas-sapphire)]/30">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-sky-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tip
                </div>
                <p className="text-xs leading-relaxed text-white/70">
                  Scroll to zoom · drag to pan · tap a pin to inspect. Only assets on the as-builts are seeded — pond included by site confirmation.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* Map viewport */}
        <div className="relative min-w-0">
          <div
            ref={viewportRef}
            className={cn('relative touch-none overflow-hidden', heightClass, 'cursor-grab active:cursor-grabbing')}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: 'center center' }}
            >
              <svg
                viewBox={layout.viewBox}
                className="h-full w-full max-w-none select-none"
                role="img"
                aria-label={`${layout.title} interactive site map`}
              >
                <defs>
                  <linearGradient id="siteGrass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#14532D" />
                    <stop offset="45%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#0F3D2E" />
                  </linearGradient>
                  <linearGradient id="sitePond" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
                    <stop offset="55%" stopColor="#0284C7" />
                    <stop offset="100%" stopColor="#075985" />
                  </linearGradient>
                  <linearGradient id="siteRoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="bldgFace" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.85" />
                  </linearGradient>
                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
                  </filter>
                  <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#C4A35A" floodOpacity="0.55" />
                  </filter>
                  <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                  </pattern>
                </defs>

                {/* Ground */}
                <rect x="0" y="0" width="1200" height="820" fill="url(#siteGrass)" />
                <rect x="0" y="0" width="1200" height="820" fill="url(#hatch)" />

                {/* Soft site boundary */}
                <rect
                  x="40"
                  y="70"
                  width="1120"
                  height="720"
                  rx="28"
                  fill="none"
                  stroke="rgba(253,252,249,0.12)"
                  strokeWidth="2"
                  strokeDasharray="10 8"
                />

                {/* Alexandria Drive */}
                <g>
                  <rect x="60" y={layout.alexandriaY - 28} width="1080" height="56" rx="8" fill="url(#siteRoad)" filter="url(#softShadow)" />
                  <line
                    x1="80"
                    y1={layout.alexandriaY}
                    x2="1120"
                    y2={layout.alexandriaY}
                    stroke="rgba(253,252,249,0.55)"
                    strokeWidth="2"
                    strokeDasharray="18 14"
                  />
                  <text
                    x="600"
                    y={layout.alexandriaY + 5}
                    textAnchor="middle"
                    fill="rgba(253,252,249,0.85)"
                    fontSize="14"
                    fontWeight="700"
                    letterSpacing="0.28em"
                  >
                    ALEXANDRIA DRIVE
                  </text>
                </g>

                {/* Pond */}
                {layers.retention_pond && (
                  <g filter="url(#softShadow)">
                    <path d={layout.pond.d} fill="url(#sitePond)" opacity="0.95" />
                    <path
                      d={layout.pond.d}
                      fill="none"
                      stroke="rgba(186,230,253,0.55)"
                      strokeWidth="3"
                    />
                    <ellipse
                      cx={layout.pond.labelAt.x - 30}
                      cy={layout.pond.labelAt.y - 20}
                      rx="50"
                      ry="18"
                      fill="rgba(255,255,255,0.18)"
                    />
                    <text
                      x={layout.pond.labelAt.x}
                      y={layout.pond.labelAt.y - 4}
                      textAnchor="middle"
                      fill="#F0F9FF"
                      fontSize="15"
                      fontWeight="800"
                    >
                      RETENTION POND
                    </text>
                    <text
                      x={layout.pond.labelAt.x}
                      y={layout.pond.labelAt.y + 16}
                      textAnchor="middle"
                      fill="rgba(224,242,254,0.8)"
                      fontSize="11"
                    >
                      POND-1 · site confirmed
                    </text>
                  </g>
                )}

                {/* Buildings */}
                {layers.building &&
                  layout.buildings.map((b) => (
                    <g key={b.id} filter="url(#softShadow)">
                      <polygon
                        points={b.points}
                        fill="url(#bldgFace)"
                        stroke="#1D6FE8"
                        strokeWidth="2.5"
                      />
                      <text
                        x={b.labelAt.x}
                        y={b.labelAt.y - 4}
                        textAnchor="middle"
                        fill="#0F172A"
                        fontSize="13"
                        fontWeight="800"
                      >
                        {b.label}
                      </text>
                      {b.address && (
                        <text
                          x={b.labelAt.x}
                          y={b.labelAt.y + 14}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="10"
                        >
                          {b.address}
                        </text>
                      )}
                    </g>
                  ))}

                {/* Sewer mains */}
                {layers.sewer &&
                  layout.sewerLines.map((line) => (
                    <g key={line.id}>
                      <path
                        d={line.d}
                        fill="none"
                        stroke="#1D6FE8"
                        strokeWidth="7"
                        strokeLinecap="round"
                        opacity="0.25"
                      />
                      <path
                        d={line.d}
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="2 0"
                      />
                    </g>
                  ))}

                {/* Asset pins */}
                {layout.assets
                  .filter((a) => layers[a.kind as SiteMapLayerKey] !== false)
                  .map((asset) => {
                    const style = KIND_STYLE[asset.kind] ?? KIND_STYLE.manhole;
                    const isSel = selectedCode === asset.code;
                    const r = asset.kind === 'retention_pond' ? 0 : asset.kind === 'manhole' ? 16 : 12;
                    if (asset.kind === 'retention_pond') {
                      // Pond body already drawn; small badge pin
                      return (
                        <g
                          key={asset.code}
                          data-pin
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectPin(asset);
                          }}
                        >
                          <circle
                            cx={asset.x}
                            cy={asset.y + 40}
                            r={isSel ? 18 : 14}
                            fill={style.fill}
                            stroke={isSel ? '#FDFCF9' : style.ring}
                            strokeWidth={isSel ? 3 : 2}
                            filter="url(#pinGlow)"
                          />
                          <text
                            x={asset.x}
                            y={asset.y + 44}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="9"
                            fontWeight="800"
                          >
                            P1
                          </text>
                        </g>
                      );
                    }
                    return (
                      <g
                        key={asset.code}
                        data-pin
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectPin(asset);
                        }}
                        style={{ filter: isSel ? 'url(#pinGlow)' : undefined }}
                      >
                        {isSel && (
                          <circle
                            cx={asset.x}
                            cy={asset.y}
                            r={r + 10}
                            fill="none"
                            stroke="#FDFCF9"
                            strokeWidth="2"
                            opacity="0.7"
                          >
                            <animate attributeName="r" values={`${r + 6};${r + 14};${r + 6}`} dur="1.8s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle
                          cx={asset.x}
                          cy={asset.y}
                          r={r}
                          fill={style.fill}
                          stroke={isSel ? '#FDFCF9' : style.ring}
                          strokeWidth={isSel ? 3 : 2}
                        />
                        <text
                          x={asset.x}
                          y={asset.y + (asset.kind === 'manhole' ? 4 : 3.5)}
                          textAnchor="middle"
                          fill={style.text}
                          fontSize={asset.kind === 'manhole' ? 10 : 9}
                          fontWeight="800"
                        >
                          {asset.kind === 'manhole' ? asset.code.replace('S-', 'S') : asset.code.replace('CO-', '')}
                        </text>
                      </g>
                    );
                  })}

                {/* Scale bar */}
                <g transform="translate(80,760)">
                  <rect x="0" y="0" width="120" height="6" rx="2" fill="rgba(253,252,249,0.85)" />
                  <rect x="0" y="0" width="60" height="6" rx="2" fill="rgba(26,23,20,0.7)" />
                  <text x="60" y="22" textAnchor="middle" fill="rgba(253,252,249,0.7)" fontSize="11">
                    Schematic scale
                  </text>
                </g>
              </svg>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5">
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 bg-white/95 text-foreground shadow-lg"
                onClick={() => zoomBy(1.2)}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 bg-white/95 text-foreground shadow-lg"
                onClick={() => zoomBy(0.8)}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 bg-white/95 text-foreground shadow-lg"
                onClick={resetView}
                aria-label="Reset view"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Floating north chip (hero compact) */}
            {variant === 'hero' && !expanded && (
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <LocateFixed className="h-3.5 w-3.5 text-[var(--apas-gold,#C4A35A)]" />
                N ↑ Alexandria Dr
              </div>
            )}
          </div>

          {/* Selection panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="relative z-20 border-t border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md md:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className="font-bold"
                        style={{
                          background: KIND_STYLE[selected.kind]?.fill,
                          color: KIND_STYLE[selected.kind]?.text,
                        }}
                      >
                        {selected.code}
                      </Badge>
                      <span className="text-sm font-semibold text-white">{selected.label}</span>
                      {selectedDb && (
                        <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                          Wired to inspections
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/65">
                      {[selected.building, selected.detail].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!readOnly && inspectAction && (
                      <Button
                        size="sm"
                        className="bg-[var(--apas-sapphire)] text-white hover:bg-[var(--apas-sapphire)]/90"
                        onClick={() => inspectAction.onClick(selected, selectedDb)}
                      >
                        <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                        {inspectAction.label}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => setSelectedCode(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5 text-[11px] text-white/50 md:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Waves className="h-3 w-3 text-sky-300" /> {counts.manhole} manholes
          </span>
          <span className="inline-flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-[var(--apas-gold,#C4A35A)]" /> {counts.cleanout} cleanouts
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="h-3 w-3 text-sky-400" /> {counts.retention_pond} pond
          </span>
        </div>
        <p className="max-w-xl text-right leading-snug">{layout.sourceNote}</p>
      </div>
    </div>
  );
}

export default SiteAssetMap;
