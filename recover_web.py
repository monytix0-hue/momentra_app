import re

CHUNKS_DIR = "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web/.next/dev/server/chunks/ssr"

def extract_source(filepath, chunk_name, start_marker="\"use client\""):
    with open(f"{CHUNKS_DIR}/{chunk_name}") as f:
        content = f.read()
    
    # Find the start of actual source code
    idx = content.find(start_marker)
    if idx < 0:
        idx = content.find("const ")
    if idx < 0:
        idx = content.find("async function")
    if idx < 0:
        print(f"  WARN: could not find source start in {chunk_name}")
        return
    
    # Find the end (before turbopack epilogue)
    end_idx = content.find("__turbopack_context__")
    if end_idx < 0:
        end_idx = content.rfind("});")
    
    src = content[idx:end_idx] if end_idx > idx else content[idx:]
    
    # Clean up turbopack import lines
    lines = []
    for line in src.split("\n"):
        stripped = line.strip()
        if stripped.startswith("var __TURBOPACK__") or "turbopack_context" in stripped:
            continue
        if stripped.startswith("module.exports") or stripped.startswith("__turbopack_context__"):
            continue
        lines.append(line)
    
    cleaned = "\n".join(lines)
    with open(filepath, "w") as f:
        f.write(cleaned)
    print(f"  -> {filepath} ({len(cleaned)} bytes)")

print("Recovering web source files...\n")

# 1. app/auth/page.tsx - from dedicated chunk
extract_source(
    "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web/src/app/auth/page.tsx",
    "src_app_auth_page_tsx_0iq2u6f._.js"
)

# 2. app/dashboard/page.tsx - from dedicated chunk
extract_source(
    "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web/src/app/dashboard/page.tsx",
    "src_app_dashboard_page_tsx_04esg22._.js"
)

print("\nDone! Check the recovered files.")
