import { useEffect, useState } from "react";
import { searchAirports } from "../api.js";
import { airportLabel } from "../utils.js";

export default function AirportInput({ id, label, airport, onSelect, placeholder }) {
  const [text, setText] = useState(airport ? airportLabel(airport) : "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(0);

  // Quand le parent change l'aéroport (échange départ/arrivée, favori...), on met à jour le texte.
  const [prevIata, setPrevIata] = useState(airport?.iata);
  if (airport?.iata !== prevIata) {
    setPrevIata(airport?.iata);
    if (airport) setText(airportLabel(airport));
  }

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const query = airport && text === airportLabel(airport) ? "" : text;
    const timer = setTimeout(() => {
      searchAirports(query)
        .then((list) => {
          if (!cancelled) {
            setOptions(list);
            setActive(0);
          }
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, open, airport]);

  function choose(option) {
    onSelect(option);
    setText(airportLabel(option));
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="field suggest-wrap">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={(event) => {
          event.target.select();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (airport) onSelect(null);
        }}
      />
      {open && options.length > 0 && (
        <ul className="suggest-list" role="listbox">
          {options.map((option, index) => (
            <li
              key={option.iata}
              role="option"
              aria-selected={index === active}
              className={`suggest-item ${index === active ? "active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
            >
              <span>
                {option.city} <small>· {option.name}</small>
              </span>
              <span className="suggest-code">{option.iata}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
