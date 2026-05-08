import re
import os

os.chdir("/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2")

# Extract from auth page chunk
with open("web/.next/dev/server/chunks/ssr/src_app_auth_page_tsx_0iq2u6f._.js") as f:
    auth_content = f.read()

# Extract from dashboard page chunk  
with open("web/.next/dev/server/chunks/ssr/src_app_dashboard_page_tsx_04esg22._.js") as f:
    dash_content = f.read()

# Extract from the big bundled chunks
with open("web/.next/dev/server/chunks/ssr/src_0_uvx~p._.js") as f:
    big_content = f.read()

with open("web/.next/dev/server/chunks/ssr/src_0pxz51v._.js") as f:
    small_content = f.read()

# Find all source file paths
combined = auth_content + "\n" + dash_content + "\n" + big_content + "\n" + small_content
paths = set()
for m in re.finditer(r'\[project\]/src/([^\s"\'\\\\,)]+)', combined):
    path = m.group(1)
    if any(path.endswith(ext) for ext in ['.tsx','.ts','.css','.mjs','.ico']):
        paths.add(path)

for p in sorted(paths):
    print(p)
