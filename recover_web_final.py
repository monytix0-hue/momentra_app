#!/usr/bin/env python3
import re, os, json

WEB = "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web"

# Recover globals.css from built CSS
css_path = f"{WEB}/.next/dev/static/chunks/src_app_globals_0p2ml0n.css"
if os.path.exists(css_path):
    with open(css_path) as f:
        css = f.read()
    out_path = f"{WEB}/src/app/globals.css"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        f.write(css)
    print(f"globals.css recovered: {len(css)} bytes")

# Recover layout from server app page router reference
# Check the page.js for layout info
page_path = f"{WEB}/.next/dev/server/app/page.js"
if os.path.exists(page_path):
    with open(page_path) as f:
        page_content = f.read()
    # Extract layout reference
    for m in re.finditer(r'\[project\]/src/([^\s"\'\\\\,)]+)', page_content):
        print(f"  page.js ref: {m.group(1)}")

# Check client-reference-manifests for component names
for manifest_path in [f"{WEB}/.next/dev/server/app/page_client-reference-manifest.js",
                     f"{WEB}/.next/dev/server/app/auth/page_client-reference-manifest.js",
                     f"{WEB}/.next/dev/server/app/dashboard/page_client-reference-manifest.js"]:
    if os.path.exists(manifest_path):
        with open(manifest_path) as f:
            content = f.read()
        # Extract component names
        for m in re.finditer(r'"([^"]+)"\s*:\s*\{', content):
            name = m.group(1)
            if not name.startswith('_') and not name.startswith('node_module'):
                print(f"  {os.path.basename(manifest_path)} -> component: {name}")

# Also check for layout.tsx in the built SSR
layout_chunk = f"{WEB}/.next/dev/server/chunks/ssr/_0pxz51v._.js"
alt_layout = f"{WEB}/.next/dev/server/chunks/ssr/src_0pxz51v._.js"
for chunk_path in [alt_layout]:
    if os.path.exists(chunk_path):
        with open(chunk_path) as f:
            content = f.read()
        if 'layout' in content.lower():
            # Extract layout reference
            for m in re.finditer(r'layout', content):
                start = max(0, m.start() - 50)
                end = min(len(content), m.end() + 100)
                ctx = content[start:end]
                if '[project]' in ctx:
                    print(f"  Layout context: ...{ctx.strip()}...")
                    break

print("\nWeb recovery complete.")
