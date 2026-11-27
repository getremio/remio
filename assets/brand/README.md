# Brand assets

Canonical marks, lockups, and wordmark font for **Remio** and **Remio Hub**. These are the source assets that will replace the existing icons across the app, desktop client, website, docs, and Hub in follow-up work.

## Brand architecture

- **Remio** (butterfly mark): the local client, daemon, CLI, SDK, and small account features (sign-in, share links, tunnels).
- **Remio Hub** (flower mark): the software factory, team features, hosted service, and paid plans (`Hub Free`, `Hub Solo`, `Hub Team`).
- **Hub** (flower mark + `Hub`): used only where Remio is already on screen, such as inside the Hub dashboard header.

## Specifications

### Marks

Both marks are single-line stroked paths on a `700 × 700` viewBox with `stroke-width="50"`, `stroke-linecap="round"`, and `stroke-linejoin="round"`. Both are optically centered to a `527`-unit ink footprint:

- **Remio (`marks/remio-*.svg`)**: refit of the hand-drawn butterfly (redraw B) with smooth curvature on the large wing and lower loop and a uniform `50` stroke width.
- **Remio Hub (`marks/remio-hub-*.svg`)**: five-petal looped flower (variant A) with a `12°` clockwise petal lean, sized up to match the butterfly's `527` footprint with the same `50` stroke.

Colors:

- `white` (`#FFFFFF`) for dark surfaces (`#101615`, `#101010`, `#000000`)
- `black` (`#000000`) for light surfaces
- `green` (`#20744A`) brand accent

### Lockups

All lockups (`lockups/*.svg`) share a `144`-unit height (`140`-unit flower ink height with a `2`-unit margin on all sides) so stacked lockups align cleanly:

- **Font**: Plus Jakarta Sans SemiBold (`600`), bundled in `fonts/PlusJakartaSans-SemiBold.ttf` under the SIL Open Font License 1.1 (`fonts/OFL.txt`).
- **Outlined text**: lockup SVGs outline the wordmark to `<path>` elements so they render identically everywhere without the font installed.
- **Proportions**: marks are `15%` larger against text and `20%` closer than the original website header baseline (`24 px` box, `12 px` gap, `18 px` text).
- **Optical balance**: in the `remio` lockup, the butterfly is scaled to `94%` (`stroke-width` proportional) so `Remio`, `Remio Hub`, and `Hub` sit at equal visual weight when shown together.

## Files

```text
assets/brand/
  build.mjs                     Regenerates all marks and lockups
  fonts/
    PlusJakartaSans-SemiBold.ttf
    OFL.txt
  marks/
    remio-white.svg
    remio-black.svg
    remio-green.svg
    remio-hub-white.svg
    remio-hub-black.svg
    remio-hub-green.svg
  lockups/
    remio-white.svg
    remio-black.svg
    remio-hub-white.svg
    remio-hub-black.svg
    hub-white.svg
    hub-black.svg
```

## Regenerate

```sh
node assets/brand/build.mjs
```
