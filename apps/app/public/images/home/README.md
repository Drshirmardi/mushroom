# Home blue brain

`blue-brain-original.jpg` is the owner-supplied blue anatomical brain artwork,
identified by its content (not attachment numbering). It is copied byte-for-byte:
720 × 1280, RGB JPEG, 191,690 bytes.

SHA-256: `1df66d327c9e3a09b3081dbb2a888b8a20c09902c66bfb7099700fc60b7d2616`.

The original attachment remains untouched. It is retained as the reference and
is no longer used by the Home hero. Inspection at native resolution found blue
subject pixels touching both x=0 and x=719: the lateral silhouette is already
truncated inside this source JPEG. The previous CSS displayed the entire source;
it could not recover those missing contours or remove the cream opaque matte.

## Separate complete transparent artwork (2026-10-20)

`blue-brain-complete.png`: 1161 × 1355, RGBA PNG, 2,054,649 bytes.
SHA-256: `036dcb03df4aecf8a6fbe7f5a4a849f534110011bb35c84cd7ae40b7e94c2627`.

Prepared using the built-in imagegen edit tool with the original JPEG as reference.
This is a **derived decorative illustration**, including reconstructed lateral
contours, not a pixel-preserving cutout or recovery of missing medical information.
The whole silhouette and stem are inside the output; alpha>=128 subject bounds
are (19,92)–(1143,1315), and all four canvas corners are fully transparent.
The tool output was copied without further resizing/recompression/format changes.
The hero renders the complete PNG with its natural aspect ratio and contain;
no crop, opacity reduction, blur, mask or filter is applied to the image. Frosting
and luminous fields are CSS layers behind it. No cream background is used.

Built-in output retained at:
`C:/Users/R3dPi/.codex/generated_images/01a1591b-980e-7301-b7a5-c171cc6c2910/exec-07d194de-3553-4077-8626-721ab87ac789.png`.

Final imagegen prompt:

> Edit the attached reference into one high quality decorative 3D blue anatomical
> brain asset for a health app. Use the actual supplied BLUE BRAIN reference, NOT
> a heart. Reference has its lateral brain contour truncated at both image edges
> and a cream opaque background. Required preparation: place the COMPLETE brain
> and its COMPLETE long brainstem centered with generous transparent padding on
> all four sides, extending/reconstructing ONLY the small missing lateral outer
> contours as a decorative illustration (not a patient scan). Remove the cream
> backdrop entirely with genuine alpha transparency. Preserve the reference's
> sagittal side view orientation, navy and icy blue translucent glasslike tissue,
> very fine dark branching vessel details, internal structures, cerebellum, full
> brainstem shape, calm realistic polished 3D lighting. Brain must remain sharp,
> richly detailed, fully opaque enough to remain legible on icy blue, with clean
> naturally antialiased contour and no cream halo. No rectangular matte, no
> background, no floor or cast shadow, no cropped vessels/contours/stem, no faded
> subject edges, no blur, no text, no symbols, no medical indicators. Output one
> centered complete subject, generous safe margin around silhouette and end of
> stem. This is a separate derived decorative asset: retain original appearance as
> closely as possible; avoid new decorative objects.

Neither asset is a patient scan, measurement, diagnosis or neurological feature.
