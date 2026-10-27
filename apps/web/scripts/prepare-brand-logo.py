"""Convert the owner's approved flat logo silhouette into transparent SVG assets."""
import sys
from pathlib import Path

import cv2
import numpy as np

source = Path(sys.argv[1])
web = Path(__file__).resolve().parents[1]
image = cv2.imread(str(source))
if image is None:
    raise SystemExit(f"Cannot read {source}")
blue, green, red = cv2.split(image)
mask = ((red < 100) & (blue.astype(np.int16) - red > 30)).astype(np.uint8) * 255
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
contours = [contour for contour in contours if cv2.contourArea(contour) > 100]
if len(contours) != 6:
    raise SystemExit(f"Expected three body sections and three dots, found {len(contours)}")
points = np.concatenate(contours)
x, y, width, height = cv2.boundingRect(points)
parts = []
for index, contour in enumerate(sorted(contours, key=lambda c: (cv2.boundingRect(c)[1], cv2.boundingRect(c)[0]))):
    polygon = cv2.approxPolyDP(contour, .65, True).reshape(-1, 2)
    coordinates = [(int(px) - x, int(py) - y) for px, py in polygon]
    data = "M" + "L".join(f"{px} {py}" for px, py in coordinates) + "Z"
    part = f"dot-{index + 1}" if index < 3 else f"body-{index - 2}"
    parts.append(f'  <path id="{part}" d="{data}"/>')
paths = "\n".join(parts)
logo = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="#087c91">\n{paths}\n</svg>\n'
brand = web / "public" / "brand"
brand.mkdir(exist_ok=True)
(brand / "shirmardi-logo.svg").write_text(logo, encoding="utf-8")
scale = 60 / width
offset_y = (64 - height * scale) / 2
icon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#087c91">\n<g transform="translate(2 {offset_y:.4f}) scale({scale:.8f})">\n{paths}\n</g>\n</svg>\n'
(web / "src" / "app" / "icon.svg").write_text(icon, encoding="utf-8")
print(f"Wrote transparent logo {width}x{height}, six independent paths, and square SVG favicon")
