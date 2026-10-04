// Logique pure des favoris / alertes de prix (sans I/O).
import { randomUUID } from "node:crypto";
import { validateSearch, generateFlights, cheapest, daysBetween, todayString } from "./flights.js";

export const MAX_FAVORITES = 30;

export function validateFavorite(body, today = todayString()) {
  const { errors, clean } = validateSearch(body, today);
  if (errors.length > 0) return { errors, clean: null };

  let targetPrice = null;
  if (body.targetPrice !== undefined && body.targetPrice !== null && body.targetPrice !== "") {
    const t = Number(body.targetPrice);
    if (!Number.isFinite(t) || t <= 0) {
      return { errors: ["Le prix cible doit être un nombre positif."], clean: null };
    }
    targetPrice = Math.round(t);
  }
  return { errors: [], clean: { ...clean, targetPrice } };
}

export function buildFavorite(clean) {
  return { id: randomUUID(), ...clean, createdAt: new Date().toISOString() };
}

// Prix total le plus bas aujourd'hui pour le trajet sauvegardé (tous passagers).
export function evaluateFavorite(fav, today = todayString()) {
  if (daysBetween(today, fav.date) < 0) {
    return { ...fav, expired: true, lowestTotal: null, triggered: false };
  }
  const out = cheapest(generateFlights({ from: fav.from, to: fav.to, date: fav.date, today }));
  let perPassenger = out ? out.pricePerPassenger : 0;
  if (fav.returnDate && daysBetween(today, fav.returnDate) >= 0) {
    const back = cheapest(generateFlights({ from: fav.to, to: fav.from, date: fav.returnDate, today }));
    perPassenger += back ? back.pricePerPassenger : 0;
  }
  const lowestTotal = perPassenger * fav.passengers;
  const triggered = fav.targetPrice !== null && fav.targetPrice !== undefined && lowestTotal <= fav.targetPrice;
  return { ...fav, expired: false, lowestTotal, triggered };
}
