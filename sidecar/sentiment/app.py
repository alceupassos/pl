# Sidecar de sentimento em PT — pysentimiento (BERTabaporu, pos/neg/neu).
# Serviço local consumido pelo app Node (lib/sources/sentiment.ts) para
# pontuar manchetes/posts e alimentar idx.sost.breakdown.sentimento.
#
# Roda em 127.0.0.1 (nunca exposto). Setup no VPS: ver README.md.
#   pm2 start ".venv/bin/uvicorn" --name sentiment -- app:app --host 127.0.0.1 --port 8088

from fastapi import FastAPI
from pydantic import BaseModel

from pysentimiento import create_analyzer

app = FastAPI(title="cockpit-sentiment")

# Carrega o modelo uma vez no boot (BERTabaporu PT). ~1GB em RAM.
analyzer = create_analyzer(task="sentiment", lang="pt")


class Req(BaseModel):
    textos: list[str]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/sentiment")
def sentiment(req: Req):
    """Pontua uma lista de textos PT → contagem pos/neg/neu + índice ~100.
    indice = 100 + (share_pos - share_neg) * 100  (>100 = clima favorável)."""
    textos = [t for t in (req.textos or []) if t and t.strip()]
    if not textos:
        return {"pos": 0, "neg": 0, "neu": 0, "n": 0, "indice": None}

    saidas = analyzer.predict(textos)
    pos = sum(1 for o in saidas if o.output == "POS")
    neg = sum(1 for o in saidas if o.output == "NEG")
    neu = sum(1 for o in saidas if o.output == "NEU")
    n = len(saidas)
    indice = round(100 + ((pos - neg) / n) * 100, 1) if n else None
    return {"pos": pos, "neg": neg, "neu": neu, "n": n, "indice": indice}
