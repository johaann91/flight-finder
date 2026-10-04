export const DEFAULT_FILTERS = { sort: "price", maxStops: "", airlines: [], maxPrice: "", time: "" };

export const TIME_RANGES = {
  "": {},
  morning: { departAfter: 0, departBefore: 12 },
  afternoon: { departAfter: 12, departBefore: 18 },
  evening: { departAfter: 18, departBefore: 24 },
};
