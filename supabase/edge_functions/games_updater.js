import { DOMParser } from 'xmldom';
// import { XMLParser } from 'fast-xml-parser';
import yauzl from 'yauzl';
import { parse } from 'csv-parse';
import { asyncBatch, arrayFromAsync } from 'iter-tools';

const LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';
const BGG_CSV_URL = 'https://boardgamegeek.com/data_dumps/bg_ranks';

const getZipUrl = async () => {
  const loginResponse = await fetch(
    LOGIN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credentials: {
        username: process.env.BGG_USERNAME,
        password: process.env.BGG_PASSWORD
      }}),
    }
  );
  const cookie = await loginResponse.headers.getSetCookie();

  const csvResponse = await fetch(
    BGG_CSV_URL, {
      method: 'GET',
      headers: { cookie: cookie.join(';') }
    }
  );
  const html = await csvResponse.text();
  // console.log(await html);

  const parser = new DOMParser();
  const doc = parser.parseFromString(await html, 'text/html');
  const url = await doc
    .getElementById('maincontent')
    .getElementsByTagName('a')[0]
    .getAttribute('href');
  
  return url;
}

const zipUrl = await getZipUrl();
// console.log(zipUrl);

const zipResponse = await fetch(zipUrl);
const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
// console.log(zipBuffer);

const parser = parse({
  columns: true
});
console.log(parser);

/* const transformer = transform(
  (row, callback) => {
    callback(null, {
      id: row.id,
      name: row.name,
      yearpublished: row.yearpublished,
      rank: row.rank,
      bayesaverage: row.bayesaverage,
      average: row.average,
      is_expansion: row.is_expansion,
    });
  },
); */

// Unzip boardgames_ranks_YYYY-MM-DD.zip
yauzl.fromBuffer(await zipBuffer, { lazyEntries: true }, (err, zipfile) => {
  if (err) throw err;
  zipfile.readEntry();
  zipfile.on('entry', entry => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) throw err;
      readStream.pipe(parser);
    });
  });
});

// https://docs.python.org/3/library/itertools.html#itertools.batched
/* const batched = function* (iterable, n) {
  var batch;
  while (batch = Array.from(islice(iterable, n))) {
    yield batch;
  }
}; */

/* for await (const batch of batched(parser, 20)) {
  console.log(batch);
} */

/* const processCsv = {};
processCsv[Symbol.iterator] = async function* () {
  for await (const row of parser) {
    console.log(row);
    yield row;
  }
}; */

/* const processCsv = {
  async *[Symbol.asyncIterator]() {
    for await (const row of parser) {
      yield row;
    }
  }
}; */

// const bonk = batch(20, await processCsv);
// console.log(bonk);

// console.log(isIterable([]));

// Make API calls in batches of 20 games at a time
for await (const batch20 of await asyncBatch(20, parser)) {
  const games = new Map();
  for await (let row of batch20) {
    games.set(row.id, row);
    // We want 0 to show up as NULL in the database for sorting/filtering purposes
    for (const col of ['average', 'bayesaverage', 'rank', 'yearpublished']) {
      if (row[col] === '0') {
        row[col] = '';
      }
    }
  }  
  
  const ids = games.keys().join()
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`
  
}
