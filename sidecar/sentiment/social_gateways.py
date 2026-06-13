# Gateways sociais — Bright Data, Kondado JSON, fallbacks nativos.
# Consumido por app.py nos endpoints /instagram, /facebook, /x, /tiktok, /linkedin.

from __future__ import annotations

import json
import os
import time
from typing import Any
from urllib.parse import quote, urlencode

import requests

GRAPH_API = "https://graph.facebook.com/v21.0"
BRIGHTDATA_BASE = "https://api.brightdata.com/datasets/v3/scrape"
BRIGHTDATA_TRIGGER = "https://api.brightdata.com/datasets/v3/trigger"
BRIGHTDATA_PROGRESS = "https://api.brightdata.com/datasets/v3/progress"
BRIGHTDATA_SNAPSHOT = "https://api.brightdata.com/datasets/v3/snapshot"
# /scrape tenta síncrono e SEGURA a conexão antes de cair pro snapshot; timeout
# curto pra não travar o request — se estourar, dispara o /trigger (async imediato).
BRIGHTDATA_SYNC_TIMEOUT = 15.0

# Estado dos snapshots assíncronos (ex.: Facebook páginas devolvem snapshot_id em
# vez de dados na hora). Persistido ao lado do sidecar para sobreviver a restart.
SNAP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brightdata_snapshots.json")
SNAP_RESULTS_TTL = 6 * 3600.0      # resultados baixados ficam frescos por 6h
SNAP_MAX_PENDING = 30 * 60.0       # snapshot preso > 30min é abandonado (re-dispara)


def _env(*names: str, default: str = "") -> str:
    for name in names:
        val = os.environ.get(name, "").strip()
        if val:
            return val
    return default


BRIGHTDATA_TOKEN = _env("BRIGHTDATA_TOKEN", "BRIGHTDATA_API_KEY", "BRIGHTDATA_INSTAGRAM_TOKEN")
BRIGHTDATA_TIMEOUT = int(os.environ.get("BRIGHTDATA_TIMEOUT_MS", "60000")) / 1000.0

KONDADO_KEY = _env("KONDADO_API_KEY", "KONDADO_CHAVE_TOKEN")
KONDADO_TOKEN = _env("KONDADO_API_TOKEN", "KONDADO_TOKEN")

META_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")
META_IG_USER_ID = os.environ.get("META_IG_USER_ID", "")
META_IG_USERNAME = os.environ.get("META_IG_USERNAME", "").lower()
META_FB_PAGE_ID = os.environ.get("META_FB_PAGE_ID", "")

DATASET_BY_NETWORK = {
    "instagram": os.environ.get("BRIGHTDATA_INSTAGRAM_PROFILES_DATASET_ID", "gd_l1vikfch901nx3by4"),
    # "pages + profiles by URL" — candidatos usam Páginas, não perfis pessoais.
    "facebook": os.environ.get("BRIGHTDATA_FACEBOOK_PROFILES_DATASET_ID", "gd_mf124a0511bauquyow"),
    "x": os.environ.get("BRIGHTDATA_X_PROFILES_DATASET_ID", ""),
    "tiktok": os.environ.get("BRIGHTDATA_TIKTOK_PROFILES_DATASET_ID", "gd_l1villgoiiidt09ci"),
    "linkedin": os.environ.get("BRIGHTDATA_LINKEDIN_PROFILES_DATASET_ID", ""),
}

KONDADO_URL_BY_NETWORK = {
    "instagram": os.environ.get("KONDADO_INSTAGRAM_JSON_URL", ""),
    "facebook": os.environ.get("KONDADO_FACEBOOK_JSON_URL", ""),
    "x": os.environ.get("KONDADO_X_JSON_URL", ""),
    "tiktok": os.environ.get("KONDADO_TIKTOK_JSON_URL", ""),
    "linkedin": os.environ.get("KONDADO_LINKEDIN_JSON_URL", ""),
}

PROFILE_URL = {
    "instagram": "https://www.instagram.com/{h}",
    "facebook": "https://www.facebook.com/{h}",
    "x": "https://x.com/{h}",
    "tiktok": "https://www.tiktok.com/@{h}",
    "linkedin": "https://www.linkedin.com/in/{h}",
}

