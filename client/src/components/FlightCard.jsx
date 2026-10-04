import { formatDuration, formatPrice, formatTime, stopsLabel } from "../utils.js";

export default function FlightCard({ flight, passengers, selected, isCheapest, onSelect }) {
  return (
    <article className={`flight-card ${selected ? "selected" : ""}`}>
      <div className="airline">
        <span className="airline-logo">{flight.airline.code}</span>
        <div>
          <strong>{flight.airline.name}</strong>
          <small>Vol {flight.flightNumber}</small>
        </div>
      </div>

      <div className="times">
        <div className="time-block">
          <strong>{formatTime(flight.departure)}</strong>
          <small>{flight.from}</small>
        </div>
        <div className="route-line">
          <small>{formatDuration(flight.durationMin)}</small>
          <div className="line" />
          <small className={`stops ${flight.stops === 0 ? "direct" : ""}`}>{stopsLabel(flight)}</small>
        </div>
        <div className="time-block">
          <strong>{formatTime(flight.arrival)}</strong>
          <small>{flight.to}</small>
        </div>
      </div>

      <div className="price-block">
        {isCheapest && <span className="tag-best">Le moins cher</span>}
        <div className="price">{formatPrice(flight.pricePerPassenger)}</div>
        <small>
          par passager
          {passengers > 1 ? ` · ${formatPrice(flight.pricePerPassenger * passengers)} au total` : ""}
        </small>
        <button className={`btn btn-sm ${selected ? "btn-dark" : "btn-ghost"}`} type="button" onClick={onSelect}>
          {selected ? "Sélectionné ✓" : "Choisir"}
        </button>
      </div>
    </article>
  );
}
