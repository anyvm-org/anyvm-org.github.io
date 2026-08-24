# anyvm-org.github.io

The source of [anyvm.org](https://anyvm.org).

Static HTML and CSS. No build step, no generator, no npm, no external
requests at runtime -- every asset is served from this repository. Push to
`main` and GitHub Pages serves it.

Every page is bilingual (English / Chinese) and follows the reader's system
theme, with manual switches for both.

## Layout

```
index.html          Landing page
docs/index.html     Getting started
docs/guests.html    Per-guest notes: architectures, desktops, quirks
docs/cli.html       Every CLI option
docs/faq.html       Troubleshooting
assets/style.css    The only stylesheet, shared by every page
assets/site.js      Language + theme switches, copy buttons, tabs,
                    scroll-spy, the typing headline, and the background
                    word field's layout solver
404.html
CNAME               anyvm.org
```

Each page also carries a small inline script in `<head>`. It applies the
stored theme and language before first paint -- without it a reader who chose
dark gets a white flash on every navigation. It is the only inline script.

## Working on it

Serve the directory over HTTP -- the pages link `/assets/...` with absolute
paths, so opening a file directly with `file://` loses the stylesheet:

```sh
python3 -m http.server 8765
```

Then open <http://127.0.0.1:8765/>.

## Design system

The direction is called **Coverage**. The subject is a tool that makes 24
operating systems boot on 7 CPU architectures, so the coverage matrix itself
is the hero rather than a table further down the page.

**Colour identifies a guest and does nothing else.** Buttons, links and focus
rings stay neutral on purpose, so a coloured element always means exactly one
thing. Each guest's colour was sampled from that project's own site or logo --
never from memory -- and the source is recorded beside every value in
`assets/style.css`. Several are lifted in luminance because the published
colour was chosen for a white page and would fall under 3:1 on the ink ground;
the hue is kept, only lightness moves.

Four projects publish no palette at all (MidnightBSD's logo is a plain
outline, NextBSD's site is greyscale, the Hurd logo is monochrome, 9front uses
the stock werc theme). Those are marked `DERIVED` in the CSS and must not be
presented anywhere as official.

The lineage hues (`--fam-*`) still exist, but only for the builder pills in
the ecosystem section -- the matrix no longer uses them.

The ground is blueprint ink (`#0a1922`), never neutral black. The hero keeps
that ink in both themes, because the guest colours are tuned against it.
Monospace is the utility face and carries every label, axis and count; the
body face is the system UI stack. No web fonts are loaded.

The mark is two offset rounded frames: the host, and the guest running on it.
It appears inline in each page's nav and as an SVG data URI favicon.

## Rules

- **Encoding is split, deliberately.** `assets/style.css` and
  `assets/site.js` are **pure 7-bit ASCII** -- Chinese in JS goes in as
  `\uXXXX` escapes. HTML files may contain Chinese literally, because there
  the text is content rather than code. No file may carry a BOM.
- **No external resources.** No CDN, no web fonts, no remote images. Icons
  are inline SVG.
- **The typing headline ignores `prefers-reduced-motion`, on purpose.** That
  check used to sit in `wireTyper()` and return early, which left the headline
  static with no caret -- indistinguishable from broken, and Windows reports
  the preference in more situations than you would guess. The owner's call is
  that it always runs. `site.js` and the motion block in `style.css` both
  carry the note; do not re-add the check as a "fix". (If it is ever
  reinstated, the graceful form -- whole-word swaps, slow dwell, no caret --
  was built and measured before being removed, and is in git history.)
- **Both colour schemes, both languages.** Every surface must work under
  light and dark, and in English and Chinese; all text meets WCAG AA.
- **Responsive down to 375px.** Wide content (tables, the matrix) scrolls
  inside its own container -- the page body never scrolls sideways. The nav
  is the part that breaks first; see below before adding anything to it.
- Keep `assets/site.js` optional. It enhances; it must never be required to
  read or navigate a page. Without it the page is still a complete document
  in the default language, in the system theme, minus the background field.

### Adding anything to the nav

The bar has no room to spare. It sheds items as it narrows, in a fixed order
set by four media queries in `style.css`:

| below | what goes |
|---|---|
| 720px | `Ecosystem` (marked `.opt`) |
| 620px | `Install` + `Guests` -- in-page jumps, a scroll away regardless |
| 540px | row gaps tighten; `Donate` drops to the bare heart |
| 410px | `GitHub` -- also the hero CTA, and in the footer |

`Docs`, the wordmark and the three controls survive to 320px.

Two things that are easy to get wrong here:

- **English is the worst case**, not Chinese -- `Guests` is wider than
  `客户机` and `Donate` is wider than `赞助`. Measure in English.
- **Drop `GitHub` with `:last-child`, never `:nth-child(n)`.** The 404 page's
  nav is one item shorter than every other page's, so a positional index
  silently targets the wrong link there.

Adding one item moves every crossover. Re-measure at each boundary in both
languages -- `documentElement.scrollWidth - clientWidth` must stay 0 at 375px
and at 320px.

### Hiding a `[lang]` span needs more specificity than you think

`:root[data-lang="zh"] [lang="zh"][lang] { display: revert }` scores (0,4,0),
and `revert` discards the author origin outright. A plain
`.donate span[lang] { display: none }` (0,2,1) therefore loses: the label
vanishes in English and stays put in Chinese. Anything that hides a
translated span from a media query has to outscore that rule --
`:root .donate span[lang][lang]` (0,4,1) is the smallest thing that does.

### Editing these files from PowerShell: don't

Windows PowerShell 5.1 reads a BOM-less UTF-8 script as ANSI, so any Chinese
inside the script is already mangled before it runs; `Set-Content -Encoding
UTF8` then writes a BOM on top. Both mistakes have been made in this repo and
both had to be undone. Use Node for any scripted edit -- it reads and writes
UTF-8 without either problem.

## Bilingual markup

Both languages live in the markup and CSS picks one:

```html
<h2 lang="en">Guest notes</h2>
<h2 lang="zh">系统说明</h2>
```

The selectors are written `[lang="zh"][lang]` rather than `[lang="zh"]`. A
single attribute selector ties with a class, so component rules further down
the file (`.eyebrow`, `.tag`, both of which set `display`) were winning on
source order and leaking Chinese into the English page. The doubled selector
outranks them. Do not "simplify" it back.

Adding copy means adding **both** halves. An English node with no Chinese
twin simply vanishes when the reader switches -- it does not fall back.

## Keeping it true

This site states what AnyVM supports, so it goes stale the moment the tool
or the builders change. When a guest, release, architecture, CLI option or
sync backend changes, update it here in the same change:

- **Coverage matrix** -- in *both* places on `index.html`: the hero
  `.cov-grid`, and the readable table under `#coverage`. The hero's
  "N combinations" count must match the number of filled cells. A new guest
  also needs a colour (`--os-<name>`) and one line in the `[data-os=...]`
  block that both the matrix and the table read from.
- **The guest count, which is stated four more times** and is the item this
  list used to omit -- so it shipped stale. `index.html` says "N operating
  systems" in `<meta name="description">`, in `<meta property="og:...">` and
  in the hero eyebrow *twice*, once per language. The paragraph above in this
  file says it a fifth time. Count the guests rather than incrementing: the
  hero `.cov-band` rows, the `<tr data-os=...>` rows and the `<h2 id=...>`
  sections in `docs/guests.html` must all agree, and if they do not, that
  disagreement is itself the bug.
- **The typing headline** -- `GUESTS`, `ARCHES`, `HOSTS` and `ACCEL` in
  `assets/site.js`. It claims support out loud, one word at a time, so a
  guest missing from `GUESTS` is a guest the front page never mentions. If a
  new word is longer than the current longest, raise that slot's `min-width`
  in the CSS (`.typer`, `.typer-arch`, `.typer-host`, `.typer-accel`) or the
  headline will reflow while typing.
  Note the four slots cycle independently, so the combination on screen is
  not necessarily a supported one -- it advertises four axes, not one tuple.
- **The background field** -- the `<span>` list inside `.hero-names` on
  `index.html`, plus a matching `nth-child` size rule in the CSS. Guests
  first, then architectures. Positions are NOT authored; `site.js` solves
  them at runtime against the measured foreground boxes, and re-solves on
  resize. Never move that layout back into CSS -- a percentage layout that
  clears the text at one width slides under it at another.
- **`docs/guests.html`** -- the per-guest section, its `.meta` line, and the
  sidebar entry.
- **`docs/cli.html`** -- when a flag is added, removed or changes meaning.
  Both `<dd lang="en">` and `<dd lang="zh">` must be written; the page has
  one of each per option and an option showing a heading with no body is the
  signature of a missing half.
- **`docs/faq.html`** -- when a workaround stops being necessary, delete it
  rather than leaving it to mislead.

Release *lists* are deliberately not duplicated here. Each builder repository
owns the authoritative list for its guest, and the docs link to it.

## Checking a change

There is no CI. Before pushing, at minimum:

```sh
node --check assets/site.js
grep -rlP '[^\x00-\x7F]' assets/          # must print nothing
```

Then load the page and, in the console, confirm the two switches still
partition cleanly -- every English node hidden in Chinese mode and the
reverse:

```js
const vis = l => [...document.querySelectorAll(`[lang="${l}"]`)]
  .filter(e => getComputedStyle(e).display !== 'none').length;
vis('en'); vis('zh');   // one of these must be 0
```
