import { sql, type SQLWrapper } from 'drizzle-orm';

/**
 * DATETIME columns hold UTC: drizzle writes a Date as its ISO (UTC) time. Calendar functions
 * such as YEAR(), MONTH() and DATE() must work in the agency's local time instead, or anything
 * recorded between midnight and 8 a.m. falls into the previous day, month or year.
 * Philippine Standard Time is UTC+8 with no daylight saving.
 */
export const LOCAL_UTC_OFFSET_HOURS = 8;

/** A DATETIME column converted to local time, for YEAR(), MONTH() and DATE() */
export function localTime(column: SQLWrapper) {
  return sql`(${column} + INTERVAL ${sql.raw(String(LOCAL_UTC_OFFSET_HOURS))} HOUR)`;
}
