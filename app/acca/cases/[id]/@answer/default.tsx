// The `@answer` slot's fallback. Returns null, so the slot renders nothing when no worked answer
// is open.
//
// REQUIRED, not optional. Next.js renders `default.js` for any slot that does not match the
// current URL after a HARD navigation; without this file that unmatched slot is a 404 instead —
// which would mean every plain load of `/acca/cases/<id>` 404s. (Parallel-routes doc, "Behavior":
// "it will render a `default.js` file for the unmatched slots, or 404 if `default.js` doesn't
// exist".)
export default function Default() {
  return null;
}
