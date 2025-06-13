
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
// VITE_GOOGLE_CSE_ID and VITE_GOOGLE_CSE_API_KEY should be defined in your .env file
const GOOGLE_CSE_ID = import.meta.env.VITE_GOOGLE_CSE_ID;
const GOOGLE_CSE_API_KEY = import.meta.env.VITE_GOOGLE_CSE_API_KEY;

export const fetchExerciseSearchImageUrl = async (
  exerciseName: string
): Promise<string | null> => {
  const searchCx = GOOGLE_CSE_ID;
  const apiKey = GOOGLE_CSE_API_KEY;
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