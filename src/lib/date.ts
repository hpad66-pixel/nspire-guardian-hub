/**
 * WS-2 · Date-only (no time) serialization helpers.
 *
 * Bug #6: date-only values were serialized with `d.toISOString().split('T')[0]`.
 * toISOString() converts to UTC, so a Date at LOCAL midnight (what a
 * <Calendar> picker produces) becomes the previous calendar day for any
 * positive UTC offset (e.g. UTC+3 -> 21:00 the day before -> wrong date).
 *
 * Use these for DATE columns (start_date, due_date, meeting_date, ...).
 * Do NOT use them for true timestamps (reviewed_at, completed_at, ...);
 * those are instants and `new Date().toISOString()` is correct there.
 *
 *   toDateOnly(new Date(2026, 5, 11))  -> "2026-06-11"  (local calendar day)
 *   fromDateOnly("2026-06-11")          -> Date at local noon (DST/UTC-safe)
 */
import { format, parseISO } from 'date-fns';

/** Serialize a Date to a `yyyy-MM-dd` string using its LOCAL calendar day. */
export function toDateOnly(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Parse a `yyyy-MM-dd` string to a Date anchored at local noon, so rendering
 * and re-serialization never cross a day boundary regardless of timezone.
 */
export function fromDateOnly(s: string): Date {
  return parseISO(`${s}T12:00:00`);
}
