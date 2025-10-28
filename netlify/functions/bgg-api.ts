import { stream, Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = stream(async (event: HandlerEvent) => {
  
  const apiKey = process.env.BGG_API_AUTH_TOKEN;
  const urlSplit = event.rawUrl.split('/.netlify/functions/bgg-api/');
  const apiString = urlSplit[urlSplit.length - 1];

  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/${apiString}`, {
    headers: {
      ...event.headers,
      Authorization: `Bearer ${apiKey}`,
    }},
  );

  return {
    headers: {'content-type': 'text/event-stream'},
    statusCode: response.status,
    body: response.body,
  };
});