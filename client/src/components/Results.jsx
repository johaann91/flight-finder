import Filters from "./Filters.jsx";
import { DEFAULT_FILTERS } from "../filters.js";
import FlightCard from "./FlightCard.jsx";
import { formatDateLong, formatPrice } from "../utils.js";

const SORTS = [
  { id: "price", label: "Prix" },
  { id: "duration", label: "Durée" },
  { id: "departure", label: "Départ" },
  { id: "best", label: "Meilleur compromis" },
];

export default function Results({ result, filters, onFiltersChange, selection, onSelect, activeLeg, setActiveLeg }) {
  const { query, outbound, inbound } = result;
  const leg = activeLeg === "in" && inbound ? inbound : outbound;
  const legKey = leg === inbound ? "in" : "out";
  const selected = selection[legKey];

  const airlineMap = new Map();
  [outbound, inbound].filter(Boolean).forEach((l) => l.airlines.forEach((a) => airlineMap.set(a.code, a)));
  const airlines = [...airlineMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  function renderTab(key, l, title) {
    const picked = selection[key];
    return (
      <button
        key={key}
        type="button"
        className={`leg-tab ${legKey === key ? "active" : ""}`}
        onClick={() => setActiveLeg(key)}
      >
        <small>{title}</small>
        <strong>
          {l.from} → {l.to}
        </strong>
        <span>{formatDateLong(l.date)}</span>
        <span className={picked ? "picked" : ""}>
          {picked
            ? `${picked.airline.name} · ${formatPrice(picked.pricePerPassenger)}`
            : l.cheapestPrice !== null
              ? `dès ${formatPrice(l.cheapestPrice)}`
              : "Aucun vol"}
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="leg-tabs">
        {renderTab("out", outbound, "Vol aller")}
        {inbound && renderTab("in", inbound, "Vol retour")}
      </div>

      <div className="results-layout">
        <Filters filters={filters} onChange={onFiltersChange} airlines={airlines} />
        <div>
          <div className="sort-bar">
            <span className="count">
              {leg.flights.length} vol{leg.flights.length > 1 ? "s" : ""} sur {leg.totalCount}
              {query.passengers > 1 ? ` · prix par passager (${query.passengers} voyageurs)` : ""}
            </span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip ${filters.sort === s.id ? "active" : ""}`}
                onClick={() => onFiltersChange({ ...filters, sort: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>

          {leg.flights.length === 0 ? (
            <div className="empty">
              <h3>Aucun vol ne correspond à vos filtres</h3>
              <p>Essayez d'élargir vos critères.</p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14 }}
                type="button"
                onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="flight-list">
              {leg.flights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  passengers={query.passengers}
                  selected={selected?.id === flight.id}
                  isCheapest={flight.pricePerPassenger === leg.cheapestPrice}
                  onSelect={() => onSelect(legKey, flight)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
