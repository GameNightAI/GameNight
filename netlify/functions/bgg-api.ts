import { Config, HandlerContext, Handler, HandlerEvent } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
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
  return {
    // ...response,
    statusCode: response.status,
    body: response.text(),
  };
};

// export const config: Config = {
//   path: "/bgg-api/:command"
// };