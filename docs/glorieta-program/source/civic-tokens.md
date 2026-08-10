# civic.apas.ai — extracted design tokens

Derived on 9 Aug 2026 from the live site, not from description.

Source of truth:
- `https://civic.apas.ai` (HTML head — font preloads)
- `https://civic.apas.ai/assets/index-JbpP6vEX.css` (compiled stylesheet, 31.9 KB)

The site is a Vite/React build with self-hosted woff2 fonts under
`/assets/_vinext_fonts/`. Filenames are content-hashed and will change on redeploy;
the token values below are what matter.

---

## Typefaces

| Role | Family | How it is used |
|------|--------|----------------|
| Display | **Fraunces** | All headings. Weight **600** only. Negative tracking, very tight leading. |
| Text / UI / labels | **Inter** | Body, labels, eyebrows, data. Weights 300–850 in use. |
| Mono | *none* | The site loads no monospace face. Labels get their technical feel from uppercase + heavy weight + wide tracking in Inter, not from a mono. |

Self-hosted at `/assets/_vinext_fonts/inter-9df0d028785c/` (7 woff2 subsets) and
`/assets/_vinext_fonts/fraunces-f3fc7530f62a/` (3 woff2). For standalone documents,
the Google Fonts equivalent is:

```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@300..800&display=swap
```

## Colour — `:root`

```css
--forest:#17352b;      /* primary dark green — headings, thead, dark UI */
--forest-900:#0e241d;  /* deepest green — footer, masthead */
--cream:#f5f1e8;       /* page background */
--paper:#fbf9f3;       /* card / panel background */
--ink:#1a211e;         /* body text */
--muted:#6a7a72;       /* secondary text */
--line:#ded7c6;        /* every border */
--brass:#b08948;       /* accent rules, marks */
--brass-bright:#c8a45e;
--pass:#3e7a5e;        /* success / confirmed */
--shadow:0 22px 60px -42px #0e241d5c;
```

Dark-section palette (used on the inverted "command" bands):

```css
--civic-night:#071d18;
--civic-green:#0e352a;
--civic-gold:#d6b36a;   /* brass, lightened for dark backgrounds */
--civic-cream:#f4f0e5;
--civic-mint:#b7e2ce;   /* rare, for live/active states */
```

Eyebrow text uses a hardcoded deeper brass, `#8c6a34` on light and `#d9bb78` on dark.

## Type scale (verbatim from the stylesheet)

```css
body            font: 16px/1.5 Inter;
hero h1         font: 600 clamp(54px,6vw,82px)/.98 Fraunces;  letter-spacing:-.025em;
inverted h1     font: 600 clamp(55px,7vw,104px)/.91 Fraunces; letter-spacing:-.055em;
section h2      font: 600 48px Fraunces;  (39px under 880px)
big h2          font: 600 clamp(39px,5vw,70px)/1 Fraunces; letter-spacing:-.035em;
eyebrow         11px / weight 800 / letter-spacing .16em / uppercase / #8c6a34
small label     10px / weight 850 / letter-spacing .10–.12em / uppercase
footer text     11px / letter-spacing .1em / uppercase
```

Headings never exceed weight 600. The weight lives in Inter's labels (800–850),
not in Fraunces.

## Structure

- **`border-radius: 0` everywhere.** The only `50%` in the sheet is the circular
  `.civic-mark` badge. Square corners are the single strongest signal of the identity —
  do not soften them.
- **`1px solid var(--line)`** is the universal border. Emphasis is added with a
  `4px` left border in `--brass`, not with a heavier box.
- Panels: `background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow)`.
  The shadow is very wide and very soft (`-42px` spread), so it reads as lift, not as a drop.
- Section padding rhythm: `100px clamp(24px,8vw,120px)`.
- Section heads pair a small uppercase eyebrow above a large Fraunces `h2`, flush left.
- Inverted callouts: `background:var(--forest); color:#fff; border-left:4px solid var(--brass)`.

## Applied to the Glorieta documents

All of it lives in the single `CSS = """..."""` string in `build.py`. Class names were
left unchanged during the rebrand, so the mapping from the old palette is:

| Old | Now |
|-----|-----|
| Playfair Display | Fraunces 600 |
| JetBrains Mono | Inter, uppercase + tracked (mono retained only for tabular numerals via `font-variant-numeric`) |
| `--obsidian` | `--forest-900` |
| `--gold` | `--brass` |
| `--ivory` / `--sand` | `--cream` / `--sand` (cream, one step down) |
| `border-radius: 2–4px` | `0` |
