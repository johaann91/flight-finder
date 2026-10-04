import { useEffect, useState } from "react";
import { getCalendar } from "../api.js";
import { formatPrice, localToday } from "../utils.js";

const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function PriceCalendar({ from, to, selectedDate, onPick }) {
  const currentMonth = localToday().slice(0, 7);
  const lastMonth = shiftMonth(currentMonth, 11);
  const [month, setMonth] = useState(selectedDate.slice(0, 7));
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCalendar({ from, to, month })
      .then((data) => {
        if (!cancelled) {
          setDays(data.days);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setDays(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, month]);

  const prices = (days || []).map((d) => d.price).filter((p) => p !== null);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const cheapThreshold = min + (max - min) * 0.2;
  const offset = (new Date(`${month}-01T12:00:00`).getDay() + 6) % 7;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Calendrier des prix</h2>
          <p>
            {from} → {to} · plus bas tarif par passager, cliquez sur un jour pour relancer la recherche
          </p>
        </div>
        <div className="month-nav">
          <button type="button" disabled={month <= currentMonth} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">
            ‹
          </button>
          <span>{monthLabel(month)}</span>
          <button type="button" disabled={month >= lastMonth} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant">
            ›
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!days && !error && <div className="spinner">Chargement du calendrier…</div>}
      {days && (
        <div className="cal-grid">
          {DOW.map((d) => (
            <div className="cal-dow" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="cal-day cal-blank" key={`b${i}`} />
          ))}
          {days.map((day) => {
            const isCheap = day.price !== null && day.price <= cheapThreshold && max > min;
            return (
              <button
                key={day.date}
                type="button"
                disabled={day.price === null}
                className={`cal-day ${isCheap ? "cheap" : ""} ${day.date === selectedDate ? "chosen" : ""}`}
                onClick={() => onPick(day.date)}
              >
                <small>{Number(day.date.slice(8))}</small>
                <strong>{day.price !== null ? formatPrice(day.price) : "—"}</strong>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
