import AirportInput from "./AirportInput.jsx";
import { localToday, addDays } from "../utils.js";

export default function SearchForm({ form, setForm, onSubmit, loading, error }) {
  const today = localToday();
  const roundTrip = form.tripType === "roundtrip";

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleDateChange(value) {
    setForm((prev) => {
      const next = { ...prev, date: value };
      if (prev.tripType === "roundtrip" && prev.returnDate && prev.returnDate < value) {
        next.returnDate = addDays(value, 7);
      }
      return next;
    });
  }

  function swap() {
    setForm((prev) => ({ ...prev, from: prev.to, to: prev.from }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="widget-wrap">
      <form className="widget" onSubmit={handleSubmit}>
        <div className="trip-toggle" role="tablist">
          <button
            type="button"
            className={roundTrip ? "active" : ""}
            onClick={() => update({ tripType: "roundtrip", returnDate: form.returnDate || addDays(form.date, 7) })}
          >
            Aller-retour
          </button>
          <button type="button" className={!roundTrip ? "active" : ""} onClick={() => update({ tripType: "oneway" })}>
            Aller simple
          </button>
        </div>

        <div className="widget-grid">
          <AirportInput
            id="from"
            label="Départ"
            placeholder="Ville ou aéroport"
            airport={form.from}
            onSelect={(a) => update({ from: a })}
          />
          <button
            type="button"
            className="swap-btn"
            onClick={swap}
            disabled={!form.from || !form.to}
            aria-label="Inverser départ et arrivée"
          >
            ⇄
          </button>
          <AirportInput
            id="to"
            label="Arrivée"
            placeholder="Ville ou aéroport"
            airport={form.to}
            onSelect={(a) => update({ to: a })}
          />
        </div>

        <div className="widget-row">
          <div className="field">
            <label htmlFor="date">Départ le</label>
            <input
              id="date"
              type="date"
              min={today}
              value={form.date}
              onChange={(event) => handleDateChange(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="returnDate">Retour le</label>
            <input
              id="returnDate"
              type="date"
              min={form.date || today}
              value={roundTrip ? form.returnDate : ""}
              disabled={!roundTrip}
              onChange={(event) => update({ returnDate: event.target.value })}
              required={roundTrip}
            />
          </div>
          <div className="field">
            <label htmlFor="passengers">Passagers</label>
            <select
              id="passengers"
              value={form.passengers}
              onChange={(event) => update({ passengers: Number(event.target.value) })}
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} passager{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || !form.from || !form.to}>
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </div>
        {error && <div className="error-box" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>}
        <p className="notice">Toutes compagnies confondues · tarifs par passager, taxes incluses</p>
      </form>
    </div>
  );
}
