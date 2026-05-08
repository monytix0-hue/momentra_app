import re
import os

CHUNKS_DIR = "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web/.next/dev/server/chunks/ssr"
BASE = "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web/src"

def extract_source(filepath, chunk_name, filename_pattern):
    fullpath = os.path.join(CHUNKS_DIR, chunk_name)
    if not os.path.exists(fullpath):
        print(f"  SKIP: {chunk_name} not found")
        return False
    
    with open(fullpath) as f:
        content = f.read()
    
    # Find source block for this specific file
    marker = f'src/{filename_pattern}'
    idx = content.find(marker)
    if idx < 0:
        print(f"  WARN: {filename_pattern} not found in {chunk_name}")
        return False
    
    # Find a reasonable code section
    chunk_start = max(0, idx - 100)
    # Try to find where the actual code starts (after imports/require block)
    
    chunk_end = content.find("__turbopack_context__", idx)
    if chunk_end < 0:
        chunk_end = content.rfind("});")
        if chunk_end > 0:
            chunk_end += 3
        else:
            chunk_end = len(content)
    
    src = content[chunk_start:chunk_end]
    
    # Strip turbopack noise
    lines = []
    for line in src.split("\n"):
        stripped = line.strip()
        if (stripped.startswith("var __TURBOPACK__") or 
            "turbopack_context" in stripped or
            stripped.startswith("module.exports") or
            "require(" in stripped and "TURBOPACK" in stripped):
            continue
        lines.append(line)
    
    cleaned = "\n".join(lines)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write(cleaned)
    print(f"  -> {filepath} ({len(cleaned)} bytes)")
    return True

# Recover from both big chunks
for chunk in ["src_0_uvx~p._.js", "src_0pxz51v._.js"]:
    print(f"\nSearching {chunk}...")
    extract_source(f"{BASE}/lib/api.ts", chunk, "lib/api.ts")
    extract_source(f"{BASE}/lib/firebase.ts", chunk, "lib/firebase.ts")
    extract_source(f"{BASE}/lib/intelligence.ts", chunk, "lib/intelligence.ts")

print("\nDone!")
