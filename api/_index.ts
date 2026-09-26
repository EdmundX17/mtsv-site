import type { Request, Response } from 'express';
import { createApp } from '../server';

const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  const route = req.query.route;
  if (typeof route === 'string' && route.startsWith('/')) {
    const query = new URLSearchParams(req.query as Record<string, string>);
    query.delete('route');
    req.url = route + (query.size ? `?${query.toString()}` : '');
  }
  const app = await appPromise;
  return app(req, res);
}
