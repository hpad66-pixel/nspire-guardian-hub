import type { GeoFix } from './types';

const GEO_TIMEOUT_MS = 12_000;

/**
 * Live GPS fix for Field Camera. Never throws — returns null when denied / unavailable.
 * Optional reverse-geocode via OpenStreetMap Nominatim (best-effort, offline-safe).
 */
export async function getGeoFix(opts?: { reverseGeocode?: boolean }): Promise<GeoFix | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  let position: GeolocationPosition;
  try {
    position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 30_000,
      });
    });
  } catch {
    return null;
  }

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const fix: GeoFix = {
    lat,
    lng,
    accuracy: position.coords.accuracy,
    address: null,
    capturedAt: new Date().toISOString(),
  };

  if (opts?.reverseGeocode !== false) {
    fix.address = await reverseGeocode(lat, lng);
  }
  return fix;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=0`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        // Nominatim usage policy asks for a valid User-Agent identifying the app.
        'User-Agent': 'projOS-FieldCamera/1.0 (https://projos.ai)',
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    const name = data.display_name?.trim();
    if (!name) return null;
    // Keep stamp readable — first 3 comma segments
    return name.split(',').slice(0, 3).map((s) => s.trim()).join(', ');
  } catch {
    return null;
  }
}