_kondado_cache: dict[str, tuple[float, dict[str, dict]]] = {}
KONDADO_CACHE_TTL = 3600.0


def _brightdata_superproxy_url() -> str:
    """Monta URL do superproxy Bright Data (brd.superproxy.io)."""
    user = os.environ.get("BRIGHTDATA_PROXY_USERNAME", "").strip()
    password = os.environ.get("BRIGHTDATA_PROXY_PASSWORD", "").strip()
    if not user:
        customer = os.environ.get("BRIGHTDATA_PROXY_CUSTOMER_ID", "").strip()
        zone = os.environ.get("BRIGHTDATA_PROXY_ZONE", "").strip()
        if customer and zone:
            user = f"brd-customer-{customer}-zone-{zone}"
            password = password or os.environ.get("BRIGHTDATA_PROXY_ZONE_PASSWORD", "").strip()
    if not user or not password:
        return ""
    host = os.environ.get("BRIGHTDATA_PROXY_HOST", "brd.superproxy.io").strip()
    port = os.environ.get("BRIGHTDATA_PROXY_PORT", "33335").strip()
    auth = f"{quote(user, safe='')}:{quote(password, safe='')}"
    return f"http://{auth}@{host}:{port}"


def _outbound_proxy_url(kind: str) -> str:
    """URL de proxy outbound — VPS datacenter → Bright Data API / Kondado JSON."""
    by_kind = {
        "brightdata": "BRIGHTDATA_OUTBOUND_PROXY",
        "kondado": "KONDADO_OUTBOUND_PROXY",
    }.get(kind, "")
    if by_kind:
        val = os.environ.get(by_kind, "").strip()
        if val:
            return val
    generic = os.environ.get("SOCIAL_OUTBOUND_PROXY", "").strip()
    if generic:
        return generic
    if kind == "brightdata":
        bd = _brightdata_superproxy_url()
        if bd:
            return bd
    return os.environ.get("HTTPS_PROXY", "").strip() or os.environ.get("HTTP_PROXY", "").strip()


def _request_proxies(kind: str) -> dict[str, str] | None:
    url = _outbound_proxy_url(kind)
    if not url:
        return None
    return {"http": url, "https": url}


def _request_verify(kind: str) -> bool | str:
    ca = os.environ.get("BRIGHTDATA_PROXY_CA_CERT", "").strip()
    if ca and kind in ("brightdata", "kondado"):
        return ca
    if os.environ.get("SOCIAL_PROXY_INSECURE", "").lower() in ("1", "true", "yes"):
        return False
    return True


def _gateway_get(
    url: str,
    *,
    kind: str,
    timeout: float = 30,
    params: dict | None = None,
    headers: dict[str, str] | None = None,
) -> requests.Response:
    return requests.get(
        url,
        params=params,
        headers=headers,
        timeout=timeout,
        proxies=_request_proxies(kind),
        verify=_request_verify(kind),
    )


def _gateway_post(
    url: str,
    *,
    kind: str,
    timeout: float,
    headers: dict[str, str] | None = None,
    json_body: Any = None,
) -> requests.Response:
    return requests.post(
        url,
        headers=headers,
        json=json_body,
        timeout=timeout,
        proxies=_request_proxies(kind),
        verify=_request_verify(kind),
    )


def norm_handle(handle: str | None) -> str:
    return (handle or "").strip().lower().lstrip("@")


def _followers_from_obj(obj: dict) -> int | None:
    for key in (
        "followers",
        "followers_count",
        "follower_count",
        "page_followers",
        "page_followers_count",
        "fan_count",
        "fans",
        "likes",
        "likes_count",
        "page_likes",
        "seguidores",
        "subscribers",
        "connections",
    ):
        val = obj.get(key)
        if isinstance(val, (int, float)) and val >= 0:
            return int(val)
        if isinstance(val, str):
            try:
                return int(float(val.replace(",", "").replace(".", "")))
            except ValueError:
                pass
    return None


