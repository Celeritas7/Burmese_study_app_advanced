BURMESE SANDHI FIX — updated app files
========================================

WHY: The sandhi (voicing) engine is now live at
     https://celeritas7.github.io/language-utils/burmese.js
     but your app kept showing the OLD version because of two caches:
       1. The browser's ES-module import cache (URL never changed)
       2. The service worker cache (sw.js, "burmese-study-v1")

WHAT CHANGED in these 8 files:
  - All 7 modules: import URL bumped to  ...burmese.js?v=7   (forces a fresh fetch)
  - sw.js: CACHE_NAME bumped v1 -> v2 (old cache auto-deletes on activate)
           + cached burmese.js URL bumped to ?v=7

HOW TO INSTALL:
  Drop these files into your app, overwriting the originals:

    study.js        ->  Burmese_study_app_advanced/js/study.js
    srs.js          ->  Burmese_study_app_advanced/js/srs.js
    quiz.js         ->  Burmese_study_app_advanced/js/quiz.js
    dialogues.js    ->  Burmese_study_app_advanced/js/dialogues.js
    hubexplorer.js  ->  Burmese_study_app_advanced/js/hubexplorer.js
    sentences.js    ->  Burmese_study_app_advanced/js/sentences.js
    writing.js      ->  Burmese_study_app_advanced/js/writing.js
    sw.js           ->  Burmese_study_app_advanced/js/sw.js

AFTER INSTALLING:
  1. Hard-refresh the app (Ctrl+Shift+R), or close & reopen if it's installed
     as a PWA, so the new service worker takes over.
  2. ဒါ လုံချည်ပါ should now read  दा लुंजीबा  (sandhi applied), not लुंछीपा.

NEXT TIME you change burmese.js in the repo:
  bump the number everywhere (?v=8, ?v=9, ...) and the v2->v3 CACHE_NAME,
  so the app always picks up the new engine immediately.
