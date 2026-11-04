#!/usr/bin/env python3
"""Genera limagochi-single.html: toda la app en un solo archivo (sin PWA ni Web Push; se abre con doble clic)."""
import re, os
HERE = os.path.dirname(os.path.abspath(__file__)); PUB = os.path.join(HERE, '..', 'docs')
rd = lambda n: open(os.path.join(PUB, n), encoding='utf-8').read()
html = rd('index.html')
html = re.sub(r'\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>', '', html)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + rd('style.css') + '\n</style>')
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + rd(m.group(1)).replace('</script', '<\\/script') + '\n</script>', html)
out = os.path.join(HERE, '..', 'limagochi-single.html')
open(out, 'w', encoding='utf-8').write(html)
print('ok', out, len(html) // 1024, 'KB')
