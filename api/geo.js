export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  const country = request.headers.get('x-vercel-ip-country') || '';
  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
    },
  });
}