def _username_from_obj(obj: dict, fallback: str) -> str:
    for key in ("username", "user_name", "account", "handle", "screen_name"):
        val = obj.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip().lstrip("@").lower()
    url = obj.get("url") or obj.get("profile_url") or obj.get("profile")
    if isinstance(url, str) and "/" in url:
        return url.rstrip("/").split("/")[-1].lower()
    return fallback


def _network_from_obj(obj: dict) -> str | None:
    for key in ("network", "rede", "platform", "source_network"):
        val = obj.get(key)
        if isinstance(val, str):
            return val.strip().lower()
    url = str(obj.get("url") or obj.get("profile_url") or "")
    if "instagram.com" in url:
        return "instagram"
    if "facebook.com" in url:
        return "facebook"
    if "x.com" in url or "twitter.com" in url:
        return "x"
    if "tiktok.com" in url:
        return "tiktok"
    if "linkedin.com" in url:
        return "linkedin"
    return None


def _handle_from_obj(obj: dict) -> str | None:
    for key in ("handle", "username", "user_name", "account", "screen_name"):
        val = obj.get(key)
        if isinstance(val, str) and val.strip():
            return norm_handle(val)
    url = obj.get("url") or obj.get("profile_url") or obj.get("profile")
    if isinstance(url, str) and "/" in url:
        return norm_handle(url.rstrip("/").split("/")[-1])
    return None


def _fetch_kondado_index(network: str) -> dict[str, dict]:
    url = KONDADO_URL_BY_NETWORK.get(network, "")
    if not url:
        return {}
    now = time.time()
    cached = _kondado_cache.get(network)
    if cached and now - cached[0] < KONDADO_CACHE_TTL:
        return cached[1]

    params: dict[str, str] = {}
    if KONDADO_KEY:
        params["key"] = KONDADO_KEY
    if KONDADO_TOKEN:
        params["token"] = KONDADO_TOKEN
    full_url = f"{url}?{urlencode(params)}" if params else url
    try:
        res = _gateway_get(full_url, kind="kondado", timeout=30)
        if not res.ok:
            return {}
        data = res.json()
    except Exception:
        return {}

    rows: list[Any]
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        for key in ("profiles", "data", "rows", "items", "dados"):
            if isinstance(data.get(key), list):
                rows = data[key]
                break
        else:
            rows = [data]
    else:
        rows = []

    out: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        net = _network_from_obj(row) or network
        if net != network:
            continue
        h = _handle_from_obj(row)
        if not h:
            continue
        followers = _followers_from_obj(row)
        if followers is None:
            continue
        out[h] = {
            "followers": followers,
            "username": _username_from_obj(row, h),
            "nome": row.get("full_name") or row.get("nome") or row.get("name"),
            "source": "kondado",
        }
    _kondado_cache[network] = (now, out)
    return out


def _bd_auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {BRIGHTDATA_TOKEN}", "Content-Type": "application/json"}


def _rows_to_results(rows: list, fallback_handles: list[str] | None = None) -> dict[str, dict]:
    out: dict[str, dict] = {}
    fallback_handles = list(fallback_handles or [])
    for idx, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        followers = _followers_from_obj(row)
        if followers is None:
            continue
        h = _handle_from_obj(row)
        if not h and idx < len(fallback_handles):
            h = fallback_handles[idx]
        if not h:
            continue
        out[h] = {
            "followers": followers,
            "username": _username_from_obj(row, h),
            "nome": row.get("full_name") or row.get("name") or row.get("nome"),
            "source": "brightdata",
        }
    return out


