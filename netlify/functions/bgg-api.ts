import { stream, Handler, HandlerEvent } from '@netlify/functions';

// Add our secret BGG authorization token to the HTTP request's headers,
// then submit the API request to BGG, returning the response status & body.
// See https://boardgamegeek.com/using_the_xml_api#toc10 for details.
export const handler: Handler = stream( async (event: HandlerEvent) => {
  
  const apiKey = process.env.BGG_API_AUTH_TOKEN;  // secret
  const urlSplit = event.rawUrl.split('/.netlify/functions/bgg-api/');
  const apiString = urlSplit[urlSplit.length - 1];

  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/${apiString}`,
    { headers: {
      ...event.headers,
      'Authorization': `Bearer ${apiKey}`,
    }},
  );

  return {
    headers: {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': '*',
    },
    statusCode: response.status,
    body: response.body,
  };
});