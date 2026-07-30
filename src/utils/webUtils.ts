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
 * Search Wikimedia Commons for an image matching an exercise and return the top result's
 * URL. Free, no API key required — Commons' API is CORS-enabled for anonymous client-side
 * use via `origin=*`. `filetype:bitmap|drawing` biases results toward actual images,
 * away from audio/video files that also live in the File: namespace (gsrnamespace=6).
 */
export const fetchExerciseSearchImageUrl = async (
  exerciseName: string
): Promise<string | null> => {
  const query = `filetype:bitmap|drawing ${exerciseName} exercise`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const firstPage = Object.values(pages)[0] as { imageinfo?: { url: string }[] } | undefined;
    return firstPage?.imageinfo?.[0]?.url || null;
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