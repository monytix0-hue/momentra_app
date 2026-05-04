"""One-off: add split_mode / splits_json to group_expenses (Postgres)."""
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

u = os.getenv("DATABASE_URL", "sqlite:///./momentra.db")
if u.startswith("sqlite"):
    print("DATABASE_URL is sqlite; no Postgres migration needed here.")
    sys.exit(0)

engine = create_engine(u, future=True)
stmts = [
    "ALTER TABLE public.group_expenses ADD COLUMN IF NOT EXISTS split_mode text NOT NULL DEFAULT 'equal'",
    "ALTER TABLE public.group_expenses ADD COLUMN IF NOT EXISTS splits_json text",
]
with engine.begin() as conn:
    for s in stmts:
        conn.execute(text(s))
print("Applied group_expenses split columns OK")
