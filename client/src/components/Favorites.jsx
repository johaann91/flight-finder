import { formatDateLong, formatPrice } from "../utils.js";

export default function Favorites({ favorites, onDelete, onSearch }) {
  return (
    <div className="page">
      <h1 className="page-title">Mes favoris & alertes de prix</h1>
      {favorites.length === 0 ? (
        <div className="empty">
          <h3>Aucun favori pour l'instant</h3>
          <p>Sélectionnez un vol dans les résultats puis cliquez sur « Suivre ce trajet ».</p>
        </div>
      ) : (
        <div className="fav-grid">
          {favorites.map((fav) => (
            <article key={fav.id} className={`fav-card ${fav.triggered ? "triggered" : ""}`}>
              <div className="fav-route">
                {fav.from} {fav.returnDate ? "⇄" : "→"} {fav.to}
              </div>
              <div className="fav-meta">
                {formatDateLong(fav.date)}
                {fav.returnDate ? ` – ${formatDateLong(fav.returnDate)}` : ""} · {fav.passengers} passager
                {fav.passengers > 1 ? "s" : ""}
              </div>
              {fav.expired ? (
                <span className="alert-badge expired">Trajet expiré</span>
              ) : (
                <>
                  <div className="fav-price">dès {formatPrice(fav.lowestTotal)}</div>
                  {fav.targetPrice !== null && (
                    <div className="fav-target">Prix cible : {formatPrice(fav.targetPrice)}</div>
                  )}
                  {fav.triggered && <span className="alert-badge">🔔 Alerte : objectif de prix atteint !</span>}
                </>
              )}
              <div className="fav-actions">
                {!fav.expired && (
                  <button className="btn btn-dark btn-sm" type="button" onClick={() => onSearch(fav)}>
                    Voir les vols
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => onDelete(fav.id)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
