import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import SearchForm from "./components/SearchForm.jsx";
import Results from "./components/Results.jsx";
import PriceCalendar from "./components/PriceCalendar.jsx";
import SelectionBar from "./components/SelectionBar.jsx";
import Favorites from "./components/Favorites.jsx";
import { DEFAULT_FILTERS, TIME_RANGES } from "./filters.js";
import { searchFlights, listFavorites, addFavorite, deleteFavorite, searchAirports } from "./api.js";
import { localToday, addDays, daysBetween } from "./utils.js";

const PARIS = { iata: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" };

const POPULAR = [
  { iata: "LHR", city: "Londres", name: "Heathrow", country: "Royaume-Uni" },
  { iata: "BCN", city: "Barcelone", name: "El Prat", country: "Espagne" },
  { iata: "RAK", city: "Marrakech", name: "Ménara", country: "Maroc" },
  { iata: "JFK", city: "New York", name: "John F. Kennedy", country: "États-Unis" },
  { iata: "DXB", city: "Dubaï", name: "Dubai International", country: "Émirats arabes unis" },
  { iata: "NRT", city: "Tokyo", name: "Narita", country: "Japon" },
];

function initialForm() {
  const today = localToday();
  return {
    tripType: "roundtrip",
    from: PARIS,
    to: null,
    date: addDays(today, 30),
    returnDate: addDays(today, 37),
    passengers: 1,
  };
}

function buildParams(form, filters) {
  const range = TIME_RANGES[filters.time] || {};
  return {
    from: form.from.iata,
    to: form.to.iata,
    date: form.date,
    returnDate: form.tripType === "roundtrip" ? form.returnDate : "",
    passengers: form.passengers,
    sort: filters.sort,
    maxStops: filters.maxStops,
    airlines: filters.airlines,
    maxPrice: filters.maxPrice,
    departAfter: range.departAfter,
    departBefore: range.departBefore,
  };
}

function App() {
  const [view, setView] = useState("search");
  const [form, setForm] = useState(initialForm);
  const [searchedForm, setSearchedForm] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [result, setResult] = useState(null);
  const [selection, setSelection] = useState({ out: null, in: null });
  const [activeLeg, setActiveLeg] = useState("out");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const requestId = useRef(0);

  const refreshFavorites = useCallback(async () => {
    try {
      setFavorites(await listFavorites());
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listFavorites()
      .then((list) => {
        if (!cancelled) setFavorites(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch(searchForm, searchFilters, resetSelection) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await searchFlights(buildParams(searchForm, searchFilters));
      if (id !== requestId.current) return;
      setResult(data);
      if (resetSelection) {
        setSelection({ out: null, in: null });
        setActiveLeg("out");
      }
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function handleSubmit() {
    setFilters(DEFAULT_FILTERS);
    setSearchedForm(form);
    runSearch(form, DEFAULT_FILTERS, true);
  }

  function handleFiltersChange(next) {
    setFilters(next);
    runSearch(searchedForm, next, false);
  }

  function handleSelect(leg, flight) {
    setSelection((prev) => ({ ...prev, [leg]: flight }));
    if (leg === "out" && result?.inbound) setActiveLeg("in");
  }

  function handlePickDate(date) {
    const base = searchedForm;
    const tripLength = base.tripType === "roundtrip" ? Math.max(0, daysBetween(base.date, base.returnDate)) : 0;
    const next = { ...base, date, returnDate: base.tripType === "roundtrip" ? addDays(date, tripLength) : base.returnDate };
    setForm(next);
    setSearchedForm(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    runSearch(next, filters, true);
  }

  function handlePopular(airport) {
    const next = { ...form, to: airport };
    setForm(next);
    setFilters(DEFAULT_FILTERS);
    setSearchedForm(next);
    runSearch(next, DEFAULT_FILTERS, true);
  }

  async function handleSaveFavorite(targetPrice) {
    const q = result.query;
    await addFavorite({
      from: q.from,
      to: q.to,
      date: q.date,
      returnDate: q.returnDate,
      passengers: q.passengers,
      targetPrice,
    });
    await refreshFavorites();
  }

  async function handleDeleteFavorite(id) {
    await deleteFavorite(id);
    await refreshFavorites();
  }

  async function handleSearchFavorite(fav) {
    const find = async (iata) => (await searchAirports(iata)).find((a) => a.iata === iata);
    const [from, to] = await Promise.all([find(fav.from), find(fav.to)]);
    if (!from || !to) return;
    const next = {
      tripType: fav.returnDate ? "roundtrip" : "oneway",
      from,
      to,
      date: fav.date,
      returnDate: fav.returnDate || addDays(fav.date, 7),
      passengers: fav.passengers,
    };
    setForm(next);
    setFilters(DEFAULT_FILTERS);
    setSearchedForm(next);
    setView("search");
    window.scrollTo({ top: 0 });
    runSearch(next, DEFAULT_FILTERS, true);
  }

  const alertsCount = favorites.filter((f) => f.triggered).length;

  return (
    <>
      <Header view={view} onNavigate={setView} favoritesCount={favorites.length} alertsCount={alertsCount} />

      {view === "favorites" ? (
        <Favorites favorites={favorites} onDelete={handleDeleteFavorite} onSearch={handleSearchFavorite} />
      ) : (
        <>
          <section className="hero">
            <div className="hero-inner">
              <h1>Trouvez le billet d'avion au meilleur prix, quelle que soit la compagnie.</h1>
              <p>Comparez les vols, suivez les prix et repérez les jours les moins chers.</p>
            </div>
          </section>
          <SearchForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={loading} error={error} />

          <main className="page">
            {!result && !loading && (
              <div className="empty">
                <h3>Où voulez-vous aller ?</h3>
                <p>Choisissez une destination ci-dessus, ou inspirez-vous de ces départs depuis Paris :</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
                  {POPULAR.map((airport) => (
                    <button key={airport.iata} className="chip" type="button" onClick={() => handlePopular(airport)}>
                      {airport.city}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!result && loading && <div className="spinner">Recherche des meilleurs vols…</div>}

            {result && (
              <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s" }}>
                <Results
                  result={result}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  selection={selection}
                  onSelect={handleSelect}
                  activeLeg={activeLeg}
                  setActiveLeg={setActiveLeg}
                />
                <PriceCalendar
                  key={`${result.query.from}-${result.query.to}`}
                  from={result.query.from}
                  to={result.query.to}
                  selectedDate={result.query.date}
                  onPick={handlePickDate}
                />
              </div>
            )}
          </main>
          {result && <SelectionBar query={result.query} selection={selection} onSave={handleSaveFavorite} />}
        </>
      )}

      <footer className="app-footer">
        Vol Finder — données de vols simulées à des fins de démonstration, aucun billet réel n'est vendu.
      </footer>
    </>
  );
}

export default App;
