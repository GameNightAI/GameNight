export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const stats = url.searchParams.get('stats');

    if (!id) {
      return new Response('Game ID is required', { status: 400 });
    }

    const bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${id}${stats ? '&stats=1' : ''}`;
    
    const response = await fetch(bggUrl);
    const responseText = await response.text();

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