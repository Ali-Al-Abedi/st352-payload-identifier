# VPID Calculator — SMPTE ST 352 Payload Identifier Decoder & Encoder

A standalone, dependency-free, single-page web tool that decodes a 4-byte
SMPTE ST 352 Video Payload Identifier (VPID) into a complete description of
the underlying ST 2110 / SDI source, and encodes any combination of source
characteristics back into a canonical VPID hex value.

Built for the **Fox broadcast engineering team** to verify ST 2110 sources
during commissioning, fault diagnosis, and contribution-feed analysis.

> **No guessing.** Every bit-level decoded field cites the SMPTE standard it
> originates from. Every byte-2/3/4 mapping is verbatim from the relevant
> SMPTE PDF (the source-of-truth PDFs ship in [`docs/smpte/`](docs/smpte/)).
> Codes registered in the SMPTE-RA Payload Identifier Registry but without a
> published bit-level layout in this build are surfaced through the
> registry-only fallback path with their full standard, description, and
> status — never with synthesised content.

## Try it

The whole tool is a single static HTML file with vanilla JavaScript and CSS:

```bash
git clone https://github.com/Ali-Al-Abedi/vpid_calculator.git
cd vpid_calculator
python3 -m http.server 8765
open http://localhost:8765/vpid.html
```

Or just open `vpid.html` directly in any modern browser — there is no build
step, no bundler, no `node_modules`.

### Power features

| Feature | What it does |
|---------|--------------|
| **URL share**     | `?vpid=89CA8001` in the URL auto-loads and decodes that VPID. The "Copy link" button rewrites the address bar so engineers can paste decoded VPIDs into Slack / email / tickets. |
| **Batch decode**  | Paste any number of VPIDs (one per line, `#` comments allowed) and get a sortable table back. Useful for sweeping a router crosspoint or grepping a vendor capture log. |
| **Compare two VPIDs** | Side-by-side decode + byte / bit XOR diff + per-field diff. The exact view you want when a downstream device reports a mismatch and you need to see which bit flipped. |
| **JSON / CSV export** | Single-VPID and batch exports of the decoded characteristics + per-field byte breakdown. Drop straight into your monitoring or test-rig pipeline. |
| **ST 2110-20 SDP fmtp** | Generates the matching `a=fmtp:96 sampling=…; width=…; height=…; exactframerate=…; depth=…; TCS=…; colorimetry=…; PM=2110GPM; SSN=ST2110-20:2017; PAR=1:1` line per RFC 4175 + ST 2110-20 §7. Copyable in one click for SDP authoring / validation. |

## What it covers

### Fully bit-decoded VPID families (Byte 1 → SMPTE standard)

| Byte 1 | Standard | Coverage |
|--------|----------|----------|
| `0x81 / 0x82` | ST 259 / ST 294 | SD-SDI 525i/625i / 525p/625p |
| `0x84` | ST 292-1 | HD-SDI 720-line |
| `0x85` | ST 292-1 / BT 1120 | HD-SDI 1080-line (split colorimetry) |
| `0x87` | ST 372 / BT 1120 | Dual-link 1.5G HD 1080-line |
| `0x88` | ST 425-1 | 3G-SDI Level A 720-line |
| `0x89` | ST 425-1 | 3G-SDI Level A 1080-line |
| `0x8A` | ST 425-1 | 3G-SDI Level B-DL 1080 (ST 372 over 3G) |
| `0x8B / 0x8C / 0x8D` | ST 425-1 | 3G-SDI Level B-DS variants |
| `0x8E / 0x8F` | ST 425-2 / ST 292-2 | Stereoscopic 720/1080 on single 3G-SDI |
| **`0x90`** | **ST 435-1** | **Quad-link 1080-line over 10G-SDI** |
| `0x91 / 0x92 / 0x93` | ST 425-4 | Stereoscopic 720/1080 on dual 3G-SDI Level A & B-DL |
| `0x94 / 0x95 / 0x96` | ST 425-3 | Dual-link 3G-SDI 1080 / 2160 |
| `0x97 / 0x98` | ST 425-5 | Quad-link 3G-SDI 2160 (4K) |
| `0x99 / 0x9A / 0x9B` | ST 425-6 | Stereoscopic 1080 / 2160 on quad 3G-SDI |
| **`0xA0`** | **ST 435-1** | **Octa-link 2160-line over 10G-SDI** |
| **`0xA1 / 0xA2`** | **ST 2036-3 / BT.2077-1** | **UHDTV1 / UHDTV2 over 10G-SDI Mode D** |
| **`0xA5 / 0xA6`** | **ST 2036-4 / ARIB STD-B58 / BT.2077-2** | **UHDTV1 / UHDTV2 over multi-link 10G-SDI 12-bit container** (note: colorimetry-bit polarity is INVERTED) |
| **`0xB0`** | **ST 2047-2** | **VC-2 mezzanine compressed 1080p over 1.5G HD-SDI** |
| **`0xB1`** | **ST 292-2** | **Stereoscopic 720/1080-line on dual 1.5G HD-SDI** (shares ST 425-2's bytes 2-4 layout) |
| **`0xB2`** | **ST 2047-4 / RP 2047-3** | **VC-2 Level 65 compressed HD on 270 Mb/s SD-SDI** (1080i / 720p / 1440x1080i format-ID byte 4) |
| `0xC0 / 0xC1` | ST 2081-10 (Tek) | 6G-SDI 4K / 1080p HFR |
| `0xCE / 0xCF` | ST 2082-10 | 12G-SDI 4K / 1080p HFR |
| `0xD0` | ST 2082-11 | Dual-link 12G-SDI 8K |
| `0xD2` | ST 2082-12 | Quad-link 12G-SDI 8K |
| **`0xD9 / 0xDA`** | **ST 2082-30 Mode 1** | **2× 6G-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 2081-10) |
| **`0xDB / 0xDC`** | **ST 2082-30 Mode 2** | **4× 3G-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 425-1 Level A) |
| **`0xDD / 0xDE`** | **ST 2082-30 Mode 3** | **8× HD-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 292-1) |