def _snap_load() -> dict:
    try:
        with open(SNAP_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _snap_save(state: dict) -> None:
    try:
        with open(SNAP_FILE, "w", encoding="utf-8") as fh:
            json.dump(state, fh)
    except Exception:
        pass


def _bd_progress(snapshot_id: str) -> str:
    try:
        res = _gateway_get(
            f"{BRIGHTDATA_PROGRESS}/{snapshot_id}",
            kind="brightdata",
            timeout=20,
            headers=_bd_auth_headers(),
        )
        if not res.ok:
            return "unknown"
        return str((res.json() or {}).get("status", "")).lower()
    except Exception:
        return "unknown"


def _bd_download(snapshot_id: str) -> list:
    try:
        res = _gateway_get(
            f"{BRIGHTDATA_SNAPSHOT}/{snapshot_id}",
            kind="brightdata",
            timeout=BRIGHTDATA_TIMEOUT,
            params={"format": "json"},
            headers=_bd_auth_headers(),
        )
        if not res.ok:
            return []
        data = res.json()
    except Exception:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "results", "rows"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def _bd_scrape(network: str, tpl: str, handles: list[str]):
    """Dispara a coleta. Retorna ('sync', {...}) | ('snapshot', id) | ('empty', None).
    1) tenta /scrape rápido (IG/TikTok resolvem na hora);
    2) se não resolveu (timeout/sem followers), dispara /trigger (async imediato)."""
    dataset = DATASET_BY_NETWORK.get(network, "")
    payload = [{"url": tpl.format(h=h)} for h in handles if h]
    if not dataset or not payload:
        return ("empty", None)

    # 1) tentativa síncrona rápida
    try:
        res = _gateway_post(
            f"{BRIGHTDATA_BASE}?dataset_id={dataset}&format=json",
            kind="brightdata",
            timeout=BRIGHTDATA_SYNC_TIMEOUT,
            headers=_bd_auth_headers(),
            json_body=payload,
        )
        if res.ok:
            data = res.json()
            if isinstance(data, dict) and data.get("snapshot_id"):
                return ("snapshot", str(data["snapshot_id"]))
            rows = data if isinstance(data, list) else (
                data.get("data") or data.get("results") or [data]
            ) if isinstance(data, dict) else []
            results = _rows_to_results(rows, handles)
            if results:
                return ("sync", results)
    except Exception:
        pass

    # 2) trigger assíncrono explícito — devolve snapshot_id na hora
    try:
        res = _gateway_post(
            f"{BRIGHTDATA_TRIGGER}?dataset_id={dataset}",
            kind="brightdata",
            timeout=BRIGHTDATA_SYNC_TIMEOUT,
            headers=_bd_auth_headers(),
            json_body=payload,
        )
        if res.ok:
            data = res.json()
            sid = data.get("snapshot_id") if isinstance(data, dict) else None
            if sid:
                return ("snapshot", str(sid))
    except Exception:
        pass
    return ("empty", None)


def _brightdata_profiles(network: str, handles: list[str]) -> dict[str, dict]:
    """Resolve seguidores via Bright Data. Síncrono (IG/TikTok) ou assíncrono por
    snapshot (Facebook páginas): dispara, faz polling do progresso a cada chamada
    e baixa quando pronto, cacheando o resultado em SNAP_FILE."""
    if not BRIGHTDATA_TOKEN:
        return {}
    tpl = PROFILE_URL.get(network)
    dataset = DATASET_BY_NETWORK.get(network, "")
    handles = [h for h in handles if h]
    if not tpl or not dataset or not handles:
        return {}

    now = time.time()
    state = _snap_load()
    net = state.get(network) or {}
    changed = False

    # 1) avança um snapshot assíncrono pendente
    sid = net.get("snapshot_id")
    if sid:
        status = _bd_progress(sid)
        if status == "ready":
            results = _rows_to_results(_bd_download(sid), net.get("pending_handles") or [])
            merged = net.get("results") or {}
            merged.update(results)
            net["results"] = merged
            net["ready_at"] = now
            net["snapshot_id"] = None
            net["pending_handles"] = []
            changed = True
        elif status in ("failed", "error", "expired", "unknown"):
            net["snapshot_id"] = None
            changed = True
        elif now - net.get("snapshot_at", 0) > SNAP_MAX_PENDING:
            net["snapshot_id"] = None  # preso demais → permite re-disparar
            changed = True

    # 2) coleta resultados em cache ainda frescos
    out: dict[str, dict] = {}
    if now - net.get("ready_at", 0) < SNAP_RESULTS_TTL:
        for h in handles:
            r = (net.get("results") or {}).get(h)
            if r and r.get("followers") is not None:
                out[h] = r

    # 3) handles faltando → dispara scrape (sync resolve na hora; async guarda snapshot)
    missing = [h for h in handles if h not in out]
    if missing and not net.get("snapshot_id"):
        kind, payload = _bd_scrape(network, tpl, missing)
        if kind == "sync" and payload:
            out.update(payload)
            merged = net.get("results") or {}
            merged.update(payload)
            net["results"] = merged
            net["ready_at"] = now
            changed = True
        elif kind == "snapshot":
            net["snapshot_id"] = payload
            net["snapshot_at"] = now
            net["pending_handles"] = missing
            changed = True

    if changed:
        state[network] = net
        _snap_save(state)
    return out


def _meta_ig(handle: str) -> dict:
    h = norm_handle(handle)
    if not META_TOKEN or not META_IG_USER_ID or not h:
        return {"followers": None, "username": h, "nome": None, "source": None}
    try:
        if h == META_IG_USERNAME:
            r = requests.get(
                f"{GRAPH_API}/{META_IG_USER_ID}",
                params={"fields": "followers_count,username", "access_token": META_TOKEN},
                timeout=20,
            )
            data = r.json()
            if "error" in data:
                return {"followers": None, "username": h, "nome": None, "source": None}
            return {
                "followers": data.get("followers_count"),
                "username": data.get("username") or h,
                "nome": data.get("username"),
                "source": "meta",
            }
        fields = f"business_discovery.username({h}){{followers_count,username,name}}"
        r = requests.get(
            f"{GRAPH_API}/{META_IG_USER_ID}",
            params={"fields": fields, "access_token": META_TOKEN},
            timeout=20,
        )
        data = r.json()
        if "error" in data:
            return {"followers": None, "username": h, "nome": None, "source": None}
        bd = data.get("business_discovery") or {}
        return {
            "followers": bd.get("followers_count"),
            "username": bd.get("username") or h,
            "nome": bd.get("name"),
            "source": "meta",
        }
    except Exception:
        return {"followers": None, "username": h, "nome": None, "source": None}


def _meta_fb_page() -> dict:
    if not META_TOKEN or not META_FB_PAGE_ID:
        return {"followers": None, "username": None, "nome": None, "source": None}
    try:
        r = requests.get(
            f"{GRAPH_API}/{META_FB_PAGE_ID}",
            params={"fields": "fan_count,followers_count,name", "access_token": META_TOKEN},
            timeout=20,
        )
        data = r.json()
        if "error" in data:
            return {"followers": None, "username": None, "nome": None, "source": None}
        fans = data.get("followers_count") or data.get("fan_count")
        return {
            "followers": fans,
            "username": META_FB_PAGE_ID,
            "nome": data.get("name"),
            "source": "meta",
        }
    except Exception:
        return {"followers": None, "username": None, "nome": None, "source": None}


def resolve_profile(network: str, handle: str, native_fn) -> dict:
    """Bright Data → Kondado → native fallback."""
    h = norm_handle(handle)
    empty = {"followers": None, "username": h, "nome": None, "source": None}

    bd = _brightdata_profiles(network, [h]).get(h)
    if bd and bd.get("followers") is not None:
        return bd

    kondado = _fetch_kondado_index(network).get(h)
    if kondado and kondado.get("followers") is not None:
        return kondado

    native = native_fn(h)
    if native.get("followers") is not None:
        return native
    return empty


def resolve_profiles_batch(network: str, handles: list[str], native_fn) -> dict[str, dict]:
    hs = [norm_handle(x) for x in handles if norm_handle(x)]
    out: dict[str, dict] = {h: {"followers": None, "username": h, "nome": None, "source": None} for h in hs}

    for h, val in _brightdata_profiles(network, hs).items():
        if val.get("followers") is not None:
            out[h] = val

    kondado = _fetch_kondado_index(network)
    for h in hs:
        if out[h].get("followers") is not None:
            continue
        val = kondado.get(h)
        if val and val.get("followers") is not None:
            out[h] = val

    for h in hs:
        if out[h].get("followers") is not None:
            continue
        native = native_fn(h)
        if native.get("followers") is not None:
            out[h] = native

    return out
