import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BOARD_GAMES = 30;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type BoardGameDetection = { title: string; bgg_id: number };

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function normalizeBase64(input: string): string {
  let value = input.trim();
  const dataUrlMatch = /^data:[^;]+;base64,(.+)$/i.exec(value);
  if (dataUrlMatch) {
    value = dataUrlMatch[1];
  }
  return value.replace(/\s/g, '');
}

function decodeBase64Image(imageBase64: string): Buffer | null {
  const normalized = normalizeBase64(imageBase64);
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return null;
  }

  const buffer = Buffer.from(normalized, 'base64');
  if (buffer.length === 0 && normalized.length > 0) {
    return null;
  }

  return buffer;
}

function validateBoardGames(raw: unknown): BoardGameDetection[] {
  if (!raw || typeof raw !== 'object' || !('boardGames' in raw)) {
    throw new Error('OpenAI response missing boardGames');
  }

  const { boardGames } = raw as { boardGames: unknown };
  if (!Array.isArray(boardGames)) {
    throw new Error('OpenAI boardGames is not an array');
  }

  const seen = new Set<number>();
  const validated: BoardGameDetection[] = [];

  for (const item of boardGames) {
    if (!item || typeof item !== 'object') continue;

    const title = typeof (item as { title?: unknown }).title === 'string'
      ? (item as { title: string }).title.trim()
      : '';
    const bggIdRaw = (item as { bgg_id?: unknown }).bgg_id;
    const bgg_id = typeof bggIdRaw === 'number'
      ? bggIdRaw
      : Number(bggIdRaw);

    if (!title || !Number.isInteger(bgg_id) || bgg_id <= 0 || seen.has(bgg_id)) {
      continue;
    }

    seen.add(bgg_id);
    validated.push({ title, bgg_id });

    if (validated.length >= MAX_BOARD_GAMES) {
      break;
    }
  }

  return validated;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured');
    return jsonResponse(500, { error: 'Failed to analyze image' });
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { imageBase64 } = body;

  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return jsonResponse(400, { error: 'Missing image data' });
  }

  let mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : 'image/jpeg';
  if (!body.mimeType) {
    console.log('analyze: mimeType omitted; defaulting to image/jpeg');
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return jsonResponse(400, { error: 'Unsupported image type' });
  }

  const imageBuffer = decodeBase64Image(imageBase64);
  if (!imageBuffer) {
    return jsonResponse(400, { error: 'Invalid image data' });
  }

  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    return jsonResponse(413, { error: 'Photo is too large. Try a closer crop or retake.' });
  }

  const normalizedBase64 = normalizeBase64(imageBase64);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image of physical board games.
1. Identify all board game titles visible in the image.
2. For each game, find the most likely matching game on boardgamegeek.com.
3. Return JSON matching the schema with a "boardGames" array.

Only include games you are confident about.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${normalizedBase64}`,
                detail: 'auto',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'board_game_detections',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              boardGames: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    bgg_id: { type: 'integer' },
                  },
                  required: ['title', 'bgg_id'],
                  additionalProperties: false,
                },
              },
            },
            required: ['boardGames'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      console.error('OpenAI returned empty response');
      return jsonResponse(500, { error: 'Failed to analyze image' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('OpenAI raw content:', content);
      return jsonResponse(500, { error: 'Failed to analyze image' });
    }

    let boardGames: BoardGameDetection[];
    try {
      boardGames = validateBoardGames(parsed);
    } catch (validationError) {
      console.error('OpenAI response validation failed:', validationError);
      console.error('OpenAI parsed content:', parsed);
      return jsonResponse(500, { error: 'Failed to analyze image' });
    }

    return jsonResponse(200, { boardGames });
  } catch (error: unknown) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return jsonResponse(429, { error: 'Analysis service is busy. Please retry.' });
      }
      console.error('OpenAI API error:', error.status, error.message);
    } else {
      console.error('Analyze image error:', error);
    }

    return jsonResponse(500, { error: 'Failed to analyze image' });
  }
};