### Registry-only fallback

Every Byte 1 in the [SMPTE-RA Payload Identifier Registry][smpte-ra]
that doesn't have a bit-level decoder above is still recognised and
displayed with its registered `standard`, `description`, and `status` —
deprecated or in-force — by routing through the embedded registry
mirror.

**Codes that remain registry-only** because their byte-2-4 layout
isn't (or can't be) bit-decoded in this build:

* `0x01-0x06` — deprecated SD/HD legacy codes (superseded by their
  `0x8x` modern equivalents). Most have no published byte-2-4 layout.
* `0x83` (ST 347 — 540 Mb/s SDI), `0x86` (ST 349 — SD over 1.5G HD-SDI):
  niche, no PDF dropped into `docs/smpte/` yet.
* `0xB3` (ST 2048-3 — DCI 4K / 4096×2160 over 10G), `0xB4 / 0xB5`
  (RDD 22 — Film Transfer 2048×1556): no PDFs available yet.
* `0xC2-0xC5`, `0xCB-0xCD` (ST 2081-11 / -12 / -30 — 6G-SDI multiplexes
  and dual/quad-link variants): no PDFs available yet.
* `0xD1`, `0xD3` (ST 2082-11 / -12 Mode 2 — 2160-line HFR variants):
  PDFs available but mode-2 byte layouts are not published in the
  same explicit form as the existing single-link codes.
* `0xDF-0xF9` — 24G-SDI codes per ITU-R BT.2077-3 Part 4, all
  Provisionally Assigned. No SMPTE PDF.

Drop the corresponding PDF into `docs/smpte/` and these can be wired up.

[smpte-ra]: https://smpte-ra.org/registers/Payload-Identifier-Registry/

## Bidirectional editing

* **Hex → specs.** Type or paste a 4-byte VPID like `89 CA 80 01`, hit
  any whitespace or just blur the field, and the tool decodes it into a
  resolution, frame rate, scan, aspect, sampling, bit depth,
  colorimetry, transfer characteristic, link/channel, and source standard.
* **Specs → hex.** Pick a Byte 1 family from the dropdown and tweak any
  selectable characteristic; the canonical hex is rebuilt live as you
  change values.

The two views stay synchronised. Any value that conflicts with the
selected family's spec — Reserved bits set, an unallowed picture rate
for that interface, an inverted colorimetry-bit polarity — is surfaced as
a warning rather than silently fixed.

## Development

The implementation has zero dependencies. The repository carries:

```
vpid.html            ← the tool itself
docs/smpte/          ← source-of-truth SMPTE PDFs that the bit
                       layouts are derived from
tests/               ← Node.js self-test extractor
README.md
.gitignore
```

### Running the self-test

`vpid.html` ships with an embedded self-test (`runSelfTest()`) that
round-trips every layout and decodes every preset. To run it headlessly:

```bash
python3 tests/extract_vpid_js.py    # writes /tmp/vpid_test.js
node /tmp/vpid_test.js
```

The same test fires automatically every time the page loads in a browser
and logs the result to the developer console.

## Deploying to GitHub Pages

This repo ships with a [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
workflow that publishes `vpid.html` to GitHub Pages on every push to `main`.

To enable it, do this once in the repo's GitHub UI:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Either:
   * Make the repo **public** (free Pages — recommended unless the SMPTE
     PDFs in `docs/smpte/` need to stay private), **or**
   * Stay private and ensure the GitHub account/org is on a **paid plan**
     (Pro / Team / Enterprise) — Pages is supported on private repos
     only on paid tiers.

Once those are set the next push to `main` will deploy automatically.
The published URL is `https://<owner>.github.io/<repo>/` (which redirects
to `vpid.html`).

The workflow deliberately skips `docs/smpte/*.pdf` from the published
bundle — those PDFs are SMPTE copyrighted material and are intended to
ride along with the source repo for engineering reference, not for
redistribution via the public web.

## Vortex integration

The same `vpid.html` is also wired into the parent
[`st2110-monitoring`](https://github.com/...) Vortex frontend at
`/tools/vpid` — engineers in the dashboard can hit the **VPID** button
in the top bar and the calculator opens inline with a
"back to dashboard" affordance. The standalone HTML is served from the
React app's `public/tools/vpid.html`, so changes in this repo
auto-propagate the next time the Vortex frontend is rebuilt and
deployed.

## License

Internal to Fox / Vortex broadcast engineering. The SMPTE PDFs in
`docs/smpte/` are subject to SMPTE's own copyright; consult the SMPTE
Standards page before redistributing.
