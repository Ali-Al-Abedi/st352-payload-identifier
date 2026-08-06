# VPID Calculator — SMPTE ST 352 Payload Identifier Decoder & Encoder

A standalone, dependency-free, single-page web tool that decodes a 4-byte
SMPTE ST 352 Video Payload Identifier (VPID) into a complete description of
the underlying ST 2110 / SDI source, and encodes any combination of source
characteristics back into a canonical VPID hex value.

Built for **broadcast engineering teams** to verify ST 2110 sources during
commissioning, fault diagnosis, and contribution-feed analysis.

> **No guessing.** Every bit-level decoded field cites the SMPTE standard
> it originates from. Every byte-2/3/4 mapping is verbatim from the
> relevant SMPTE PDF — see [`docs/smpte/README.md`](docs/smpte/README.md)
> for the full list of source documents and where to obtain them. (The
> PDFs themselves are SMPTE copyrighted material and are intentionally
> **not** committed to this repository.)
>
> Codes registered in the SMPTE-RA Payload Identifier Registry but without
> a published bit-level layout in this build are surfaced through the
> registry-only fallback path with their full standard, description, and
> status — never with synthesised content.

## Try it

The tools are static HTML + vanilla JavaScript (no build step):

```bash
git clone https://github.com/Ali-Al-Abedi/st352-payload-identifier.git
cd st352-payload-identifier
python3 -m http.server 8765
open http://localhost:8765/vpid.html        # VPID Calculator
open http://localhost:8765/vpid.html#sdp    # ST 2110 SDP Generator (same page)
# optional standalone: sdp.html
```

Or just open `vpid.html` directly in any modern browser — there is no build
step, no bundler, no `node_modules`. Use the **VPID | SDP** tabs in the header to switch.

### Power features

| Feature | What it does |
|---------|--------------|
| **URL share**     | `?vpid=89CA8001` in the URL auto-loads and decodes that VPID. The "Copy link" button rewrites the address bar so engineers can paste decoded VPIDs into Slack / email / tickets. |
| **Batch decode**  | Paste any number of VPIDs (one per line, `#` comments allowed) and get a sortable table back. Useful for sweeping a router crosspoint or grepping a vendor capture log. |
| **Import receiver telemetry** | Paste (or load) a JSON / log dump from a stream monitor or NMOS receiver (Tektronix Prism, EBU LIST, Imagine Selenio, Cinegy, Nevion VideoIPath, …) and the tool extracts every recognizable VPID — JSON keys (`vpid` / `payload_id` / `videoPayloadIdentifier` / `payload_identifier`), 4-byte arrays (`[0xA1, 0xCA, 0x00, 0x01]`), 32-bit ints, hex strings (`0x89CA8001` / `89:CA:80:01` / `89-CA-80-01`), and 10-bit ANC user-data words (parity bits stripped) — with deduplication, occurrence count, and source-line context. The extracted VPIDs auto-populate the **Batch decode** panel so you immediately get the full characteristic table + JSON/CSV export. |
| **Compare two VPIDs** | Side-by-side decode + byte / bit XOR diff + per-field diff. The exact view you want when a downstream device reports a mismatch and you need to see which bit flipped. |
| **JSON / CSV export** | Single-VPID and batch exports of the decoded characteristics + per-field byte breakdown. Drop straight into your monitoring or test-rig pipeline. |
| **ST 2110-20 SDP fmtp** | Generates the matching `a=fmtp:96 sampling=…; width=…; height=…; exactframerate=…; depth=…; TCS=…; colorimetry=…; PM=2110GPM; SSN=ST2110-20:2017; PAR=1:1` line per RFC 4175 + ST 2110-20 §7. Copyable in one click for SDP authoring / validation. |
| **ST 2110 SDP Generator** | Header **SDP** tab → `sdp.html`. Full Magnum-import SDP files for ST 2110-20/-30/-40 (single-path or ST 2022-7), Single + Bulk CSV / device encap import, export-parameter overrides, ZIP as `{multicast}_{port}.txt`. |

## What it covers

### Fully bit-decoded VPID families (Byte 1 → SMPTE standard)

