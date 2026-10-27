"""Self-host OFL fonts. Requires fonttools[woff] and brotli; no runtime CDN.

Run from any directory after changing Chinese messages to regenerate its glyph subset.
"""
from pathlib import Path
from urllib.request import urlopen
from io import BytesIO
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
output = root / "public" / "fonts"
for family, filename in [("geist", "Geist"), ("notosanssc", "NotoSansSC")]:
    base = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{family}"
    data = urlopen(f"{base}/{filename}%5Bwght%5D.ttf", timeout=90).read()
    font = TTFont(BytesIO(data))
    if family == "notosanssc":
        text = (root / "src/messages/zh-CN.json").read_text(encoding="utf-8")
        options = subset.Options()
        options.layout_features = ["*"]
        worker = subset.Subsetter(options=options)
        worker.populate(text=text + "".join(chr(i) for i in range(32, 127)))
        worker.subset(font)
    font.flavor = "woff2"
    target = output / f"{filename}-Variable.woff2"
    font.save(target)
    license_text = urlopen(f"{base}/OFL.txt", timeout=30).read().decode("utf-8")
    (output / f"{filename}-OFL.txt").write_text(
        "".join(line.rstrip() + "\n" for line in license_text.splitlines()), encoding="utf-8"
    )
    print(f"{target.name}: {target.stat().st_size} bytes")
