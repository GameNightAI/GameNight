import { XMLParser } from 'fast-xml-parser';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    const subtype = url.searchParams.get('subtype');
    const own = url.searchParams.get('own');

    if (!username) {
      return new Response('Username is required', { status: 400 });
    }

    const bggUrl = `/.netlify/functions/bgg-api/collection?username=${encodeURIComponent(username)}&subtype=${subtype}&own=${own}`;
    
    const response = await fetch(bggUrl);
    const responseText = await response.text();

    // If BGG returns a "please wait" message
    if (responseText.includes('Please wait')) {
      return new Response('Please wait', { status: 202 });
    }

    return new Response(responseText, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Failed to fetch data from BGG', { status: 500 });
  }
}