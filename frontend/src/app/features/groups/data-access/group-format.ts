import { intlLocale } from '../../../core/language';

/**
 * How Group details read in the current Language. An Exchange Date is a calendar day with no time zone, so it is
 * formatted as that day in UTC, where `YYYY-MM-DD` is parsed.
 */

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
};

const LONG_DATE: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};

/** `2026-12-24` → "24 dic 2026" / "Dec 24, 2026". */
export function shortExchangeDate(isoDate: string): string {
  return new Intl.DateTimeFormat(intlLocale(), SHORT_DATE).format(new Date(isoDate));
}

/** `2026-12-24` → "jueves, 24 de diciembre de 2026" / "Thursday, December 24, 2026". */
export function longExchangeDate(isoDate: string): string {
  return new Intl.DateTimeFormat(intlLocale(), LONG_DATE).format(new Date(isoDate));
}

/** Today's calendar day in Madrid, the app's one time zone, as `YYYY-MM-DD` (en-CA writes it so). */
const MADRID_DAY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Madrid',
});

/** The earliest Exchange Date a new Group can have: tomorrow in Madrid, as `YYYY-MM-DD`. */
export function earliestExchangeDate(now: Date = new Date()): string {
  const tomorrow = new Date(MADRID_DAY.format(now));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}
