import { DEFAULT_FILTERS } from "../filters.js";

export default function Filters({ filters, onChange, airlines }) {
  function toggleAirline(code) {
    const next = filters.airlines.includes(code)
      ? filters.airlines.filter((c) => c !== code)
      : [...filters.airlines, code];
    onChange({ ...filters, airlines: next });
  }

  return (
    <aside className="filters">
      <h3>
        Filtres
        <button type="button" className="reset" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
          Réinitialiser
        </button>
      </h3>

      <div className="filter-group">
        <label htmlFor="f-stops">Escales</label>
        <select
          id="f-stops"
          value={filters.maxStops}
          onChange={(event) => onChange({ ...filters, maxStops: event.target.value })}
        >
          <option value="">Toutes</option>
          <option value="0">Vol direct</option>
          <option value="1">1 escale maximum</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="f-price">Prix max par passager (€)</label>
        <input
          id="f-price"
          type="number"
          min="0"
          step="10"
          placeholder="Aucune limite"
          value={filters.maxPrice}
          onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="f-time">Heure de départ</label>
        <select id="f-time" value={filters.time} onChange={(event) => onChange({ ...filters, time: event.target.value })}>
          <option value="">Toute la journée</option>
          <option value="morning">Matin (avant 12 h)</option>
          <option value="afternoon">Après-midi (12 h – 18 h)</option>
          <option value="evening">Soir (après 18 h)</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Compagnies</label>
        {airlines.map((airline) => (
          <label className="check-row" key={airline.code}>
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline.code)}
              onChange={() => toggleAirline(airline.code)}
            />
            {airline.name}
          </label>
        ))}
      </div>
    </aside>
  );
}
