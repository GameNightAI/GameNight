import { XMLParser } from 'fast-xml-parser';
import { Game } from '@/types/game';

export async function fetchGames(username: string): Promise<Game[]> {
  try {
    console.log('Fetching games for username:', username);

    // First request to trigger collection fetch
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame&own=1&stats=1`);

    // 202: "BGG has queued your request and you need to keep retrying (hopefully w/some delay between tries) until the status is not 202."
    // 429: Too many requests
    if ([202, 429].includes(response.status)) {
      console.log(`Received ${response.status} status, retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retryResponse = await fetch(`https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame&own=1&stats=1`);
      xmlText = await retryResponse.text();
      console.log('Retry XML response:', xmlText.substring(0, 200) + '...');
    } else if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.status}`);
    }

    let xmlText = await response.text();
    console.log('Initial XML response:', xmlText.substring(0, 200) + '...');

    // Parse the XML response
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: 'value',
    });

    const result = parser.parse(xmlText);
    console.log('Parsed result structure:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
    console.log(result);

    // Check if the collection exists and has items
    if (!result.items) {
      console.log('No items found in response');
      return [];
    }

    // Handle empty collection
    if (!result.items.item) {
      console.log('Collection is empty');
      return [];
    }

    // Ensure we have an array even if there's only one item
    const items = Array.isArray(result.items.item) ? result.items.item : [result.items.item];
    console.log(`Found ${items.length} items in collection`);

    // Map the raw data to our Game type
    return items.map((item: any) => {
      // Find the name - it could be in different formats depending on the XML structure
      let name = '';
      if (item.name) {
        if (typeof item.name === 'string') {
          name = item.name;
        } else if (Array.isArray(item.name)) {
          const primaryName = item.name.find((n: any) => n.type === 'primary') || item.name[0];
          name = primaryName.value || primaryName;
        } else if (item.name.value) {
          name = item.name.value;
        }
      }

      // Extract stats from the XML
      const stats = item.stats || {};
      console.log(item);

      const game = {
        id: parseInt(item.objectid),
        name: name || 'Unknown Game',
        yearPublished: item.yearpublished ? parseInt(item.yearpublished) : null,
        thumbnail: item.thumbnail || 'https://via.placeholder.com/150?text=No+Image',
        image: item.image || 'https://via.placeholder.com/300?text=No+Image',
        min_players: parseInt(stats.minplayers),
        max_players: parseInt(stats.maxplayers),
        playing_time: parseInt(stats.playingtime || '0'),
        minPlaytime: parseInt(stats.minplaytime || '0'),
        maxPlaytime: parseInt(stats.maxplaytime || '0'),
        description: '',
      };

      console.log('Processed game:', game);
      return game;
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch games');
  }
}
