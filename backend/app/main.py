"""Compatibility app entrypoint while backend is split by domain modules."""

from main import app

__all__ = ["app"]

