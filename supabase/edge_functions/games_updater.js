import { DOMParser } from 'xmldom';
import { XMLParser } from 'fast-xml-parser';
// import unzip from 'unzip-js';
// import XMLHttpRequest from 'xhr2';
// import zlib from 'node:zlib';
// import StreamZip from 'node-stream-zip';
import yauzl from 'yauzl';
import { parse } from 'csv-parse';
// import { transform } from 'stream-transform';

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
  console.log(await html);

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
  zipfile.on('entry', (entry) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) throw err;
      readStream.pipe(parser);
    });
  });
});



//console.log(parser);
//parser.pipe(transformer).pipe(process.stdout);

/* zlib.inflateRaw(await zipResponse.arrayBuffer(), (err, decompBuffer) => {
  if (err) throw err;
  console.log(decomp);
}); */

/* unzip(zipUrl, (err, zipFile) => {
  zipFile.readEntries((err, entries) =>
    entries.forEach(entry => console.log(entry))
  );
}); */