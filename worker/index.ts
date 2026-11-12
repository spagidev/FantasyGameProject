import { createAtlasService, type AtlasEnvironment } from './atlas-service';
declare function serveGame(request: Request): Response;
const handleAtlas = createAtlasService();
export default {
  async fetch(request: Request, env: AtlasEnvironment) {
    const path = new URL(request.url).pathname;
    if (path === '/api/atlas') return handleAtlas(request, env);
    if (path.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return serveGame(request);
  },
};
