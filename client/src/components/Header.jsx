export default function Header({ view, onNavigate, favoritesCount, alertsCount }) {
  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={() => onNavigate("search")}>
        <span className="brand-mark">✈</span>
        Vol Finder
      </button>
      <nav className="app-nav">
        <button
          type="button"
          className={`nav-link ${view === "search" ? "active" : ""}`}
          onClick={() => onNavigate("search")}
        >
          Rechercher
        </button>
        <button
          type="button"
          className={`nav-link ${view === "favorites" ? "active" : ""}`}
          onClick={() => onNavigate("favorites")}
        >
          Favoris
          {favoritesCount > 0 && (
            <span className="badge">{alertsCount > 0 ? `🔔 ${alertsCount}` : favoritesCount}</span>
          )}
        </button>
      </nav>
    </header>
  );
}
