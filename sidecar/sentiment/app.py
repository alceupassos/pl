# Sidecar de sentimento em PT — pysentimiento (BERTabaporu, pos/neg/neu).
# Serviço local consumido pelo app Node (lib/sources/sentiment.ts) para
# pontuar manchetes/posts e alimentar idx.sost.breakdown.sentimento.
#
# Roda em 127.0.0.1 (nunca exposto). Setup no VPS: ver README.md.
#   pm2 start ".venv/bin/uvicorn" --name sentiment -- app:app --host 127.0.0.1 --port 8088

import io

import pandas as pd
import requests
from fastapi import FastAPI
from pydantic import BaseModel

import yt_dlp

app = FastAPI(title="cockpit-sentiment")

_analyzer = None


def _get_analyzer():
    """Carrega BERTabaporu PT sob demanda (~1GB RAM). YouTube/Trends não precisam."""
    global _analyzer
    if _analyzer is None:
        from pysentimiento import create_analyzer

        _analyzer = create_analyzer(task="sentiment", lang="pt")
    return _analyzer


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

    saidas = _get_analyzer().predict(textos)
    pos = sum(1 for o in saidas if o.output == "POS")
    neg = sum(1 for o in saidas if o.output == "NEG")
    neu = sum(1 for o in saidas if o.output == "NEU")
    n = len(saidas)
    indice = round(100 + ((pos - neg) / n) * 100, 1) if n else None
    return {"pos": pos, "neg": neg, "neu": neu, "n": n, "indice": indice}


@app.get("/youtube")
def youtube(channel: str):
    """Inscritos + nº de vídeos de um canal do YouTube, via yt-dlp (sem chave).
    channel = URL do canal (.../channel/UC... ou .../@handle)."""
    opts = {"quiet": True, "skip_download": True, "extract_flat": True, "playlist_items": "0"}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(channel, download=False)
        return {
            "subscribers": info.get("channel_follower_count"),
            "videos": info.get("playlist_count"),
            "nome": info.get("channel") or info.get("title"),
        }
    except Exception:
        return {"subscribers": None, "videos": None, "nome": None}


@app.get("/youtube/videos")
def youtube_videos(channel: str, n: int = 10):
    """Últimos vídeos do canal com views/likes/comentários (--dump-json)."""
    lim = max(1, min(n, 20))
    url = channel.rstrip("/")
    if not url.endswith("/videos"):
        url = f"{url}/videos"
    opts = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": False,
        "playlistend": lim,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
        entries = info.get("entries") or []
        out = []
        for e in entries:
            if not e:
                continue
            views = e.get("view_count") or 0
            likes = e.get("like_count") or 0
            comments = e.get("comment_count") or 0
            eng = round(((likes + comments) / views) * 100, 2) if views > 0 else 0.0
            out.append(
                {
                    "id": str(e.get("id") or ""),
                    "titulo": str(e.get("title") or ""),
                    "views": int(views),
                    "comentarios": int(comments),
                    "likes": int(likes),
                    "data": str(e.get("upload_date") or ""),
                    "engajamento": eng,
                }
            )
            if len(out) >= lim:
                break
        return {"videos": out}
    except Exception:
        return {"videos": []}


@app.get("/trends")
def trends(termo: str = "Sóstenes Cavalcante"):
    """Interesse de busca (Google Trends) normalizado ~100. Datacenter pode bloquear."""
    try:
        from pytrends.request import TrendReq

        pt = TrendReq(hl="pt-BR", tz=180)
        pt.build_payload([termo], timeframe="now 7-d", geo="BR")
        df = pt.interest_over_time()
        if df is None or df.empty or termo not in df.columns:
            return {"indice": None, "serie": []}
        serie = [int(v) for v in df[termo].tolist()]
        if not serie or max(serie) == 0:
            return {"indice": None, "serie": []}
        atual = serie[-1]
        # normaliza: média da série = 100
        media = sum(serie) / len(serie)
        indice = round((atual / media) * 100, 1) if media > 0 else None
        return {"indice": indice, "serie": serie[-24:]}
    except Exception:
        return {"indice": None, "serie": []}


# Pesquisas presidenciais 2026 REAIS — parseadas da Wikipédia (sem chave/credencial).
WIKI_PRES = (
    "https://pt.wikipedia.org/wiki/"
    "Pesquisas_de_opini%C3%A3o_para_a_elei%C3%A7%C3%A3o_presidencial_no_Brasil_em_2026"
)
WIKI_UA = {"User-Agent": "sostenes-cockpit/1.0 (https://angra.io; eleicao@angra.io)"}
# candidato → trecho do rótulo da coluna (minúsculo, sem acento opcional)
CANDIDATOS = {"lula": "lula", "flavio": "flávio", "caiado": "caiado", "zema": "zema", "renan": "renan"}


def _num(v):
    s = str(v).replace("%", "").replace(",", ".").strip()
    try:
        return float(s)
    except Exception:
        return None


def _flat(col):
    if isinstance(col, tuple):
        a, b = str(col[0]), str(col[1])
        return b if a.startswith("Unnamed") else a
    return str(col)


@app.get("/pesquisas")
def pesquisas():
    """Últimas pesquisas presidenciais 2026 (intenção de voto), da Wikipédia."""
    try:
        html = requests.get(WIKI_PRES, headers=WIKI_UA, timeout=20).text
        tabs = pd.read_html(io.StringIO(html), match="Lula")
        df = tabs[0]
        cols = [_flat(c) for c in df.columns]
        df.columns = cols
        # localiza colunas
        col_inst = next((c for c in cols if "contratante" in c.lower()), cols[0])
        col_data = next((c for c in cols if "data" in c.lower()), None)
        col_map = {}
        for cand, termo in CANDIDATOS.items():
            col_map[cand] = next((c for c in cols if termo in c.lower()), None)

        out = []
        for _, row in df.iterrows():
            inst = str(row.get(col_inst, "")).strip()
            if not inst or "contratante" in inst.lower() or "tendência" in inst.lower():
                continue
            lula = _num(row.get(col_map["lula"])) if col_map["lula"] else None
            if lula is None:
                continue
            item = {"instituto": inst[:40], "data": str(row.get(col_data, "")).strip()[:24] if col_data else ""}
            for cand in CANDIDATOS:
                c = col_map[cand]
                item[cand] = _num(row.get(c)) if c else None
            out.append(item)
            if len(out) >= 8:
                break
        return {"pesquisas": out}
    except Exception as e:
        return {"pesquisas": [], "erro": repr(e)[:120]}

