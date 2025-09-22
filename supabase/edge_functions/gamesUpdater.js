import { DOMParser } from 'xmldom';
import { XMLParser } from 'fast-xml-parser';
import yauzl from 'yauzl'; // "yet another unzip library" for node
import { parse } from 'csv-parse';
import { asyncBatch, asyncToArray, asyncMap } from 'iter-tools';

const LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';
const BGG_CSV_URL = 'https://boardgamegeek.com/data_dumps/bg_ranks';
const SLEEP_TIME = 5 // seconds to wait before retrying BGG API request
const DASH = '–' // NOT the hyphen character on the keyboard
const TAXONOMY_DELIMITER = '|';

const getZipUrl = async () => {
  
  const username = process.env.BGG_USERNAME;
  console.log(`Logging ${username} in to BGG...`);
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
    console.log('Successfully logged in.');
  } else {
    throw new Error(`Failed to log in: ${loginResponse.status} - ${loginResponse.statusText}`);
  }
  const cookie = await loginResponse.headers.getSetCookie();

  console.log(`Fetching BGG zip URL from ${BGG_CSV_URL}...`);
  const csvResponse = await fetch(
    BGG_CSV_URL, {
      method: 'GET',
      headers: { cookie: cookie.join(';') },
    }
  );
  
  const html = await csvResponse.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(await html, 'text/html');
  const hyperlink = await doc
    .getElementById('maincontent')
    .getElementsByTagName('a')[0];
  
  const url = await hyperlink.getAttribute('href');
  const filename = await hyperlink.getAttribute('download');
  
  return [url, filename];
}

const hasTaxonomy = (game, type, value) => (
  game.link.some(link =>
    link.type === type && link.value === value
  )
);

const parseSuggestedPlayers = (text) => (
  text
    .replaceAll(DASH, '-')
    .split('')
    .filter(c => '01234567890,+-'.includes(c))
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
    console.log(row);
    
    let names = game.name;
    if (!Array.isArray(names)) {
      names = [names];
    }
    console.log(names);
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
    // Don't get expansions of expansions, just of base games
    if (!row.is_expansion) {
      for (const link of game.link) {
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
    if (!Array.isArray(ranks)) {
      ranks = [ranks];
    }
    for (const { type, name, value } of ranks) {
      if (type === 'subtype' && name === 'boardgame') {
        row.rank = parseInt(value) || null;
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
    row.audio_url = null;
    row.description = null; // Leaving blank until we have more database storage
    row.is_cooperative = hasTaxonomy(game, 'boardgamemechanic', 'Cooperative Game');
    row.is_teambased = hasTaxonomy(game, 'boardgamemechanic', 'Team-Based Game');
    // BGG taxonomy
    for (const type of ['boardgamecategory', 'boardgamemechanic', 'boardgamefamily']) {
      row[type] = game.link
        .filter(link => link.type === type)
        .map(link => link.value)
        .join(TAXONOMY_DELIMITER);
    }
    console.log(row);
    console.log(expansions);
    yield [row, expansions];
  }
}

const main = async () => {

  const [zipUrl, zipFilename] = await getZipUrl();

  console.log(`Downloading ${zipFilename}...`);
  const zipResponse = await fetch(zipUrl);
  const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());

  const parser = parse({ columns: true });

  // Unzip boardgames_ranks_YYYY-MM-DD.zip
  yauzl.fromBuffer(await zipBuffer, { lazyEntries: true }, (err, zipfile) => {
    console.log(`Extracting ${zipFilename}...`);
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on('entry', entry => {
      zipfile.openReadStream(entry, (err, readStream) => {
        if (err) throw err;
        readStream.pipe(parser);
      });
    });
  });

  let gameCount = 0;
  // Make API calls in batches of 20 games at a time
  for await (const batch of await asyncBatch(20, parser)) {
    if (gameCount === 0) {
      console.log('Processing boardgames_ranks.csv...');
    }
    
    const ids = await asyncToArray(asyncMap((_ => _.id), batch));
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids.join()}&stats=1`;
    console.log(url);
    let response;
    
    while (1) {
      response = await fetch(url);
      const status = `${response.status} - ${response.statusText}`;
      if (response.ok) {
        // console.log(response)
        break;
      } else if ([
        429, // Too many requests
        502, // Bad gateway
      ].includes(response.status)) {
        console.log(`${status}: Waiting ${SLEEP_TIME} seconds before resubmitting request...`);
        await new Promise(resolve => setTimeout(resolve, SLEEP_TIME * 1000));
      } else {
        throw new Error(status);
      }
    }
    
    let xmlText = await response.text();
    // console.log(xmlText);
    for await (const [game, expansions] of parseXml(xmlText)) {
      gameCount++;
    }
  }
};

main();