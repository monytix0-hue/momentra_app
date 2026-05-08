import re, os

BASE = "/home/hermes/.hermes/profiles/momentra/home/coding/momentra_v2/web"
SRC = f"{BASE}/src"

def extract_from_static(chunk, output_path, search_term=None):
    fullpath = f"{BASE}/.next/dev/static/chunks/{chunk}"
    if not os.path.exists(fullpath):
        print(f"  SKIP: {chunk} not found")
        return False
    
    with open(fullpath) as f:
        content = f.read()
    
    # Static chunks tend to have cleaner source. Try to find meaningful code
    # They start with self.__turbopack_load or similar
    
    # Extract everything after the module declarations
    # Look for the actual source pattern
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w") as out:
        out.write(f"// Recovered from {chunk}\n")
        out.write(content[:50000] if len(content) > 50000 else content)
    
    print(f"  -> {output_path} ({min(len(content), 50000)} bytes from {chunk})")
    return True

# Recover layout, globals.css, page (index)
print("Recovering additional source files...")

# Layout
extract_from_static("src_app_layout_tsx_004glpo._.js", f"{SRC}/app/layout.tsx.recovered")
# Home page
extract_from_static("src_0xk--nf._.js", f"{SRC}/app/page.tsx.recovered")

print("\nDone!")
