import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSearch,
  generateFlights,
  filterAndSort,
  cheapest,
  monthCalendar,
  distanceKm,
  getAirport,
  searchAirports,
  daysBetween,
  addDays,
  MAX_DAYS_AHEAD,
} from "../flights.js";
import { validateFavorite, evaluateFavorite } from "../favorites.js";

const TODAY = "2026-10-04";
const DATE = "2026-11-20";

test("distanceKm Paris-New York est cohérente", () => {
  const km = distanceKm(getAirport("CDG"), getAirport("JFK"));
  assert.ok(km > 5700 && km < 5900, `distance inattendue : ${km}`);
});

test("validateSearch accepte une recherche valide", () => {
  const { errors, clean } = validateSearch({ from: "cdg", to: "jfk", date: DATE, passengers: "2" }, TODAY);
  assert.deepEqual(errors, []);
  assert.equal(clean.from, "CDG");
  assert.equal(clean.passengers, 2);
});

test("validateSearch rejette aéroports identiques, passé, retour avant départ, passagers", () => {
  assert.ok(validateSearch({ from: "CDG", to: "CDG", date: DATE }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: "2026-09-01" }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: DATE, returnDate: "2026-11-10" }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: DATE, passengers: 0 }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: DATE, passengers: 10 }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "XXX", to: "LHR", date: DATE }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: "2026-02-31" }, TODAY).errors.length > 0);
  assert.ok(validateSearch({ from: "CDG", to: "LHR", date: addDays(TODAY, MAX_DAYS_AHEAD + 1) }, TODAY).errors.length > 0);
});

test("generateFlights est déterministe", () => {
  const a = generateFlights({ from: "CDG", to: "JFK", date: DATE, today: TODAY });
  const b = generateFlights({ from: "CDG", to: "JFK", date: DATE, today: TODAY });
  assert.deepEqual(a, b);
  assert.ok(a.length >= 8);
});

test("les vols générés sont cohérents", () => {
  for (const [from, to] of [["CDG", "LHR"], ["CDG", "JFK"], ["ORY", "BCN"], ["CDG", "NRT"]]) {
    for (const f of generateFlights({ from, to, date: DATE, today: TODAY })) {
      assert.equal(f.from, from);
      assert.equal(f.to, to);
      assert.ok(f.pricePerPassenger >= 19);
      assert.ok(f.durationMin > 30);
      assert.ok(f.arrival > f.departure);
      assert.ok(f.stops >= 0 && f.stops <= 2);
    }
  }
});

test("pas de low-cost sur le long-courrier, pas de compagnie long-courrier sur trajet court", () => {
  const lowCost = ["U2", "FR", "TO", "VY"];
  const longHaul = generateFlights({ from: "CDG", to: "JFK", date: DATE, today: TODAY });
  assert.ok(longHaul.every((f) => !lowCost.includes(f.airline.code)));
  const short = generateFlights({ from: "CDG", to: "LHR", date: DATE, today: TODAY });
  assert.ok(short.every((f) => !["EK", "QR", "DL", "AC"].includes(f.airline.code)));
});

test("filterAndSort : tri par prix et par durée", () => {
  const flights = generateFlights({ from: "CDG", to: "JFK", date: DATE, today: TODAY });
  const byPrice = filterAndSort(flights, { sort: "price" });
  for (let i = 1; i < byPrice.length; i += 1) {
    assert.ok(byPrice[i - 1].pricePerPassenger <= byPrice[i].pricePerPassenger);
  }
  const byDuration = filterAndSort(flights, { sort: "duration" });
  for (let i = 1; i < byDuration.length; i += 1) {
    assert.ok(byDuration[i - 1].durationMin <= byDuration[i].durationMin);
  }
});

test("filterAndSort : escales, compagnie, prix max, horaires", () => {
  const flights = generateFlights({ from: "CDG", to: "JFK", date: DATE, today: TODAY });
  assert.ok(filterAndSort(flights, { maxStops: 0 }).every((f) => f.stops === 0));
  const code = flights[0].airline.code;
  assert.ok(filterAndSort(flights, { airlines: [code] }).every((f) => f.airline.code === code));
  const max = cheapest(flights).pricePerPassenger + 50;
  assert.ok(filterAndSort(flights, { maxPrice: max }).every((f) => f.pricePerPassenger <= max));
  assert.ok(
    filterAndSort(flights, { departAfter: 12 }).every((f) => Number(f.departure.slice(11, 13)) >= 12)
  );
  assert.equal(filterAndSort(flights, { maxPrice: 1 }).length, 0);
});

test("monthCalendar : cohérent avec la recherche et null dans le passé", () => {
  const cal = monthCalendar({ from: "CDG", to: "LHR", month: "2026-10", today: TODAY });
  assert.equal(cal.length, 31);
  assert.equal(cal[0].price, null); // 1er octobre : passé
  const day = cal.find((d) => d.date === "2026-10-20");
  const expected = cheapest(generateFlights({ from: "CDG", to: "LHR", date: "2026-10-20", today: TODAY }));
  assert.equal(day.price, expected.pricePerPassenger);
  assert.equal(monthCalendar({ from: "CDG", to: "LHR", month: "pas-un-mois", today: TODAY }), null);
});

test("réserver tôt coûte en moyenne moins cher que réserver au dernier moment", () => {
  const avg = (date) => {
    const f = generateFlights({ from: "CDG", to: "FCO", date, today: TODAY });
    return f.reduce((s, x) => s + x.pricePerPassenger, 0) / f.length;
  };
  assert.ok(avg("2027-02-10") < avg(addDays(TODAY, 3)));
});

test("searchAirports trouve par ville ou code IATA", () => {
  assert.ok(searchAirports("paris").some((a) => a.iata === "CDG"));
  assert.ok(searchAirports("jfk").some((a) => a.city === "New York"));
  assert.equal(searchAirports("zzzzzz").length, 0);
});

test("daysBetween / addDays", () => {
  assert.equal(daysBetween("2026-10-04", "2026-10-14"), 10);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("favoris : validation du prix cible et évaluation d'alerte", () => {
  assert.ok(
    validateFavorite({ from: "CDG", to: "LHR", date: DATE, passengers: 1, targetPrice: -5 }, TODAY).errors.length > 0
  );
  const { clean } = validateFavorite({ from: "CDG", to: "LHR", date: DATE, passengers: 2, targetPrice: 100000 }, TODAY);
  const ev = evaluateFavorite({ id: "x", ...clean }, TODAY);
  assert.equal(ev.triggered, true);
  assert.ok(ev.lowestTotal > 0);

  const { clean: cheap } = validateFavorite({ from: "CDG", to: "LHR", date: DATE, passengers: 1, targetPrice: 1 }, TODAY);
  assert.equal(evaluateFavorite({ id: "y", ...cheap }, TODAY).triggered, false);

  const expired = evaluateFavorite({ id: "z", from: "CDG", to: "LHR", date: "2026-09-01", passengers: 1, targetPrice: null }, TODAY);
  assert.equal(expired.expired, true);
});
