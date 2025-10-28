import { Config, Context, Handler } from '@netlify/functions';

export default const handler: Handler = async (req: Request, context: Context) => {
  // const { command } = context.params;
  const apiKey = Netlify.env.get('BGG_API_AUTH_TOKEN');
  const urlSplit = req.url.split('/.netlify/functions/bgg-api/');
  const apiString = urlSplit[urlSplit.length - 1];
  req.url = `https://boardgamegeek.com/xmlapi2/${apiString}`;
  req.headers.append('Authorization', `Bearer ${apiKey}`);
  return await req;
};

// export const config: Config = {
//   path: "/bgg-api/:command"
// };