/**
 * Utility functions for sorting game titles while ignoring articles
 */

/**
 * Removes articles from game titles for sorting purposes
 * @param title - The game title to process
 * @returns The title with articles removed, converted to lowercase
 */
export const removeArticlesFromTitle = (title: string): string => {
  const articles = [
    // English articles, removed from sort:  'a', 'an', and 'some' 
    'the',
    /*
    // French articles
    'le', 'la', 'les', 'un', 'une', 'des',
    // Spanish articles
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    // German articles
    'der', 'die', 'das', 'ein', 'eine', 'eines', 'einer', 'einem', 'einen',
    // Italian articles
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'un\'',
    // Dutch articles
    'de', 'het', 'een',
    */
  ];

  const words = title.toLowerCase().split(' ');

  if (words.length > 1 && articles.includes(words[0])) {
    return words.slice(1).join(' ');
  }

  return title.toLowerCase();
};

/**
 * Sorts an array of games alphabetically by title, ignoring articles
 * @param games - Array of games with a 'name' property
 * @returns Sorted array of games
 */
export const sortGamesByTitle = <T extends { name: string }>(games: T[]): T[] => {
  return [...games].sort((a, b) => {
    const titleA = removeArticlesFromTitle(a.name);
    const titleB = removeArticlesFromTitle(b.name);
    return titleA.localeCompare(titleB);
  });
};
