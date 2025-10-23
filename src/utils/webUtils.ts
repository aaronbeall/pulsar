import { normalizeExerciseName } from "../services/routineBuilderService";

export const openUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Use DuckDuckGo to search for a query and open the top result in a new tab.
 * Use with a site restriction, e.g. `site:youtube.com` to search and open for a specific site.
 */
export const openSearchQuery = (query: string) => {
  const url = getSearchUrl(query);
  openUrl(url);
}

/**
 * Uses DuckDuckGo to generate a search URL for a query that will open the first result.
 */
export const getSearchUrl = (query: string) => {
  return `https://duckduckgo.com/?q=%5C${ encodeURIComponent(query) }&l=1`
}

export const getHowToQuery = (exerciseName: string) => {
  return `how to ${ exerciseName } site:youtube.com`;
}

/**
 * Use Google Programmable Search Engine (CSE) to search for images for an exercise and return the top image URL.
 * Requires a CSE API key and cx (search engine ID).
 */
export const fetchExerciseSearchImageUrl = async (
  exerciseName: string
): Promise<string | null> => {
  // VITE_GOOGLE_CSE_ID and VITE_GOOGLE_CSE_API_KEY should be defined in your .env file
  const searchCx = import.meta.env.VITE_GOOGLE_CSE_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_CSE_API_KEY;
  if (!apiKey || !searchCx) return null;
  const query = `${exerciseName} exercise`;
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&num=1&key=${apiKey}&cx=${searchCx}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].link;
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * getExerciseSearchImageUrl
 * - Checks localStorage-backed cache first (key: `pulsar:imageUrl:${normalizedName}`)
 * - If cached (including explicit 'null'), returns cached value
 * - Otherwise calls fetchExerciseSearchImageUrl, stores the result in cache, and returns it
 */
export async function getExerciseSearchImageUrl(exerciseName: string): Promise<string | null> {
  const norm = normalizeExerciseName(exerciseName);
  if (!norm) return null;
  const key = `pulsar:imageUrl:${norm}`;

  try {
    const existing = localStorage.getItem(key);
    // If we previously stored a real URL, return it. If the stored value is the
    // legacy explicit 'null' marker or empty, treat as a cache miss and re-fetch.
    if (existing !== null && existing !== 'null' && existing !== '') {
      return existing;
    }
  } catch (e) {
    // localStorage might be unavailable (private mode), continue to fetch
  }

  const fetched = await fetchExerciseSearchImageUrl(exerciseName);

  // Only cache successful fetches (non-null, non-empty string). Do not cache failures.
  try {
    if (fetched) {
      localStorage.setItem(key, fetched);
    }
  } catch (e) {
    // ignore localStorage set errors
  }

  return fetched;
}