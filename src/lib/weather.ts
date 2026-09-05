/**
 * Real weather, on your paper.
 *
 * Open-Meteo needs no key and sends `Access-Control-Allow-Origin: *`, which is
 * the only reason this works with no backend — most weather APIs won't talk to
 * a browser at all. Verified against the live endpoint, not just the docs.
 *
 * Nothing here touches the document: the sky is cached in its own localStorage
 * key so weather never ends up in your undo history.
 */
import type { Place } from './types';

export type Sky = 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog';

export interface Weather {
  sky: Sky;
  /** °C, as reported */
  temp: number;
  day: boolean;
  place: string;
  /** when we asked, ms since epoch */
  at: number;
}

const CACHE_KEY = 'nook.weather.v1';
/** Weather does not change fast enough to justify asking more often. */
const FRESH_MS = 20 * 60 * 1000;

/**
 * WMO weather codes, collapsed to the six things we can actually draw.
 * https://open-meteo.com/en/docs — codes are grouped in tens.
 */
export function skyFromCode(code: number): Sky {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloud';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';   // drizzle and rain, incl. freezing
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';   // showers
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'cloud';
}

export const SKY_LABEL: Record<Sky, string> = {
  clear: 'Clear',
  cloud: 'Cloudy',
  rain: 'Raining',
  snow: 'Snowing',
  storm: 'Storming',
  fog: 'Foggy',
};

export function readCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw) as Weather;
    return typeof w?.at === 'number' ? w : null;
  } catch {
    return null;
  }
}

function writeCache(w: Weather) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(w));
  } catch {
    /* a full disk shouldn't break the weather */
  }
}

export function isFresh(w: Weather | null, place: Place | null): boolean {
  if (!w || !place) return false;
  return w.place === place.label && Date.now() - w.at < FRESH_MS;
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${place.lat.toFixed(3)}&longitude=${place.lon.toFixed(3)}`
    + '&current=temperature_2m,weather_code,is_day';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service said ${res.status}`);
  const json = await res.json() as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
  };
  const cur = json.current;
  if (!cur || typeof cur.weather_code !== 'number') throw new Error('No weather came back');
  const w: Weather = {
    sky: skyFromCode(cur.weather_code),
    temp: Math.round(cur.temperature_2m ?? 0),
    day: cur.is_day !== 0,
    place: place.label,
    at: Date.now(),
  };
  writeCache(w);
  return w;
}

/** Look a town up by name. Coarse on purpose — we only want a rough spot. */
export async function findPlace(name: string): Promise<Place | null> {
  const url = 'https://geocoding-api.open-meteo.com/v1/search'
    + `?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json() as {
    results?: { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }[];
  };
  const hit = json.results?.[0];
  if (!hit) return null;
  const bits = [hit.name, hit.admin1, hit.country_code].filter(Boolean);
  return { lat: hit.latitude, lon: hit.longitude, label: bits.join(', ') };
}

/**
 * Ask the browser where we are. Rounded to two decimals before it's stored —
 * about a kilometre, which is all the weather needs and much less than your
 * street.
 */
export function locate(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser won’t share a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Math.round(pos.coords.latitude * 100) / 100,
        lon: Math.round(pos.coords.longitude * 100) / 100,
        label: 'Where you are',
      }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? 'Location was blocked — you can type a town instead.'
          : 'Couldn’t work out where you are.',
      )),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}
