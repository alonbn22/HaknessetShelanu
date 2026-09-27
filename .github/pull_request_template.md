## What and why

<!-- What does this change, and why? Link the issue if there is one. -->

## Sources

<!-- A link for every new or changed fact: the primary source (the Knesset's
record, the Central Elections Committee, the party's own platform, the outlet's
own article), not Wikipedia or an aggregator. Write "none" for a code-only change. -->

## Checklist

- [ ] Every new or changed fact links its primary source, here and in the content file
- [ ] Claims about people are neutral, and any legal matter that isn't final has a `status` (presumption of innocence)
- [ ] Every new or changed text exists in all six languages (he, en, ar, ru, es, fr) in `messages/*.json` or `content/*.yaml`
- [ ] No Hebrew characters in `src/` (use `messages/`, or `\u` escapes in code)
- [ ] The gates are green: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [ ] `data/knesset.db` is not changed (a code PR never touches it; `git restore data/knesset.db`)

See [CONTRIBUTING.md](https://github.com/alonbn22/HaKnessetSheli/blob/master/CONTRIBUTING.md) for the rules behind each box.
