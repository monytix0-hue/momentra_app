"""Run the API with host/port from .env so phones on Wi‑Fi can reach the PC (API_HOST=0.0.0.0)."""
import os

from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8002"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
