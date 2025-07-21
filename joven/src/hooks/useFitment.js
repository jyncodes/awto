const API_BASE = "https://api.wheel-size.com/v2";
const API_KEY = "c081c7668c78f59e2a034841d0eaa8c8";

// Get year range (e.g., 2024 to 2000)
export const fetchYears = async () => {
  return Array.from({ length: 25 }, (_, i) => `${2024 - i}`);
};

// Fetch car makes for a specific year
export const fetchMakes = async (year) => {
  try {
    const res = await fetch(`${API_BASE}/makes/?year=${year}&user_key=${API_KEY}`);
    const json = await res.json();
    return json.data.map((item) => ({
      slug: item.slug,
      name: item.name,
    }));
  } catch (err) {
    console.error("Failed to fetch makes", err);
    return [];
  }
};

// Fetch models for a specific year and make
export const fetchModels = async (year, make) => {
  try {
    const res = await fetch(`${API_BASE}/models/?make=${make}&year=${year}&user_key=${API_KEY}`);
    const json = await res.json();
    return json.data.map((item) => ({
      slug: item.slug,
      name: item.name,
    }));
  } catch (err) {
    console.error("Failed to fetch models", err);
    return [];
  }
};

// Fetch trims (generations) for year + make + model
export const fetchTrims = async (year, make, model) => {
  try {
    const res = await fetch(`${API_BASE}/modifications/?make=${make}&model=${model}&year=${year}&user_key=${API_KEY}`);
    const json = await res.json();
    return json.data.map((item) => ({
      id: item.id,
      name: item.name || `${item.make} ${item.model} ${item.year}`,
    }));
  } catch (err) {
    console.error("Failed to fetch trims", err);
    return [];
  }
};

// Fetch detailed specs of a selected trim
export const fetchTrimDetails = async (trimId) => {
  try {
    const res = await fetch(`${API_BASE}/modifications/${trimId}/?user_key=${API_KEY}`);
    const json = await res.json();
    return {
      trimId,
      tireSize: json.front.tire || "N/A",
      wheelSize: json.front.rim || "N/A",
      boltPattern: json.pc || "N/A",
      offset: json.offset || "N/A",
      hubBore: json.cb || "N/A",
    };
  } catch (err) {
    console.error("Failed to fetch trim details", err);
    return {};
  }
};
