# Approved Shirmardi mark

- `shirmardi-logo.svg`: flat, transparent vector conversion of the owner's chosen Persian Shin mark, using the current #087C91 identity. Three body paths and three dot paths have separate IDs. `AnimatedBrandLogo` references those paths for an eight-second assembly/collapse cycle in the navbar; reduced-motion users see the static mark. Footer and favicon use the static assets.
- `shirmardi-logo.png`: transparent cutout of the supplied concept, produced with built-in imagegen. Prompt: remove only the pale background; preserve the chosen silhouette, curves, three diamond dots, proportions, spacing and teal color; no redesign, frame, shadow or added elements.
- `shirmardi-icon.png`: 256px transparent square rasterization of the SVG favicon. The complete mark is preserved and centered; no tile is added.
- Next.js metadata assets: `src/app/icon.svg`, `favicon.ico` (16/32/48/64/128/256) and `apple-icon.png` (180px) use the same mark.

`python apps/web/scripts/prepare-brand-logo.py /absolute/path/to/approved-source.png` regenerates the vector logo and SVG favicon from the approved silhouette (requires OpenCV and NumPy). Raster icons are format conversions of the SVG, not generated alternate designs.