| Byte 1 | Standard | Coverage |
|--------|----------|----------|
| **`0x01-0x06`** | **ST 352:2013 Annex C (deprecated)** | **Historical 2001-era VPIDs**: BT.601 / BT.1358 / ST 347 / ST 274 / ST 296 / ST 349. Each emits a deprecation warning and points to the modern `0x8x` replacement. |
| `0x81 / 0x82` | ST 259 / ST 294 | SD-SDI 525i/625i / 525p/625p |
| **`0x83`** | **ST 347 / ST 352:2013 Annex B.3** | **525/625-line on 540 Mb/s SDI** (interlaced 4:4:4:4 Y′CbCr/A or G′B′R′/A; progressive 4:2:2; 8/10-bit; 4:3 / 16:9 anamorphic) |
| `0x84` | ST 292-1 | HD-SDI 720-line |
| `0x85` | ST 292-1 / BT 1120 | HD-SDI 1080-line (split colorimetry) |
| **`0x86`** | **ST 349 / ST 352:2013 Annex B.4** | **SD source mapped on 1.5 Gb/s HD-SDI** — Table B.4.2 combined sampling + scan + single/dual-channel field, plus mapping-mode bit (normal vs whole-line) and 483/576-line selector |
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
| **`0xB3`** | **ST 2048-3:2024 §7.1** | **DCI 4K (4096×2160) on dual/triple-link 10G-SDI** (FS/709 per ST 2048-1/2; Link 1-3 + Ch1-Ch6; 10/12-bit; sampling adds 7h = ST 2048-2 FS 1) |
| **`0xB4 / 0xB5`** | **SMPTE RDD 22:2012** | **Film transfer 2048×1556 (DCI 2K) on dual-link 1.5G or single-link 3G SDI** — PsF carriage (b7=0/b6=1), rate Tables 25/26 (23.98 / 24 / 25), Y′CbCr 4:2:2 / R′G′B′ 4:4:4 / Rfs/Gfs/Bfs FS-Gamut, Ch1/Ch2 (b4 b6), 10-bit (b1:b0=1) |
| **`0xC0 / 0xC1`** | **ST 2081-10:2018 §4 / §5 / §6** | **6G-SDI single-link 4K (Mode 1) / 1080-line / HFR (Mode 2/3)** — full Table 3/7/15 byte 2/3/4 layout (transfer characteristics, aspect, hpix DCI/UHDTV, colorimetry, sampling Table 3, single-link, Y′CbCr/HDR ICTCP, audio copy status, 10-bit) |
| **`0xC2`** | **ST 2081-11:2019 §4 (Mode 1)** | **6G-SDI dual-link 4K** — link assignment Link 1/2, all transfer characteristics, 10/12-bit (incl. Full Range) |
| **`0xC3`** | **ST 2081-30:2017 §4** | **2× 3G-A 1080-line muxed on 6G** (delegates byte 2-4 to ST 425-1 Level A) |
| **`0xC4 / 0xC5`** | **ST 2081-12:2019 §4 / §5 / §6** | **6G-SDI quad-link 8K (Mode 1) / 4K (Mode 2/3)** — link 1-4, all colorimetries / samplings / transfer characteristics, 10/12-bit (Mode 2/3) |
| **`0xCB`** | **ST 2081-30:2017 §4** | **2× 3G-A 720-line muxed on 6G** (delegates byte 2-4 to ST 425-1 Level A) |
| **`0xCC / 0xCD`** | **ST 2081-30:2017 §5** | **4× HD-SDI 1080 / 720-line muxed on 6G** (delegates byte 2-4 to ST 292-1) |
| `0xCE / 0xCF` | ST 2082-10 | 12G-SDI 4K / 1080p HFR |
| `0xD0` | ST 2082-11 §4.7 | Dual-link 12G-SDI 4320-line (8K) |
| **`0xD1`** | **ST 2082-11 §5.8 / §6.9** | **Dual-link 12G-SDI 2160-line (4K extended)** — Mode 2 (4:4:4(:4) 10/12-bit) and Mode 3 (4:2:2/4:2:0 10-bit HFR). Mode is implied by sampling + bit-depth combination; reserved-bit warnings per §5.8.4 / §6.9.4 fire on out-of-spec values. |
| `0xD2` | ST 2082-12 §4.6 | Quad-link 12G-SDI 4320-line (8K) |
| **`0xD3`** | **ST 2082-12 §5.9** | **Quad-link 12G-SDI 2160-line (4K extended)** — Mode 2: 4-link assignment, full bit-depth set, sampling structures per Table 5. |
| **`0xD9 / 0xDA`** | **ST 2082-30 Mode 1** | **2× 6G-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 2081-10) |
| **`0xDB / 0xDC`** | **ST 2082-30 Mode 2** | **4× 3G-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 425-1 Level A) |
| **`0xDD / 0xDE`** | **ST 2082-30 Mode 3** | **8× HD-SDI muxed on 12G-SDI** (delegates bytes 2-4 to ST 292-1) |
| **`0xDF`** | **ITU-R BT.2077-2 §4.10 Table 3-7 / 3-8** | **8K (4320-line) on single-link 24G-SDI** — full Table 3-7 byte 2/3/4 layout (transfer characteristics, aspect, hpix, colorimetry, sampling, link, Y′CbCr encoding, audio copy status, bit depth) |
| **`0xE0`** | **ITU-R BT.2077-2 Table 3-7 / 3-8** | **4K (2160-line) on single-link 24G-SDI** |
| **`0xE1`** | **ITU-R BT.2077-2 Table 3-7 / 3-8** | **8K on dual-link 24G-SDI** |
| **`0xE2`** | **ITU-R BT.2077-2 Table 3-7 / 3-8** | **4K on dual-link 24G-SDI** |
| **`0xE3`** | **ITU-R BT.2077-2 Table 3-7 / 3-8** | **8K on quad-link 24G-SDI** |
| **`0xF1`** | **ITU-R BT.2077-2 Table 3-7 / 3-8** | **8K on octa-link 24G-SDI** |
| **`0xF3`** | **ST 2081-11:2019 §5 (Mode 2)** | **6G-SDI dual-link 1080-line HFR** — link 1/2, all colorimetries / samplings / transfer characteristics, 10/12-bit (incl. Full Range) |
| **`0xF4 / 0xF9`** | **ITU-R BT.2077-3 §2.4 / §2.3 (Tables 4-19 / 4-2)** | **Octa-link / quad-link 1.5G basic-stream class** — Ch1-Ch8 (octa) or Ch1-Ch4 (quad), Y′CbCr / ICTCP, full 3840×2160 sub-image, 10-bit / 10-bit FR / 12-bit / 12-bit FR |
| **`0xF5`** | **ITU-R BT.2077-3 §2.5 Table 4-20** | **16-link 1.5G basic-stream class on Single-Link 26.73G** — full pixel array 3840×2160 or 7680×4320 selectable, Y′CbCr/ICTCP, all bit depths |
| **`0xF6`** | **ITU-R BT.2077-3 §2.7 Table 4-22** | **64-link 1.5G basic-stream class on Single-Link 106.92G** — 7680×4320 only, Y′CbCr/ICTCP, all bit depths |
| **`0xF7`** | **ITU-R BT.2077-3 §2.6 Table 4-21** | **32-link 1.5G basic-stream class on Dual-Link 26.73G** — 26.73G Link 1/2 selector, full pixel array selectable, Y′CbCr/ICTCP, all bit depths |
| **`0xF8`** | **ITU-R BT.2077-3 §2.8 Table 4-23** | **128-link 1.5G basic-stream class on Dual-Link 106.92G** — 106.92G Link 1/2 selector, 7680×4320 only, Y′CbCr/ICTCP, all bit depths |

