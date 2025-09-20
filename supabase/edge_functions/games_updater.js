import { DOMParser } from 'xmldom';
// import { XMLParser } from 'fast-xml-parser';
import yauzl from 'yauzl';
import { parse } from 'csv-parse';
import { asyncBatch } from 'iter-tools';

const LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';
const BGG_CSV_URL = 'https://boardgamegeek.com/data_dumps/bg_ranks';
const SLEEP_TIME = 5 // seconds to wait before retrying BGG API request

const getZipUrl = async () => {
  
  const username = process.env.BGG_USERNAME
  console.log(`Logging ${username} in to BGG...`);
  const loginResponse = await fetch(
    LOGIN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credentials: {
        username: username,
        password: process.env.BGG_PASSWORD
      }}),
    }
  );
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
    .getElementsByTagName('a')[0]
  
  const url = await hyperlink.getAttribute('href');
  const filename = await hyperlink.getAttribute('download');
  
  return [url, filename];
}

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
console.log('Processing boardgames_ranks.csv...');
// Make API calls in batches of 20 games at a time
for await (const batch of await asyncBatch(20, parser)) {
  const games = new Map();
  for await (let row of batch) {
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
  let response;
  
  while (1) {
    response = await fetch(url);
    const status = `${response.status} - ${response.statusText}`;
    if (response.ok) {
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
}
