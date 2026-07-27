from pathlib import Path
from urllib.parse import quote

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")
config_js = (root / "config.js").read_text(encoding="utf-8")
js = (root / "app.js").read_text(encoding="utf-8")
ai_js = (root / "ai.js").read_text(encoding="utf-8")
icon = (root / "icon.svg").read_text(encoding="utf-8")
icon_uri = "data:image/svg+xml;charset=utf-8," + quote(icon, safe="")

html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")
html = html.replace('href="icon.svg"', f'href="{icon_uri}"')
html = html.replace('src="icon.svg"', f'src="{icon_uri}"')
html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>\n{css}\n</style>')
html = html.replace('<script src="config.js" defer></script>', '')
html = html.replace('<script src="app.js" defer></script>', '')
html = html.replace('<script src="ai.js" defer></script>', '')
html = html.replace('</body>', f'<script>\n{config_js}\n{js}\n{ai_js}\n</script>\n</body>')

output = root.parent / "kindee-ai-standalone.html"
output.write_text(html, encoding="utf-8")
print(output)
