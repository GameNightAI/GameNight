import { createClient } from '@supabase/supabase-js';
import { DOMParser } from 'xmldom';
import { XMLParser } from 'fast-xml-parser';
import yauzl from 'yauzl'; // "yet another unzip library" for node
import { parse } from 'csv-parse';
import { asyncBatch, asyncToArray, asyncMap } from 'iter-tools';
import { format } from 'date-fns';

const LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';
const BGG_CSV_URL = 'https://boardgamegeek.com/data_dumps/bg_ranks';
const SLEEP_TIME = 5 // seconds to wait before retrying BGG API request
const DASH = '–' // NOT the hyphen character on the keyboard
const TAXONOMY_DELIMITER = '|';
const BGG_API_BATCH_SIZE = 20; // 20 is the maximum number of games allowed by https://boardgamegeek.com/xmlapi2/thing
const SUPABASE_BATCH_SIZE = 1000; // number of rows per INSERT/UPSERT requests

const timestamp = () => 
  format(new Date(), 'Pppp');

const log = text =>
  console.log(`${timestamp()}: ${text}`)

const cError = text =>
  console.error(`${timestamp()}: ${text}`)

const getZipUrl = async () => {
  
  // Need to be logged in to get the oh-so-secret zipfile link
  const username = process.env.BGG_USERNAME;
  log(`Logging ${username} in to BGG...`);
  const loginResponse = await fetch(
    LOGIN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credentials: {
        username: username,
        password: process.env.BGG_PASSWORD,
      }}),
    }
  );
  if (loginResponse.ok) {
    log('Successfully logged in.');
  } else {
    throw new Error(`Failed to log in: ${loginResponse.status} - ${loginResponse.statusText}`);
  }
  const cookie = loginResponse.headers.getSetCookie();

  log(`Fetching BGG zip URL from ${BGG_CSV_URL}...`);
  let csvResponse;
  while (1) {
    try {
      csvResponse = await fetch(
        BGG_CSV_URL, {
          method: 'GET',
          headers: { cookie: cookie.join(';') },
        }
      );
    } catch (error) {
      cError(`Network error: ${error}`);
      continue;
    }
    if (csvResponse.ok) {
      break;
    } else {
      throw new Error(`Failed to fetch URL: ${csvResponse.status} - ${csvResponse.statusText}`);
    }
  }
  
  const html = await csvResponse.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString( html, 'text/html');
  const hyperlink = doc
    .getElementById('maincontent')
    .getElementsByTagName('a')[0];
  
  const url = hyperlink.getAttribute('href');
  const filename = hyperlink.getAttribute('download');
  
  return [url, filename];
}

const hasTaxonomy = (game, type, value) => {
  let links = game.link;
  if (!Array.isArray(links)) {
    links = [links];
  }
  return links.some(link =>
    link.type === type && link.value === value
  );
};

const parseSuggestedPlayers = (text) => (
  text
    .replaceAll(DASH, '-')
    .split('')
    .filter(c => '0123456789,+-'.includes(c))
    .join('')
);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

