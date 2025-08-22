import { XMLParser } from 'fast-xml-parser';
import { Game } from '@/types/game';

export async function searchGames(query: string): Promise<Game[]> {
  try {
    console.log('Searching for games with query:', query);

    // First, search for games using our API endpoint
    const searchResponse = await fetch(`/api/bgg/search?query=${encodeURIComponent(query)}`);
    if (!searchResponse.ok) {
      throw new Error(`Search request failed: ${searchResponse.status}`);
    }

    const searchXmlText = await searchResponse.text();
    const searchParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: 'value',
    });

    const searchResult = searchParser.parse(searchXmlText);

    if (!searchResult.items || !searchResult.items.item) {
      console.log('No search results found');
      return [];
    }

    // Ensure we have an array even if there's only one item
    const items = Array.isArray(searchResult.items.item) ? searchResult.items.item : [searchResult.items.item];
    console.log(`Found ${items.length} search results`);

    const games: Game[] = [];

    // Fetch detailed game info for each result
    for (const item of items) {
      if (item.name.type === 'primary') {
        try {
          // Fetch detailed game info using our API endpoint
          const gameResponse = await fetch(`/api/bgg/thing?id=${item.id}&stats=1`);
          if (!gameResponse.ok) {
            console.warn(`Failed to fetch details for game ${item.id}`);
            continue;
          }

          const gameXmlText = await gameResponse.text();
          const gameParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
            textNodeName: 'value',
          });

          const gameResult = gameParser.parse(gameXmlText);
          const gameInfo = gameResult.items.item;

          // Convert BGG data to our Game interface
          const complexity = parseFloat(gameInfo.complexity?.value) || 0;
          const minPlayers = parseInt(gameInfo.minplayers?.value) || 0;
          const maxPlayers = parseInt(gameInfo.maxplayers?.value) || 0;
          const playingTime = parseInt(gameInfo.playingtime?.value) || 0;
          const minPlaytime = parseInt(gameInfo.minplaytime?.value) || 0;
          const maxPlaytime = parseInt(gameInfo.maxplaytime?.value) || 0;
          const yearPublished = parseInt(gameInfo.yearpublished?.value) || null;
          const minAge = parseInt(gameInfo.minage?.value) || 0;
          const average = parseFloat(gameInfo.statistics?.ratings?.average?.value) || null;
          const bayesaverage = parseFloat(gameInfo.statistics?.ratings?.bayesaverage?.value) || null;

          const game: Game = {
            id: parseInt(item.id),
            name: item.name.value || item.name,
            yearPublished,
            thumbnail: gameInfo.thumbnail || '',
            image: gameInfo.image || gameInfo.thumbnail || '',
            min_players: minPlayers,
            max_players: maxPlayers,
            min_exp_players: minPlayers,
            max_exp_players: maxPlayers,
            playing_time: playingTime,
            minPlaytime,
            maxPlaytime,
            description: gameInfo.description || '',
            minAge,
            is_cooperative: gameInfo.is_cooperative === 'true',
            is_teambased: gameInfo.is_teambased === 'true',
            complexity,
            complexity_tier: complexity > 0 ? getComplexityTier(complexity) : 0,
            complexity_desc: complexity > 0 ? getComplexityDescription(complexity) : '',
            average,
            bayesaverage,
          };

          games.push(game);
        } catch (gameError) {
          console.error('Error fetching game details:', gameError);
          // Continue with other games if one fails
        }
      }
    }

    console.log(`Successfully processed ${games.length} games`);
    return games;
  } catch (error) {
    console.error('Error searching games:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to search games');
  }
}

// Helper functions for complexity mapping
function getComplexityTier(complexity: number): number {
  if (complexity < 1.5) return 1; // Light
  if (complexity < 2.5) return 2; // Medium Light
  if (complexity < 3.5) return 3; // Medium
  if (complexity < 4.5) return 4; // Medium Heavy
  return 5; // Heavy
}

function getComplexityDescription(complexity: number): string {
  if (complexity < 1.5) return 'Light';
  if (complexity < 2.5) return 'Medium Light';
  if (complexity < 3.5) return 'Medium';
  if (complexity < 4.5) return 'Medium Heavy';
  return 'Heavy';
}
