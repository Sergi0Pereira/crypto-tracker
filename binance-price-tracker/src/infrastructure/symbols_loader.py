from __future__ import annotations

from pathlib import Path


class SymbolsFileLoader:
    """
    Loads tickers from a text file.
    Each line: a ticker like BTC, ETH, SOL (case-insensitive).
    """

    def load(self, path: str) -> list[str]:
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Symbols file not found: {file_path.resolve()}")

        tickers: list[str] = []
        for line in file_path.read_text(encoding="utf-8").splitlines():
            cleaned = line.strip().upper()
            if not cleaned or cleaned.startswith("#"):
                continue
            tickers.append(cleaned)

        # Preserve order but de-duplicate
        seen: set[str] = set()
        unique = []
        for t in tickers:
            if t not in seen:
                seen.add(t)
                unique.append(t)

        return unique
