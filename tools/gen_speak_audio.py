"""Generate the Speak tab's MP3s from audio/speak/texts.json using Microsoft's Burmese neural voices.

    pip install edge-tts
    python tools/gen_speak_audio.py          # only missing files
    python tools/gen_speak_audio.py --force  # regenerate everything

Run from the app root. Existing files are skipped, so hand recordings dropped in place are kept.
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
RATE = "-15%"  # matches the old speechSynthesis rate of 0.85


async def main(force: bool) -> None:
    items = json.loads((ROOT / "audio/speak/texts.json").read_text(encoding="utf-8"))
    todo = [it for it in items if force or not (ROOT / it["file"]).exists()]
    print(f"{len(items)} clips listed, {len(todo)} to generate")
    failed = 0
    for n, it in enumerate(todo, 1):
        out = ROOT / it["file"]
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            await edge_tts.Communicate(it["text"], it["voice"], rate=RATE).save(str(out))
            print(f"  [{n}/{len(todo)}] {it['voice']}  {it['text']}")
        except Exception as e:  # keep going; rerun picks up what's missing
            failed += 1
            out.unlink(missing_ok=True)
            print(f"  [{n}/{len(todo)}] FAILED {it['text']}: {e}")
    print("Done." if not failed else f"Done with {failed} failures - run again to retry them.")


if __name__ == "__main__":
    asyncio.run(main("--force" in sys.argv))
