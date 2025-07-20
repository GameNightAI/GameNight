**dont forget to add the OPENAI API key to the .env file**

import { Handler } from '@netlify/functions';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { imageBase64 } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: 'Missing image data',
      };
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text',
              text: `You are analyzing an image that contains a collection of physical board games.         
              
              1. Identify all board game titles visible in the image.
              2. For each game, find the most likely matching game on boardgamegeek.com.
              3. Return your response as a JSON array. Each item should include:
                - "title": the name of the game
                - "bgg_id": the BoardGameGeek numeric ID of that game (from its URL)

              Only include games you are confident about. Do NOT include extra commentary.

              Example format:
              [
                { "title": "Catan", "bgg_id": 13 },
                { "title": "Azul", "bgg_id": 230802 }
              ]`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

  let boardGames: { title: string; bgg_id: number }[] = [];

  try {
    const resultText = completion.choices[0]?.message?.content || '[]';
    boardGames = JSON.parse(resultText);
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to parse OpenAI response.' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ boardGames }),
  };
 } catch (error: any) {
    console.error('OpenAI error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to analyze image' }),
    };
  }
};
