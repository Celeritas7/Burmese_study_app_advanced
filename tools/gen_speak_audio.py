"""Generate the Speak tab's MP3s from audio/speak/texts.json with the Azure Speech REST API.

    set AZURE_SPEECH_KEY=...  and  AZURE_SPEECH_REGION=...  (e.g. japaneast)
    python tools/gen_speak_audio.py          # only missing files
    python tools/gen_speak_audio.py --force  # regenerate everything

Run from the app root. Existing files are skipped, so hand recordings dropped in place are kept.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
RATE = "-15%"  # matches the old speechSynthesis rate of 0.85
FORMAT = "audio-24khz-48kbitrate-mono-mp3"


def synth(text: str, voice: str, key: str, region: str) -> bytes:
    ssml = (
        f"<speak version='1.0' xml:lang='my-MM'><voice name='{voice}'>"
        f"<prosody rate='{RATE}'>{escape(text)}</prosody></voice></speak>"
    )
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": FORMAT,
            "User-Agent": "burmese-study-speak",
        },
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 3:  # back off only on throttling
                raise
            time.sleep(2 ** attempt)


def main(force: bool) -> None:
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        sys.exit("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first.")
    items = json.loads((ROOT / "audio/speak/texts.json").read_text(encoding="utf-8"))
    todo = [it for it in items if force or not (ROOT / it["file"]).exists()]
    print(f"{len(items)} clips listed, {len(todo)} to generate")
    failed = 0
    for n, it in enumerate(todo, 1):
        out = ROOT / it["file"]
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            out.write_bytes(synth(it["text"], it["voice"], key, region))
            print(f"  [{n}/{len(todo)}] {it['voice']}  {it['text']}")
        except Exception as e:  # keep going; rerun picks up what's missing
            failed += 1
            out.unlink(missing_ok=True)
            print(f"  [{n}/{len(todo)}] FAILED {it['text']}: {e}")
    # clips.json = the files that really exist; speak.js only offers 🔊 for these.
    have = [it["file"] for it in items if (ROOT / it["file"]).exists()]
    (ROOT / "audio/speak/clips.json").write_text(json.dumps(have, indent=0) + "\n", encoding="utf-8")
    print(f"{len(have)} of {len(items)} clips available (audio/speak/clips.json)")
    print("Done." if not failed else f"Done with {failed} failures - run again to retry them.")


if __name__ == "__main__":
    main("--force" in sys.argv)
