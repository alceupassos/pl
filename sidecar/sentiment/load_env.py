# Carrega /opt/candidato/.env no sidecar Python (PM2 não faz isso sozinho).
# Não sobrescreve variáveis já definidas no ambiente do processo.

from __future__ import annotations

import os
from pathlib import Path


def _parse_env_file(path: Path) -> None:
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        if not key:
            continue
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        os.environ.setdefault(key, val)


def bootstrap() -> None:
    here = Path(__file__).resolve().parent
    root = here.parents[1]  # repo root (sidecar/sentiment → sidecar → root)
    for candidate in (root / ".env", here / ".env"):
        if candidate.is_file():
            _parse_env_file(candidate)
