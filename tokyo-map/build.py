"""Build index.html from src/template.html, src/places.json and src/basemap.json.

Run from anywhere:  python3 tokyo-map/build.py
"""
import json
from pathlib import Path

here = Path(__file__).parent
src = here / "src"

def dump(obj):
    # keep "</" out of the inline script so a place name can't close the <script> tag
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

places = json.loads((src / "places.json").read_text())
base = json.loads((src / "basemap.json").read_text())
body = (src / "template.html").read_text().replace("__DATA__", dump(places)).replace("__BASE__", dump(base))
body = "\n".join(l for l in body.splitlines() if "claude:viewport-fit-sides" not in l)

head = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f3f5f2">
"""
(here / "index.html").write_text(head + body + "\n</html>\n")
print(f"index.html written ({len(places)} places)")
