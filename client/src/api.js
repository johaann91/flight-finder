const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5070";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.errors?.join(" ") || "Une erreur est survenue.");
  }
  return data;
}

function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length > 0) q.set(key, value.join(","));
      return;
    }
    q.set(key, String(value));
  });
  return q.toString();
}

export function searchAirports(q) {
  return request(`/api/airports?${toQuery({ q })}`);
}

export function searchFlights(params) {
  return request(`/api/flights/search?${toQuery(params)}`);
}

export function getCalendar({ from, to, month }) {
  return request(`/api/flights/calendar?${toQuery({ from, to, month })}`);
}

export function listFavorites() {
  return request("/api/favorites");
}

export function addFavorite(favorite) {
  return request("/api/favorites", { method: "POST", body: JSON.stringify(favorite) });
}

export function deleteFavorite(id) {
  return request(`/api/favorites/${id}`, { method: "DELETE" });
}