const parseXml = function* (text) {
  
  let games = xmlParser.parse(text).items.item;
  // Handle edge case where the final batch of games is a single item
  if (!Array.isArray(games)) {
    games = [games];
  }
  for (const game of games) {
    const row = { id: game.id };
    
    let names = game.name;
    if (!Array.isArray(names)) {
      names = [names];
    }
    for (const { type, value } of names) {
      if (type === 'primary') {
        row.name = value;
      }
    }
    
    for (const poll of game.poll) {
      if (poll.name === 'suggested_playerage') {
        // Avoid division by zero
        if (poll.totalvotes === '0') {
          row.suggested_playerage = null;
        } else {
          let ageSum = 0;
          let voteSum = 0;
          for (const { value, numvotes } of poll.results.result) {
            const age = parseInt(value);
            const voteCount = parseInt(numvotes);
            ageSum += age * voteCount;
            voteSum += voteCount;
          }
          row.suggested_playerage = ageSum / voteSum; // weighted average
        }
      }
    }
    
    let summaries = game['poll-summary'];
    if (!Array.isArray(summaries)) {
      summaries = [summaries];
    }
    for (const summary of summaries) {
      if (summary.name === 'suggested_numplayers') {
        for (const { name, value } of summary.result) {
          if (name === 'bestwith') {
            row.best_players = parseSuggestedPlayers(value);
          } else if (name === 'recommmendedwith') {
            row.rec_players = parseSuggestedPlayers(value);
          }
        }
      }
    }
    row.is_expansion = game.type === 'boardgameexpansion';
    const expansions = [];
    let links = game.link;
    if (!Array.isArray(links)) {
      links = [links];
    }
    // Don't get expansions of expansions, just of base games
    if (!row.is_expansion) {
      for (const link of links) {
        if (link.type === 'boardgameexpansion') {
          expansions.push({
            base_id: row.id,
            expansion_id: link.id,
          });
        }
      }
    }
    const ratings = game.statistics.ratings;
    let ranks = ratings.ranks.rank;
    if (ranks) {
      if (!Array.isArray(ranks)) {
        ranks = [ranks];
      }
      for (const { type, name, value } of ranks) {
        if (type === 'subtype' && name === 'boardgame') {
          row.rank = parseInt(value) || null;
        }
      }
    }
    // NULL out 0 for filtering purposes (0 means no value)
    row.average = parseFloat(ratings.average.value) || null;
    row.bayesaverage = parseFloat(ratings.bayesaverage.value) || null;
    row.complexity = parseFloat(ratings.averageweight.value) || null;
    row.year_published = parseInt(game.yearpublished.value) || null;
    row.minplaytime = parseInt(game.minplaytime.value) || null;
    row.maxplaytime = parseInt(game.maxplaytime.value) || null;
    row.playing_time = parseInt(game.playingtime.value) || null;
    row.min_players = parseInt(game.minplayers.value) || null;
    row.max_players = parseInt(game.maxplayers.value) || null;
    row.min_age = parseInt(game.minage.value) || null;
    row.image_url = game.image;
    row.thumbnail = game.thumbnail;
    row.audio_url = null; // We will probably never use this column
    row.description = null; // Leaving blank until we have more database storage
    row.is_cooperative = hasTaxonomy(game, 'boardgamemechanic', 'Cooperative Game');
    row.is_teambased = hasTaxonomy(game, 'boardgamemechanic', 'Team-Based Game');
    // BGG taxonomy
    for (const type of ['boardgamecategory', 'boardgamemechanic', 'boardgamefamily']) {
      row[type] = links
        .filter(link => link.type === type)
        .map(link => link.value)
        .join(TAXONOMY_DELIMITER);
    }
    yield {
      game: row,
      expansions: expansions,
    };
  }
}

const createSupabaseClient = async () => {
  /* Use the service_role key (which bypasses RLS)
  if we're running this in a Supabase edge function.
  Otherwise, login as a normal user */
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey,
    { auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }}
  );
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('Created Supabase client using SUPABASE_SERVICE_ROLE_KEY.');
  } else {
    log('Created Supabase client using SUPABASE_ANON_KEY.');
    const email = process.env.SUPABASE_EMAIL;
    log(`Logging ${email} in to Supabase...`);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: process.env.SUPABASE_PASSWORD,
    });
    if (error) {
    throw new Error(`Failed to log in: ${error.message}`);
    } else {
      log('Successfully logged in.')
    };
  }
  return supabase;
};

