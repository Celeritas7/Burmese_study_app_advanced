# Phase UI-5 — Learning screen readability

## Scope

This phase improves the already-merged UI-4 navigation's learning screens, especially small Android phones and iPads. It changes layout, labels, and touch targets only; it does not change lesson sources, grading values, account flows, sync ownership, or stored progress.

### Home

- The rotating daily item is explicitly a **suggestion**, not an assertion that any lesson was completed.
- Remove invented completed-work indicators, fixed new-word counts, and unverified lesson/set/unit numbers.
- Keep every `Start practice` route and lesson source unchanged.
- Make header controls readable and accessible on narrow devices.

### Writing Practice

- Use two larger drawing squares per row on small phones, expanding to three/four/five columns as screen width increases.
- Enlarge correct, needs-practice, erase, reveal, and header controls, with accessible names and selected states.
- Allow the header actions to wrap without horizontal overflow.
- Restore the original viewport zoom setting and document styles when leaving Writing, including navigation outside its own Back button.
- Keep writing marks and existing `db.logProgress()` calls unchanged. **Clear** clears the current view; it does not undo entries already saved to the progress log.

### Study, SRS, Songs

- Give Study mode controls room to wrap, give the seven ratings visible labels, and use a compact four-column grid on very narrow phones.
- Preserve the existing numerical rating order and storage calls.
- Make Study and SRS reveal panels operable by keyboard, enlarge SRS responses/Exit and improve word wrapping.
- Increase touch targets and input readability in Songs, and stack song action links on very narrow phones.
- Allow Study, SRS and Songs a wider reading column on tablets, without widening unrelated pages.

## Validation

- Run `node --test tests/*.test.mjs` (48 tests including UI-5 assertions).
- Run syntax checks on edited JavaScript and `git diff --check`.
- Manual QA remains required for physical devices; automated DOM/source tests cannot confirm touch precision or visual legibility.

## Manual acceptance checklist

- [ ] At 320–360 px Android widths: Home header fits; Study's seven rating choices are legible and selectable; writing grid is two columns with unobstructed squares.
- [ ] At 390–430 px Android widths: Study rating grid adapts; writing switches to three columns at 430 px.
- [ ] At iPad portrait and landscape widths: learning screens use available width without horizontal scroll; Writing displays larger writing tiles.
- [ ] Writing: toggle Write/View, Guide and Answers; draw; mark correct/needs practice; clear; navigate away and back. Check zoom and bottom navigation restore.
- [ ] Study and SRS: reveal hints/meanings and rate several entries; verify the same values and review progress appear after reopening.
- [ ] Songs: search, filter, open a saved link, and open the edit form without modifying or losing existing songs.
- [ ] Offline after a successful app update: previously cached learning pages remain usable and existing progress remains intact.

## Safety and rollout

Open a reviewable PR and merge only after reviewing the learning-screen changes. The service-worker app-code cache version is incremented to `burmese-study-v19`; the separate audio cache is untouched. No Supabase schema, authentication, storage, sync queue or RLS changes are part of UI-5.
