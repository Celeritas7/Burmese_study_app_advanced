"""Phase 12: generate the app's MP3s (sentences + words) and upload them to Supabase Storage.

    set AZURE_SPEECH_KEY=...   AZURE_SPEECH_REGION=...      (same as Speak)
    set SUPABASE_SERVICE_KEY=...   (Supabase → Project Settings → API → service_role. Keep it secret, never commit it.)
    python tools/gen_app_audio.py           # generate missing, upload missing
    python tools/gen_app_audio.py --force   # regenerate + re-upload everything

Run from the app root after `node tools/app-audio-list.mjs`.
MP3s are kept locally in audio/app/m|f/ (git-ignored) so reruns skip finished ones.
Writes audio/app/clips.json = the clips that exist in the bucket; the app only offers 🔊 for those.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_speak_audio import synth  # same voices, rate and format as Speak

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "audio"
SUPA_URL = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", (ROOT / "js/supabase.js").read_text(encoding="utf-8")).group(1)


def api(method, path, key, data=None, headers=None):
    req = urllib.request.Request(f"{SUPA_URL}/storage/v1/{path}", data=data, method=method,
                                 headers={"Authorization": f"Bearer {key}", "apikey": key, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def remote_keys(key):
    have = set()
    for v in ("m", "f"):
        offset = 0
        while True:
            body = json.dumps({"prefix": v, "limit": 1000, "offset": offset}).encode()
            rows = json.loads(api("POST", f"object/list/{BUCKET}", key, body, {"Content-Type": "application/json"}))
            have.update(f"{v}/{r['name']}" for r in rows if r["name"].endswith(".mp3"))
            if len(rows) < 1000:
                break
            offset += 1000
    return have


def upload(k, data, key):
    api("POST", f"object/{BUCKET}/{k}", key, data,
        {"Content-Type": "audio/mpeg", "x-upsert": "true", "cache-control": "max-age=31536000"})


def main(force):
    az_key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    sb_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not az_key or not region or not sb_key:
        sys.exit("Set AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and SUPABASE_SERVICE_KEY first.")
    items = json.loads((ROOT / "audio/app/texts.json").read_text(encoding="utf-8"))

    # 1. Generate locally
    todo = [it for it in items if force or not (ROOT / it["file"]).exists()]
    print(f"{len(items)} clips listed, {len(todo)} to generate")
    failed = 0
    for n, it in enumerate(todo, 1):
        out = ROOT / it["file"]
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            out.write_bytes(synth(it["text"], it["voice"], az_key, region))
            print(f"  [{n}/{len(todo)}] {it['voice']}  {it['text']}")
        except Exception as e:
            failed += 1
            out.unlink(missing_ok=True)
            print(f"  [{n}/{len(todo)}] FAILED {it['text']}: {e}")

    # 2. Upload what the bucket doesn't have yet
    have = set() if force else remote_keys(sb_key)
    up = [it for it in items if it["key"] not in have and (ROOT / it["file"]).exists()]
    print(f"{len(up)} to upload to Supabase bucket '{BUCKET}'")
    for n, it in enumerate(up, 1):
        try:
            upload(it["key"], (ROOT / it["file"]).read_bytes(), sb_key)
            have.add(it["key"])
            if n % 50 == 0 or n == len(up):
                print(f"  uploaded {n}/{len(up)}")
        except urllib.error.HTTPError as e:
            failed += 1
            print(f"  UPLOAD FAILED {it['key']}: {e.code} {e.read()[:200]}")

    # 3. clips.json = listed clips that really exist in the bucket
    clips = sorted(it["key"] for it in items if it["key"] in have)
    (ROOT / "audio/app/clips.json").write_text(json.dumps(clips, indent=0) + "\n", encoding="utf-8")
    print(f"{len(clips)} of {len(items)} clips available (audio/app/clips.json)")
    print("Done." if not failed else f"Done with {failed} failures - run again to retry them.")


if __name__ == "__main__":
    main("--force" in sys.argv)