const bggApiCaller = async function* (csvParser) {
  // Make API calls in batches of 20 (or whatever the max that BGG allows) games at a time
  for await (const bggBatch of asyncBatch(BGG_API_BATCH_SIZE, csvParser)) {
    
    const ids = await asyncToArray(asyncMap((game => game.id), bggBatch));
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids.join()}&stats=1`;
    
    let bggResponse;
    while (1) {
      try {
        bggResponse = await fetch(url);
      } catch (error) {
        cError(`Network error: ${error}`);
        continue;
      }
      const status = `${bggResponse.status} - ${bggResponse.statusText}`;
      if (bggResponse.ok) {
        break;
      } else if (
        bggResponse.status === 429 // Too many requests
        || (bggResponse.status >= 500 && bggResponse.status < 600) // Server error
      ) {
        if (bggResponse.status !== 429) { // 429 happens so frequently that it's not worth logging.
          cError(`${status}: Waiting ${SLEEP_TIME} seconds before resubmitting request...`);
        }
        await new Promise(resolve => setTimeout(resolve, SLEEP_TIME * 1000));
      } else {
        throw new Error(status);
      }
    }
    
    const xmlText = await bggResponse.text()
    for (const row of parseXml(xmlText)) {
      yield row;
    }
  }
};

const updateFromStaging = async (supabase) => {
  if (!supabase) {
    supabase = await createSupabaseClient();
  }
  log('Updating games from games_staging...');
  const gamesResponse = await supabase.rpc('update_games_from_games_staging');
  if (gamesResponse.error) {
    throw new Error(`Failed to update games: ${gamesResponse.error.message}`);
  } else {
    log('Updated games successfully!')
  }
  log('Updating expansions from expansions_staging');
  const expResponse = await supabase.rpc('update_expansions_from_expansions_staging');
  if (expResponse.error) {
    throw new Error(`Failed to update expansions: ${expResponse.error.message}`);
  } else {
    log('Updated expansions successfully!')
  }
}

const main = async () => {

  const supabase = await createSupabaseClient();

  log('Deleting all rows from games_staging...');
  const delGamesResponse = await supabase
    .from('games_staging')
    .delete()
    .not('id', 'is', null); // Supabase API requires a WHERE clause to delete records
  if (delGamesResponse.error) {
    throw new Error(delGamesResponse.error.message);
  } else {
     log('Successfully deleted games_staging rows.');
  };

  log('Deleting all rows from expansions_staging...');
  const delExpResponse = await supabase
    .from('expansions_staging')
    .delete()
    .not('id', 'is', null); // Supabase API requires a WHERE clause to delete records
  if (delExpResponse.error) {
    throw new Error(delExpResponse.error.message);
  } else {
     log('Successfully deleted expansions_staging rows.');
  };

  const [zipUrl, zipFilename] = await getZipUrl();

  log(`Downloading ${zipFilename}...`);
  const zipResponse = await fetch(zipUrl);
  if (!zipResponse.ok) {
    throw new Error(`Failed to download ${zipFilename}: ${zipResponse.status} - ${zipResponse.statusText}`);
  }
  const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());

  const csvParser = parse({ columns: true });

  // Unzip boardgames_ranks_YYYY-MM-DD.zip
  yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
    log(`Extracting ${zipFilename}...`);
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on('entry', entry => {
      zipfile.openReadStream(entry, (err, readStream) => {
        if (err) throw err;
        readStream.pipe(csvParser);
      });
    });
  });

  let gameCount = 0;
  let expansionCount = 0;
  let games = [];
  let expansions = [];
  for await (const row of bggApiCaller(csvParser)) {
    if (gameCount === 0) {
      log('Processing boardgames_ranks.csv...');
    }  
    games.push(row.game);
    expansions = expansions.concat(row.expansions);
    gameCount++;
    expansionCount += row.expansions.length;
    if (games.length >= SUPABASE_BATCH_SIZE) {
      const gamesResponse = await supabase
        .from('games_staging')
        .insert(games);
      if (gamesResponse.error) {
        throw new Error(`Failed to insert games: ${gamesResponse.error.message}`)
      } else {
        log(`Inserted ${gameCount} games so far...`);
        games = [];
      }
    }
    if (expansions.length >= SUPABASE_BATCH_SIZE) {
      const expResponse = await supabase
        .from('expansions_staging')
        .insert(expansions);
      if (expResponse.error) {
        throw new Error(`Failed to insert expansions: ${expResponse.error.message}`)
      } else {
        log(`Inserted ${expansionCount} expansions so far...`);
        expansions = [];
      }
    }
  }
  // Insert the leftovers
  if (games.length) {
    const gamesResponse = await supabase
      .from('games_staging')
      .insert(games);
    if (gamesResponse.error) {
      throw new Error(`Failed to insert games: ${gamesResponse.error.message}`)
    } else {
      log(`Inserted ${gameCount} games so far...\nSuccessfully inserted all games!`);
    }
  } else {
    log('Successfully inserted all games!');
  }
  if (expansions.length) {
    const expResponse = await supabase
      .from('expansions_staging')
      .insert(expansions);
    if (expResponse.error) {
      throw new Error(`Failed to insert expansions: ${expResponse.error.message}`)
    } else {
      log(`Inserted ${expansionCount} expansions so far...\nSuccessfully inserted all expansions!`);
    }
  } else {
    log('Successfully inserted all expansions!');
  }
  await updateFromStaging(supabase);  
};

main();