import { intlLocale } from '../../../core/language';

/**
 * A Group's Time Zone (an IANA id such as `Europe/Madrid`) as the forms offer it and the Group page
 * names it. The day each Mailbox Message shows is cut in it, server-side.
 */

const UTC = 'UTC';

const REGIONS: Readonly<Record<string, string>> = {
  Africa: $localize`África`,
  America: $localize`América`,
  Antarctica: $localize`Antártida`,
  Arctic: $localize`Ártico`,
  Asia: $localize`Asia`,
  Atlantic: $localize`Atlántico`,
  Australia: $localize`Australia`,
  Europe: $localize`Europa`,
  Indian: $localize`Índico`,
  Pacific: $localize`Pacífico`,
};

/** The region of the ids without a known one, UTC among them; it goes last. */
const OTHERS = $localize`Otras`;

export interface TimeZoneOption {
  readonly id: string;
  /** The place, e.g. "New York" or "Buenos Aires (Argentina)". */
  readonly label: string;
}

export interface TimeZoneRegion {
  /** E.g. "Europa"; "Otras" for ids without a known region, UTC among them. */
  readonly name: string;
  readonly zones: readonly TimeZoneOption[];
}

/** The browser's Time Zone, the default for a new Group; UTC if the browser does not say. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || UTC;
}

/** `America/New_York` → "New York"; `UTC` → "UTC". */
export function timeZoneCity(id: string): string {
  const parts = id.split('/');
  return (parts.length > 1 ? parts[parts.length - 1] : id).replaceAll('_', ' ');
}

/** "Fechas en hora de New York", or "Fechas en hora UTC" for UTC. */
export function timeZoneNote(id: string): string {
  return id === UTC
    ? $localize`Fechas en hora UTC`
    : $localize`Fechas en hora de ${timeZoneCity(id)}:city:`;
}

/**
 * Every Time Zone the browser knows, grouped by region and sorted by place, plus UTC and each of
 * `alsoOffer` (the Group's current one, the browser's) in case the browser's list lacks them.
 */
export function timeZoneRegions(alsoOffer: readonly string[] = []): TimeZoneRegion[] {
  const ids = new Set([...Intl.supportedValuesOf('timeZone'), UTC, ...alsoOffer]);
  const regions = new Map<string, TimeZoneOption[]>();
  for (const id of ids) {
    const [region, ...rest] = id.split('/');
    const name = rest.length > 0 && REGIONS[region] ? REGIONS[region] : OTHERS;
    const zones = regions.get(name) ?? [];
    zones.push({ id, label: label(id, rest) });
    regions.set(name, zones);
  }
  return [...regions.entries()]
    .sort(([a], [b]) => (a === OTHERS ? 1 : b === OTHERS ? -1 : a.localeCompare(b, intlLocale())))
    .map(([name, zones]) => ({
      name,
      zones: zones.sort((a, b) => a.label.localeCompare(b.label, intlLocale())),
    }));
}

function label(id: string, rest: readonly string[]): string {
  if (rest.length < 2) {
    return timeZoneCity(id);
  }
  return `${timeZoneCity(id)} (${rest.slice(0, -1).join(' / ').replaceAll('_', ' ')})`;
}
