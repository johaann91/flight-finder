import { useState } from "react";
import { formatPrice, formatTime } from "../utils.js";

export default function SelectionBar({ query, selection, onSave }) {
  const [target, setTarget] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const roundTrip = Boolean(query.returnDate);
  const { out, in: back } = selection;
  if (!out) return null;

  const complete = !roundTrip || Boolean(back);
  const perPassenger = out.pricePerPassenger + (back ? back.pricePerPassenger : 0);
  const total = perPassenger * query.passengers;

  async function handleSave() {
    setSaving(true);
    setToast(null);
    try {
      await onSave(target);
      setToast({ type: "ok", text: "Trajet ajouté aux favoris ★" });
      setTarget("");
    } catch (error) {
      setToast({ type: "err", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="selection-bar">
      <div className="selection-info">
        <div>
          <small>Aller</small>
          {out.airline.name} · {formatTime(out.departure)} → {formatTime(out.arrival)}
        </div>
        {roundTrip && (
          <div>
            <small>Retour</small>
            {back ? `${back.airline.name} · ${formatTime(back.departure)} → ${formatTime(back.arrival)}` : "À choisir"}
          </div>
        )}
        <div>
          <small>
            Total · {query.passengers} passager{query.passengers > 1 ? "s" : ""}
          </small>
          <span className="selection-total">{complete ? formatPrice(total) : `dès ${formatPrice(total)}`}</span>
        </div>
      </div>
      <div className="selection-actions">
        {toast && <span className={`toast ${toast.type}`}>{toast.text}</span>}
        <input
          type="number"
          min="1"
          placeholder="Alerte prix (€ total)"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          aria-label="Prix cible pour l'alerte"
        />
        <button className="btn btn-dark btn-sm" type="button" onClick={handleSave} disabled={saving}>
          ★ Suivre ce trajet
        </button>
      </div>
    </div>
  );
}
