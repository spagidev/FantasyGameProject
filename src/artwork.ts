/**
 * Optional illustrations. Every image in src/art/** is bundled when it exists; a missing
 * file is simply absent from these tables and the interface falls back to its built-in
 * graphics. See docs/ART_BRIEF.md for names and sizes.
 */
function table(files: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([path, url]) => [
      path.slice(path.lastIndexOf('/') + 1).replace(/\.webp$/, ''),
      url as string,
    ]),
  );
}
// Vite requires the glob options to be written out literally at each call.
export const FOE_ART = table(
  import.meta.glob('./art/foes/*.webp', { eager: true, query: '?url', import: 'default' }),
);
export const RELIC_ART = table(
  import.meta.glob('./art/relics/*.webp', { eager: true, query: '?url', import: 'default' }),
);
export const SITE_ART = table(
  import.meta.glob('./art/sites/*.webp', { eager: true, query: '?url', import: 'default' }),
);
export const SCENE_ART = table(
  import.meta.glob('./art/scenes/*.webp', { eager: true, query: '?url', import: 'default' }),
);
export const WORK_ART = table(
  import.meta.glob('./art/works/*.webp', { eager: true, query: '?url', import: 'default' }),
);
export const PROVINCE_ART = table(
  import.meta.glob('./art/provinces/*.webp', { eager: true, query: '?url', import: 'default' }),
);
