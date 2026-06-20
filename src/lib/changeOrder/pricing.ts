/**
 * Pricing math for the CO generator. The skill carries money as pre-formatted
 * strings and never silently recomputes; here we DO recompute as the user edits
 * the grid (extended = qty × unit, subtotals, markups, grand total) so the
 * human-in-the-loop sees live numbers, then we freeze them into the spec.
 */
import type { CoPricing } from "./types";
import { money, parseMoney } from "./defaults";

/** Recompute every derived figure in a pricing block from its raw inputs. */
export function recomputePricing(pricing: CoPricing): CoPricing {
  let groupsTotal = 0;

  const groups = pricing.groups.map((g, gi) => {
    let subtotal = 0;
    const rows = g.rows.map((r) => {
      const qty = parseMoney(r.qty);
      const unit = parseMoney(r.unit_cost);
      const extended = qty * unit;
      subtotal += extended;
      return { ...r, extended: money(extended) };
    });
    groupsTotal += subtotal;
    const letter = String.fromCharCode(65 + gi); // A, B, C…
    return {
      ...g,
      rows,
      subtotal: { label: g.subtotal?.label || `Subtotal ${letter}`, amount: money(subtotal) },
    };
  });

  // Markups whose amount is a "%" expression compute off the groups total;
  // a plain dollar string is taken as-is (mirrors the skill's explicit waivers).
  let markupTotal = 0;
  const markups = pricing.markups.map((m) => {
    const pctMatch = String(m.amount).trim().match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (pctMatch) {
      const amt = (parseFloat(pctMatch[1]) / 100) * groupsTotal;
      markupTotal += amt;
      return { ...m, amount: money(amt) };
    }
    const amt = parseMoney(m.amount);
    markupTotal += amt;
    return { ...m, amount: money(amt) };
  });

  const grand = groupsTotal + markupTotal;
  return {
    ...pricing,
    groups,
    markups,
    grand_total: { ...pricing.grand_total, amount: money(grand) },
  };
}

/** The numeric grand total (for writing change_orders.amount). */
export function grandTotalNumber(pricing: CoPricing): number {
  return parseMoney(recomputePricing(pricing).grand_total.amount);
}
