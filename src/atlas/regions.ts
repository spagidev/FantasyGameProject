/** Region selection is public; a generated chart's city stays out of the setup UI. */
export const SLOVAK_REGIONS = [
  { name: 'Bratislavský kraj', code: 'SK-BL', aliases: ['bratislava region', 'bratislavsky'] },
  { name: 'Trnavský kraj', code: 'SK-TA', aliases: ['trnava region', 'trnavsky'] },
  { name: 'Trenčiansky kraj', code: 'SK-TC', aliases: ['trencin region', 'trenciansky'] },
  { name: 'Nitriansky kraj', code: 'SK-NI', aliases: ['nitra region', 'nitriansky'] },
  { name: 'Žilinský kraj', code: 'SK-ZI', aliases: ['zilina region', 'zilinsky'] },
  {
    name: 'Banskobystrický kraj',
    code: 'SK-BC',
    aliases: ['banska bystrica region', 'banskobystricky'],
  },
  { name: 'Prešovský kraj', code: 'SK-PV', aliases: ['presov region', 'presovsky'] },
  { name: 'Košický kraj', code: 'SK-KI', aliases: ['kosice region', 'kosicky'] },
] as const;
export const normalizePlace = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
export function regionQuery(input: string) {
  const name = input.trim();
  if (name.length < 2 || name.length > 100)
    throw new Error('Enter a country or administrative region, up to 100 characters.');
  const normalized = normalizePlace(name);
  const region = SLOVAK_REGIONS.find((r) =>
    [r.name, r.code, ...r.aliases, `${r.name}, Slovakia`, `${r.name}, Slovensko`].some(
      (n) => normalizePlace(n) === normalized,
    ),
  );
  if (region) return { label: region.name, selector: `area["ISO3166-2"="${region.code}"]` };
  if (['slovakia', 'slovensko', 'slovakrepublic', 'sk'].includes(normalized))
    return { label: 'Slovakia', selector: 'area["ISO3166-1"="SK"]["admin_level"="2"]' };
  // Literal tag equality: user input is never interpolated as an Overpass program or regex.
  const quoted = JSON.stringify(name);
  return {
    label: name,
    selector: `(${['name', 'name:en', 'official_name', 'ISO3166-2', 'ISO3166-1'].map((key) => `area["boundary"="administrative"]["admin_level"~"^[2-6]$"][${JSON.stringify(key)}=${quoted}];`).join('')})`,
  };
}
