# APAS Civic design tokens

Derived from civic.apas.ai screenshots (9 Aug 2026), not from the site's stylesheet —
the Cowork sandbox cannot reach the domain. If the real font turns out to be a licensed
face (Reckless Neue, Editorial New, Signifier and similar all look close), swap the
`--serif` stack in `source/civic_css.py` and rebuild; nothing else needs to change.

## What changed from the previous system, and why

| | Before (rejected) | Now |
|---|---|---|
| Display serif | Playfair Display | **Fraunces**, `SOFT 0 / WONK 0 / opsz 144` — chunkier, higher contrast, larger x-height |
| UI / body | Inter | **Inter** (unchanged) |
| Labels | JetBrains Mono | **Inter 700**, uppercase, `.17em` tracking — *no monospace anywhere on civic* |
| Dark ground | Obsidian `#0D0D12` | Forest `#17291F` |
| Light ground | Ivory `#FAF8F3` | Cream `#F6F2E9` + sand `#EDE6D8` + mint `#E1ECE3` |
| Accent | Gold `#C8962E` | Tan-gold `#D8A95E` fill / `#A8842C` on light + sage `#A9D4B8` |
| Corners | 3px radius | **Square** |
| Depth | Soft shadows | **Hairline borders**, shadow only on hover |

The three biggest tells on civic.apas.ai: serif is used for *every* heading level including
small card titles; there is no monospace at all; and cards sit in a shared-hairline grid
rather than as separate floating boxes.

## Palette

```
--forest        #17291F   hero, dark bands
--forest-deep   #112018   footer
--forest-panel  #1B3324   panels on dark
--cream         #F6F2E9   page canvas
--sand          #EDE6D8   warm band
--mint          #E1ECE3   pale band, project sidebars
--mint-strong   #D0E2D5   closing band
--paper         #FFFFFF   cards
--rule          #DCD4C4   hairline
--rule-mint     #C4D8C9   hairline on mint
--ink           #16291F   headings on light
--body          #454F4A   body copy
--slate         #5F6B65   secondary
--mute          #8A948F   labels
--cream-text    #F2EEE1   headings on dark
--cream-body    #B7C2BA   body on dark
--gold          #C9A34F   gold on dark
--gold-deep     #A8842C   gold on light (labels, links)
--gold-btn      #D8A95E   button / flag fill
--sage          #A9D4B8   accent headline on dark
```

## Bucket accents, retuned for forest

```
01 Stormwater      #2F6E7A   deep teal
02 Sewer           #3B5E80   slate blue   (also the FOR DISCUSSION colour)
03 Water           #4E7D5E   moss
04 Environmental   #6E5A86   muted violet
05 Programme       #A8842C   brand gold
```

## Type scale

```
h1        Fraunces 700   clamp(42px, 6vw, 78px)   lh 1.00   ls -.020em
h2        Fraunces 700   clamp(32px, 4vw, 50px)   lh 1.06   ls -.018em
h3        Fraunces 700   26px                     lh 1.18
h4        Fraunces 600   17–19px  (opsz 60)
body      Inter 400      16px                     lh 1.68
lede      Inter 400      19px                     lh 1.62
label     Inter 700      9–11.5px  uppercase      ls .14–.19em
```

## Fonts are embedded

`fonts_b64.py` carries Fraunces (standard axes: opsz + wght) and Inter (wght) as
base64 woff2 inside the CSS. Adds ~150 KB per document and removes every external
request, so the documents render correctly offline, from email, and on networks that
block Google Fonts. Regenerate with `@fontsource-variable/fraunces` and
`@fontsource-variable/inter` from npm if the faces ever change.
