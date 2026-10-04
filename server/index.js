import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  searchAirports,
  validateSearch,
  generateFlights,
  filterAndSort,
  cheapest,
  monthCalendar,
  getAirport,
  todayString,
  MAX_DAYS_AHEAD,
  daysBetween,
} from "./flights.js";
import { validateFavorite, buildFavorite, evaluateFavorite, MAX_FAVORITES } from "./favorites.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "favorites.json");

// Le port 5000 est souvent occupé sur macOS par le récepteur AirPlay
// (Centre de contrôle) : on utilise un port moins courant par défaut.
const PORT = process.env.PORT || 5070;

const app = express();
app.use(cors());
app.use(express.json());

async function readFavorites() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { favorites: [] };
  }
}

async function writeFavorites(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function optionalNumber(value) {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildLeg({ from, to, date }, filters, today) {
  const all = generateFlights({ from, to, date, today });
  const airlines = [...new Map(all.map((f) => [f.airline.code, f.airline.name]))]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const best = cheapest(all);
  return {
    from,
    to,
    date,
    totalCount: all.length,
    cheapestPrice: best ? best.pricePerPassenger : null,
    airlines,
    flights: filterAndSort(all, filters),
  };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/airports", (req, res) => {
  res.json(searchAirports(req.query.q));
});

app.get("/api/flights/search", (req, res) => {
  const today = todayString();
  const { errors, clean } = validateSearch(req.query, today);
  if (errors.length > 0) return res.status(400).json({ errors });

  const filters = {
    maxStops: optionalNumber(req.query.maxStops),
    maxPrice: optionalNumber(req.query.maxPrice),
    departAfter: optionalNumber(req.query.departAfter),
    departBefore: optionalNumber(req.query.departBefore),
    airlines: req.query.airlines ? String(req.query.airlines).split(",").filter(Boolean) : [],
    sort: req.query.sort || "price",
  };

  const outbound = buildLeg({ from: clean.from, to: clean.to, date: clean.date }, filters, today);
  const inbound = clean.returnDate
    ? buildLeg({ from: clean.to, to: clean.from, date: clean.returnDate }, filters, today)
    : null;

  res.json({
    query: clean,
    from: getAirport(clean.from),
    to: getAirport(clean.to),
    outbound,
    inbound,
  });
});

app.get("/api/flights/calendar", (req, res) => {
  const today = todayString();
  const from = String(req.query.from || "").toUpperCase();
  const to = String(req.query.to || "").toUpperCase();
  if (!getAirport(from) || !getAirport(to) || from === to) {
    return res.status(400).json({ errors: ["Trajet invalide."] });
  }
  const days = monthCalendar({ from, to, month: req.query.month, today });
  if (!days) return res.status(400).json({ errors: ["Mois invalide (format AAAA-MM)."] });
  res.json({ from, to, month: req.query.month, maxDaysAhead: MAX_DAYS_AHEAD, days });
});

app.get("/api/favorites", async (req, res) => {
  const today = todayString();
  const { favorites } = await readFavorites();
  res.json(
    favorites
      .map((f) => evaluateFavorite(f, today))
      .sort((a, b) => a.date.localeCompare(b.date))
  );
});

app.post("/api/favorites", async (req, res) => {
  const today = todayString();
  const { errors, clean } = validateFavorite(req.body, today);
  if (errors.length > 0) return res.status(400).json({ errors });

  const data = await readFavorites();
  if (data.favorites.length >= MAX_FAVORITES) {
    return res.status(400).json({ errors: [`Limite de ${MAX_FAVORITES} favoris atteinte.`] });
  }
  const duplicate = data.favorites.find(
    (f) =>
      f.from === clean.from &&
      f.to === clean.to &&
      f.date === clean.date &&
      (f.returnDate || null) === (clean.returnDate || null) &&
      f.passengers === clean.passengers
  );
  if (duplicate) {
    return res.status(409).json({ errors: ["Ce trajet est déjà dans vos favoris."] });
  }

  const favorite = buildFavorite(clean);
  data.favorites.push(favorite);
  await writeFavorites(data);
  res.status(201).json(evaluateFavorite(favorite, today));
});

app.delete("/api/favorites/:id", async (req, res) => {
  const data = await readFavorites();
  const before = data.favorites.length;
  data.favorites = data.favorites.filter((f) => f.id !== req.params.id);
  if (data.favorites.length === before) {
    return res.status(404).json({ errors: ["Favori introuvable."] });
  }
  await writeFavorites(data);
  res.status(204).end();
});

// Erreurs JSON malformées, etc.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ errors: ["JSON invalide."] });
  }
  console.error(err);
  res.status(500).json({ errors: ["Erreur interne du serveur."] });
});

app.listen(PORT, () => {
  console.log(`API de recherche de vols disponible sur http://localhost:${PORT}`);
});
