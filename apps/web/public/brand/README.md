# Approved Shirmardi mark

- `shirmardi-logo.svg`: flat, transparent vector conversion of the owner's chosen Persian Shin mark, using the current #087C91 identity. Three body paths and three dot paths have separate IDs. `AnimatedBrandLogo` references those paths for an eight-second assembly/collapse cycle in the navbar; reduced-motion users see the static mark. Footer and favicon use the static assets.
- `shirmardi-logo.png`: transparent cutout of the supplied concept, produced with built-in imagegen. Prompt: remove only the pale background; preserve the chosen silhouette, curves, three diamond dots, proportions, spacing and teal color; no redesign, frame, shadow or added elements.
- `shirmardi-icon.png`: 256px transparent square rasterization of the SVG favicon. The complete mark is preserved and centered; no tile is added.
- Next.js metadata assets: `src/app/icon.svg`, `favicon.ico` (16/32/48/64/128/256) and `apple-icon.png` (180px) use the same mark.

`python apps/web/scripts/prepare-brand-logo.py /absolute/path/to/approved-source.png` regenerates the vector logo and SVG favicon from the approved silhouette (requires OpenCV and NumPy). Raster icons are format conversions of the SVG, not generated alternate designs.

## eNAMAD footer fallback

`enamad-fallback.png` is an unmodified 1024px transparent, unrated eNAMAD mark from https://www.p30web.org/wp-content/uploads/2016/12/enamad_icon_text_color_blue_1024.png (archive: https://www.p30web.org/enamad-logo/). It is a neutral brand mark, not a cached validation/rating badge. Rated artwork on the issuer homepage was deliberately not used as a fallback. The owner's live badge and verification URL are in `EnamadSeal.tsx`; the local image remains visible until a complete live image loads. Loading failure does not change link target or layout. Verification status is supplied by the issuer's linked profile, not by the local graphic.