### Registry-only fallback

Every Byte 1 in the [SMPTE-RA Payload Identifier Registry][smpte-ra]
that doesn't have a bit-level decoder above is still recognised and
displayed with its registered `standard`, `description`, and `status` —
deprecated or in-force — by routing through the embedded registry
mirror.

As of this build **every code currently registered in the SMPTE-RA
Payload Identifier Registry has a bit-level decoder** in `vpid.html`.
The registry-only path is exercised by truly *unregistered* Byte 1
values (e.g. `0x10`, `0xFE`, `0xFF`) which fall through to the
"unknown code" branch with a helpful error.

> The deprecated **Annex C historical codes** (`0x01-0x06`) are
> bit-decoded with explicit deprecation warnings per ST 352:2013 §C —
> the active **`0x8x` codes** (`0x81`-`0x86`) decode the modern
> equivalents per ST 352 Annex B.

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
.github/workflows/
  pages.yml          ← GitHub Pages auto-deploy
docs/smpte/
  README.md          ← which SMPTE PDFs the decoders reference
                       (PDFs themselves are gitignored — local only)
tests/
  extract_vpid_js.py ← Node.js self-test extractor
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
2. Make sure the repo is **public** (free Pages tier). Private repos
   need a paid GitHub plan (Pro / Team / Enterprise) — keeping it
   public is the simpler path now that the SMPTE PDFs are gitignored.

Once those are set the next push to `main` will deploy automatically.
The published URL is `https://<owner>.github.io/<repo>/` (which redirects
to `vpid.html`).

The workflow only publishes `vpid.html`, the README, and a redirect
`index.html`. Nothing under `docs/smpte/` is in the repo at all (it's
all gitignored — see `docs/smpte/README.md` for what to download
locally if you want the source PDFs).

## Embedding in a host app

`vpid.html` is a single self-contained file (no build step, no bundler,
no external dependencies). To embed it inside a larger React / Vue /
plain-HTML dashboard, copy it into your app's static-assets directory
(for example `public/tools/vpid.html` for a Create-React-App / Vite /
Next.js project) and link to it from a top-bar button or open it in an
`<iframe>`. The standalone build is the only build, so any update in
this repo can be picked up by re-copying `vpid.html`.

## License

The VPID Calculator source (`vpid.html` and friends in this repo) is
released under the [MIT License](LICENSE) for use by broadcast
engineering teams and the broader broadcast community.

The **SMPTE standards** the decoders are derived from are SMPTE
copyrighted material and are **not** redistributed by this repository
in any form. Engineers must obtain their own copies through
[SMPTE](https://www.smpte.org/standards) — see
[`docs/smpte/README.md`](docs/smpte/README.md) for the list of relevant
documents.
