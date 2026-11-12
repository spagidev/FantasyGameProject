/** Rebuild the shipped historical road charts from the separately licensed source database. */
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { build } from 'esbuild';
const result = await build({
  stdin: {
    contents:
      "export { compileChart } from './src/atlas/compile'; export { SLOVAK_REGIONS } from './src/atlas/regions';",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { compileChart, SLOVAK_REGIONS } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64')
);
const input = JSON.parse(gunzipSync(await readFile('public/atlas/slovakia-source.json.gz')));
const charts = {},
  index = [];
for (const entry of input.charts) {
  const region = SLOVAK_REGIONS.find((r) => r.code === entry.region);
  const query = `Historical road extract ${entry.id}; OSM_roads_slovakia at ${input.roadsRevision}; 4.1 x 3.4 km around the city centre. Coordinate-shared source vertices form the road graph; these are derived graph IDs, not OSM node IDs.`;
  try {
    charts[entry.id] = compileChart(entry.elements, entry.city, region.name, null, query, {
      licence: 'ODbL-1.0',
      retrieved: input.retrieved,
      provider: 'OpenStreetMap / Geofabrik',
      snapshot: 'Roads published April 2022; exact OSM edit date unknown',
      url: `${input.roadsRepository}/tree/${input.roadsRevision}/sample_data`,
      query,
    });
    index.push({ id: entry.id, region: region.code });
    console.log(
      entry.id,
      entry.city.tags.name,
      charts[entry.id].features.length,
      'features',
      charts[entry.id].edges.length,
      'roads',
    );
  } catch (error) {
    console.error(entry.id, entry.city.tags.name, error.message);
    process.exitCode = 1;
  }
}
if (!process.exitCode) {
  await writeFile('src/atlas/bundled-charts.json', JSON.stringify(charts));
  await writeFile(
    'public/atlas/slovakia-charts.json.gz',
    gzipSync(JSON.stringify(charts), { level: 9 }),
  );
  await writeFile('src/atlas/bundled-index.json', JSON.stringify(index));
  console.log('Built', index.length, 'bundled charts.');
}
