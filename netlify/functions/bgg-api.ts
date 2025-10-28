import { stream, Config, HandlerContext, Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = stream(async (event: HandlerEvent, context: HandlerContext) => {
  // const { command } = context.params;
  console.log(event);
  const apiKey = process.env.BGG_API_AUTH_TOKEN;
  const urlSplit = event.rawUrl.split('/.netlify/functions/bgg-api/');
  const apiString = urlSplit[urlSplit.length - 1];
  // req.url = `https://boardgamegeek.com/xmlapi2/${apiString}`;
  // req.headers.append('Authorization', `Bearer ${apiKey}`);
  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/${apiString}`, {
    headers: {
      ...event.headers,
      Authorization: `Bearer ${apiKey}`,
    }},
  );
  console.log(response);
  // const text = response.text();
  // console.log(text);
  return {
    headers: {'content-type': 'text/event-stream'},
    // ...response,
    statusCode: response.status,
    body: response.body,
  };
});

// export const config: Config = {
//   path: "/bgg-api/:command"
// };