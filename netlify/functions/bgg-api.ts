import { Config, Context, Handler } from '@netlify/functions';

export const handler: Handler = async (req: Request, context: Context) => {
  // const { command } = context.params;
  console.log(req);
  const apiKey = process.env.BGG_API_AUTH_TOKEN;
  const urlSplit = req.rawUrl.split('/.netlify/functions/bgg-api/');
  const apiString = urlSplit[urlSplit.length - 1];
  // req.url = `https://boardgamegeek.com/xmlapi2/${apiString}`;
  // req.headers.append('Authorization', `Bearer ${apiKey}`);
  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/${apiString}`, {
    headers: {
      ...req.headers,
      Authorization: `Bearer ${apiKey}`,
    }},
  );
  console.log(response);
  return {
    ...response,
    statusCode: response.status,
  };
};

export const config: Config = {
  path: "/bgg-api/:command"
};