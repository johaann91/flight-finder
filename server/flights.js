// Logique pure (sans I/O) : génération déterministe de vols simulés,
// validation des recherches, filtres/tri et calendrier des prix.
// Tout est calculé à partir d'une graine (trajet + date) : une même recherche
// renvoie toujours les mêmes vols, ce qui rend le calendrier cohérent avec
// les résultats et le code facilement testable.

import { AIRPORTS, AIRLINES } from "./catalog.js";

export const MAX_PASSENGERS = 9;
export const MAX_DAYS_AHEAD = 330;

const airportMap = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function getAirport(code) {
  return airportMap.get(String(code || "").toUpperCase());
}

export function searchAirports(query, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return AIRPORTS.slice(0, limit);
  return AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
  ).slice(0, limit);
}

// ---------- Utilitaires (PRNG, distance, dates) ----------

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDateString(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function daysBetween(fromStr, toStr) {
  const a = new Date(`${fromStr}T00:00:00Z`).getTime();
  const b = new Date(`${toStr}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toLocalIso(dateStr, minutesFromMidnight) {
  const dayOffset = Math.floor(minutesFromMidnight / 1440);
  const m = minutesFromMidnight % 1440;
  const day = dayOffset ? addDays(dateStr, dayOffset) : dateStr;
  return `${day}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// ---------- Validation ----------

export function validateSearch(params, today = todayString()) {
  const errors = [];
  const from = String(params?.from || "").toUpperCase();
  const to = String(params?.to || "").toUpperCase();
  const date = params?.date;
  const returnDate = params?.returnDate || null;
  const passengers = Number(params?.passengers ?? 1);

  if (!getAirport(from)) errors.push("Aéroport de départ inconnu.");
  if (!getAirport(to)) errors.push("Aéroport d'arrivée inconnu.");
  if (from && from === to) errors.push("Le départ et l'arrivée doivent être différents.");

  if (!isValidDateString(date)) {
    errors.push("Date de départ invalide (format AAAA-MM-JJ).");
  } else {
    const ahead = daysBetween(today, date);
    if (ahead < 0) errors.push("La date de départ ne peut pas être dans le passé.");
    if (ahead > MAX_DAYS_AHEAD) errors.push(`Les vols sont réservables jusqu'à ${MAX_DAYS_AHEAD} jours à l'avance.`);
  }

  if (returnDate) {
    if (!isValidDateString(returnDate)) {
      errors.push("Date de retour invalide (format AAAA-MM-JJ).");
    } else if (isValidDateString(date) && daysBetween(date, returnDate) < 0) {
      errors.push("Le retour ne peut pas précéder le départ.");
    } else if (daysBetween(today, returnDate) > MAX_DAYS_AHEAD) {
      errors.push(`Les vols sont réservables jusqu'à ${MAX_DAYS_AHEAD} jours à l'avance.`);
    }
  }

  if (!Number.isInteger(passengers) || passengers < 1 || passengers > MAX_PASSENGERS) {
    errors.push(`Le nombre de passagers doit être compris entre 1 et ${MAX_PASSENGERS}.`);
  }

  if (errors.length > 0) return { errors, clean: null };
  return { errors: [], clean: { from, to, date, returnDate, passengers } };
}

// ---------- Génération de vols ----------

function dateFactor(daysAhead, dateStr) {
  let f = 1;
  if (daysAhead < 7) f *= 1.5;
  else if (daysAhead < 14) f *= 1.3;
  else if (daysAhead < 30) f *= 1.1;
  else if (daysAhead >= 60) f *= 0.95;

  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = dimanche
  if (dow === 5 || dow === 0) f *= 1.08;

  const month = d.getUTCMonth() + 1;
  if (month === 7 || month === 8 || month === 12) f *= 1.2;
  return f;
}

function pickStops(rng, km, isLow) {
  if (isLow) return 0;
  const r = rng();
  if (km < 1500) return r < 0.9 ? 0 : 1;
  if (km < 5000) return r < 0.6 ? 0 : 1;
  if (r < 0.25) return 0;
  return r < 0.85 ? 1 : 2;
}

export function generateFlights({ from, to, date, today = todayString() }) {
  const a = getAirport(from);
  const b = getAirport(to);
  const km = distanceKm(a, b);
  const rng = mulberry32(hashString(`${a.iata}-${b.iata}-${date}`));

  const eligible = AIRLINES.filter((al) => {
    if (al.type === "low") return km <= 3000;
    return km >= (al.minKm || 0);
  });

  const daysAhead = Math.max(0, daysBetween(today, date));
  const count = 8 + Math.floor(rng() * 6);
  const flights = [];

  for (let i = 0; i < count; i += 1) {
    const airline = eligible[Math.floor(rng() * eligible.length)];
    const stops = pickStops(rng, km, airline.type === "low");
    const depMinutes = 6 * 60 + Math.floor((rng() * 16 * 60) / 5) * 5;

    const cruise = km > 3000 ? 850 : 760;
    let durationMin = Math.round((km / cruise) * 60 + 35);
    let stopCity = null;
    if (stops > 0) {
      durationMin += stops * (70 + Math.floor(rng() * 90));
      const hubs = ["Francfort", "Amsterdam", "Istanbul", "Madrid", "Zurich", "Doha", "Dubaï", "Lisbonne"];
      stopCity = hubs[Math.floor(rng() * hubs.length)];
    }

    let price = 45 + km * (km > 4000 ? 0.07 : 0.095);
    price *= airline.factor;
    price *= stops === 0 ? 1 : 0.88 ** stops;
    if (depMinutes < 450 || depMinutes > 21 * 60) price *= 0.9;
    else if (depMinutes >= 17 * 60 && depMinutes <= 19 * 60) price *= 1.08;
    price *= dateFactor(daysAhead, date);
    price *= 0.9 + rng() * 0.25;
    price = Math.max(19, Math.round(price));

    flights.push({
      id: `${airline.code}${100 + Math.floor(rng() * 900)}-${a.iata}${b.iata}-${date}-${i}`,
      airline: { code: airline.code, name: airline.name },
      flightNumber: `${airline.code}${100 + Math.floor(rng() * 8900)}`,
      from: a.iata,
      to: b.iata,
      departure: toLocalIso(date, depMinutes),
      arrival: toLocalIso(date, depMinutes + durationMin),
      durationMin,
      stops,
      stopCity,
      distanceKm: km,
      pricePerPassenger: price,
    });
  }

  return flights.sort((x, y) => x.departure.localeCompare(y.departure));
}

// ---------- Filtres / tri ----------

export function filterAndSort(flights, options = {}) {
  const { maxStops, airlines, maxPrice, departAfter, departBefore, sort = "price" } = options;
  let result = flights.filter((f) => {
    if (maxStops !== undefined && maxStops !== null && f.stops > maxStops) return false;
    if (Array.isArray(airlines) && airlines.length > 0 && !airlines.includes(f.airline.code)) return false;
    if (maxPrice !== undefined && maxPrice !== null && f.pricePerPassenger > maxPrice) return false;
    const hour = Number(f.departure.slice(11, 13));
    if (departAfter !== undefined && departAfter !== null && hour < departAfter) return false;
    if (departBefore !== undefined && departBefore !== null && hour >= departBefore) return false;
    return true;
  });

  const sorters = {
    price: (x, y) => x.pricePerPassenger - y.pricePerPassenger,
    duration: (x, y) => x.durationMin - y.durationMin,
    departure: (x, y) => x.departure.localeCompare(y.departure),
    // "meilleur" : un compromis prix + 15 € par heure de trajet
    best: (x, y) =>
      x.pricePerPassenger + (x.durationMin / 60) * 15 - (y.pricePerPassenger + (y.durationMin / 60) * 15),
  };
  result = [...result].sort(sorters[sort] || sorters.price);
  return result;
}

export function cheapest(flights) {
  if (flights.length === 0) return null;
  return flights.reduce((min, f) => (f.pricePerPassenger < min.pricePerPassenger ? f : min));
}

// ---------- Calendrier des prix ----------

export function monthCalendar({ from, to, month, today = todayString() }) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) return null;
  const first = `${month}-01`;
  if (!isValidDateString(first)) return null;

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = `${month}-${pad(d)}`;
    const ahead = daysBetween(today, date);
    if (ahead < 0 || ahead > MAX_DAYS_AHEAD) {
      days.push({ date, price: null });
      continue;
    }
    const best = cheapest(generateFlights({ from, to, date, today }));
    days.push({ date, price: best ? best.pricePerPassenger : null });
  }
  return days;
}
