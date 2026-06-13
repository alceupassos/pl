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


def _gateway_get(url: str, *, kind: str, timeout: float = 30, params: dict | None = None) -> requests.Response:
    return requests.get(
        url,
        params=params,
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
        "fan_count",
        "fans",
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


def _brightdata_profiles(network: str, handles: list[str]) -> dict[str, dict]:
    dataset = DATASET_BY_NETWORK.get(network, "")
    if not BRIGHTDATA_TOKEN or not dataset:
        return {}
    tpl = PROFILE_URL.get(network)
    if not tpl:
        return {}
    payload = [{"url": tpl.format(h=h)} for h in handles if h]
    if not payload:
        return {}
    try:
        res = _gateway_post(
            f"{BRIGHTDATA_BASE}?dataset_id={dataset}&format=json",
            kind="brightdata",
            timeout=BRIGHTDATA_TIMEOUT,
            headers={
                "Authorization": f"Bearer {BRIGHTDATA_TOKEN}",
                "Content-Type": "application/json",
            },
            json_body=payload,
        )
        if not res.ok:
            return {}
        data = res.json()
    except Exception:
        return {}

    rows: list[Any]
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        if data.get("snapshot_id"):
            return {}
        rows = data.get("data") or data.get("results") or [data]
    else:
        return {}

    out: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
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
            "nome": row.get("full_name") or row.get("name") or row.get("nome"),
            "source": "brightdata",
        }
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
