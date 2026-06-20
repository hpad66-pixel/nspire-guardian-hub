# Proj OS — Showcase Video Design System

## Brand
Proj OS (Build OS) — the operating system for property & construction.
Mood: confident, premium, operational, momentum. Audience: GCs, owners, property pros.

## Palette
| Token | Hex | Use |
|-------|-----|-----|
| Ink (bg) | `#14110E` | Primary video background (deep warm near-black) |
| Ink-2 | `#1F1A15` | Panel / card surfaces |
| Cream (fg) | `#FDFCF9` | Headlines, primary text |
| Muted | `#A8A29A` | Secondary text, labels |
| Sapphire | `#1D6FE8` | Brand accent, CTAs, active states, data-up |
| Gold | `#C4A35A` | Secondary accent, highlights, premium detail |
| Emerald | `#10B981` | Success, money-in, positive deltas |
| Amber | `#F59E0B` | Warnings, attention |
| Rose | `#F43F5E` | Overdue / critical |
| Hairline | `rgba(253,252,249,0.10)` | Borders, dividers |

## Typography
- Display / headlines: **Playfair Display** (700, 900)
- Body / UI: **DM Sans** (400, 500, 700)
- Data / numbers / mono: **JetBrains Mono** (400, 500, 700) — always `tabular-nums`

## Corners & Depth
- Corners: rounded, 14–20px on cards, 999px on pills.
- Depth: localized glows (sapphire/gold) behind hero elements; no full-screen gradients on the dark bg (banding). Solid ink + radial glow only.

## Motion
- Confident and smooth: `power3.out` / `expo.out` entrances, `power2.in` for the rare exit.
- Numbers count up. Bars wipe in. Cards rise with slight scale. Accent underlines draw.

## What NOT to do
- No pure black `#000`, no `#3b82f6`, no Roboto/Arial.
- No light cream as the full background (washes out in H.264) — cream is for text and inset "device" panels only.
- No flat full-screen gradients on dark.
