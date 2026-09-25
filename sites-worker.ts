const CLOUD_RUN_ORIGIN = 'https://military-tycoon-value-list-903099188173.us-west1.run.app';

type Environment = {
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

async function fromCloudRun(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, CLOUD_RUN_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('x-forwarded-host');

  const upstream = await fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  }));

  const responseHeaders = new Headers(upstream.headers);
  const location = responseHeaders.get('location');
  if (location?.startsWith(CLOUD_RUN_ORIGIN)) {
    responseHeaders.set('location', location.replace(CLOUD_RUN_ORIGIN, incoming.origin));
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return fromCloudRun(request);

    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
        const index = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
        if (index.status !== 404) return index;
      }
    }

    return fromCloudRun(request);
  },
};
