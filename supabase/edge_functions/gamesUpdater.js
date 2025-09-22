import { DOMParser } from 'xmldom';
import { XMLParser } from 'fast-xml-parser';
import yauzl from 'yauzl';
import { parse } from 'csv-parse';
import { asyncBatch } from 'iter-tools';

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
      headers: { cookie: cookie.join(';') }
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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // textNodeName: 'value',
});

const parseXml = function* (text) {
  
  let games = parser.parse(text).items.item;
  // console.log(games);
  // Handle edge case where the final batch of games is a single item
  if (!Array.isArray(games)) {
    games = [games];
  }
  for (const game of games) {
    const row = {};
    for (const poll of game.poll) {
      if (poll.name === 'suggested_playerage') {
        // Avoid division by zero
        if (poll.totalvotes === '0') {
          row.suggested_playerage = null;
        } else {
          let ageSum = 0;
          let voteSum = 0;
          console.log(poll.results.result);
          for (const result in poll.results) {
            console.log(result);
            const age = parseInt(result.value);
            const voteCount = parseInt(result.numvotes);
            ageSum += age * voteCount;
            voteSum += voteCount;
            console.log(ageSum, voteSum);
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
        for (const result in summary.result) {
          if (result.name === 'bestwith') {
            row.best_players = null; // TODO
          } else if (result.name === 'recommmendedwith') {
            row.rec_players = null; // TODO
          }
        }
      }
    }
    row.expansions = [];
    // Don't get expansions of expansions, just of base games
    if (game.type === 'boardgame') {
      for (const link of game.link) {
        if (link.type === 'boardgameexpansion') {
          row.expansions.push(link.id);
        }
      }
    }
    row.id = game.id;
    // NULL out 0 for filtering purposes (0 means no value)
    row.minplaytime = parseInt(game.minplaytime.value) || null;
    row.maxplaytime = parseInt(game.maxplaytime.value) || null;
    row.playing_time = parseInt(game.playingtime.value) || null;
    row.min_players = parseInt(game.minplayers.value) || null;
    row.max_players = parseInt(game.maxplayers.value) || null;
    row.min_age = parseInt(game.minage.value) || null;
    row.image_url = game.image;
    row.thumbnail = game.thumbnail;
    // NULL out complexity=0 for filtering purposes, and in case we ever decide to do some math (0 means no votes)
    row.complexity = parseFloat(game.statistics.ratings.averageweight.value) || null;
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
    yield row;
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
    const games = new Map();
    for await (const row of batch) {
      games.set(row.id, row);
      // We want 0 to show up as NULL in the database for sorting/filtering purposes
      for (const col of ['average', 'bayesaverage', 'rank', 'yearpublished']) {
        if (row[col] === '0') {
          row[col] = null;
        }
      }
    }
    
    const ids = Array.from(games.keys()).join();
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;
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
    for await (const row of parseXml(xmlText)) {
      gameCount++;
    }
  }
};

main();