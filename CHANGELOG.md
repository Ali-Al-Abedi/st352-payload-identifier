# Changelog

All notable changes to the VPID Calculator are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **SDP: restore 2160p59.94 HLG Rec.2020 preset (`CE DA A0 01`) (2026-08-06).**

- **SDP presets trimmed (2026-08-06).** Dropped UHD SDR/HLG; UHD kept as PQ Rec.2020 only (`CE EA A0 01`).

- **SDP UHD PQ preset (2026-08-06).** `2160p59.94 PQ Rec.2020` — VPID `CE EA A0 01`.

- **SDP UHD presets (2026-08-06).** `2160p59.94 SDR` (`A1 CA 00 01`) and `2160p59.94 HLG Rec.2020` (`CE DA A0 01`).

- **SDP preset: 1080p59.94 HLG Rec.2020 (2026-08-06).** VPID `89 DA A0 01` — TCS=HLG, BT2020.

- **Bulk: removed Download CSV template (2026-08-06).** Encap export / paste only.

- **GitHub Pages unblocked (2026-08-06).** Added root `.nojekyll` and switched
  Pages to legacy deploy from `main`. Live site now serves the simplified Bulk UI.

- **Bulk page simplified (2026-08-06).** One CSV file chooser only. Removed
  per-device source-map upload and the crowded export-parameter panel from the
  default view. Video preset + optional origin/PTP/source IPs under **More
  options**. Paste CSV tucked behind a disclosure.

### Changed
- **SDP resolution presets match VPID chips (2026-08-06).** Selecting
  **1080p59.94 SDR** (`89 CA 80 01`) or **720p59.94 SDR** (`84 CA 80 01`)
  auto-fills width/height/exactframerate/sampling/depth/TCS/colorimetry/SSN
  on Single + Bulk. Fields stay editable. PM/TP stay dialect-controlled
  (Magnum GPM/TPW vs Evertz BPM/TPN). Inlined into `vpid.html` for Pages.

### Added
- **ST 2110 SDP Generator tab (2026-08-06).** Header **VPID | SDP** switcher on
  `vpid.html` (`#vpid` / `#sdp`). The SDP tool is **inlined into `vpid.html`** so
  GitHub Pages (which only stages that file) serves it without a workflow change.
  Standalone `sdp.html` + `sdp.js` remain for local use. Magnum-import generation
  for ST 2110-20/-30/-40, single-path or ST 2022-7, Single + Bulk (CSV / device
  encap export), export-parameter overrides, `{multicast}_{port}.txt` ZIP naming.
  Fixture tests: `node --test tests/test_sdp.mjs` (23/23).

## [1.0.0] — 2026-05-09

First production-ready release.

### Coverage

Full bit-level decode + round-trip encode for every Byte 1 code with a
published bit-level layout in SMPTE / ITU-R / RDD documents:

- ST 352:2013 Annex C historical (`0x01`–`0x06`)
- ST 259 / ST 294 / ST 347 / ST 349 — SD-SDI families (`0x81`, `0x82`, `0x83`, `0x86`)
- ST 292-1:2018 — HD-SDI 720/1080 (`0x84`, `0x85`)
- ST 372:2017 — Dual-link 1.5G HD (`0x87`)
- ST 425-1:2017 — 3G-SDI Level A & B (`0x88`–`0x8D`)
- ST 425-2/-4/-6 + ST 292-2 — Stereoscopic on 3G (`0x8E`/`0x8F`/`0x91`–`0x93`/`0x99`–`0x9B`/`0xB1`)
- ST 425-3:2019 — Dual-link 3G (`0x94`–`0x96`)
- ST 425-5:2019 — Quad-link 3G 4K (`0x97`/`0x98`)
- ST 435-1:2012 — 10 Gb/s SDI (`0x90`/`0xA0`)
- ST 2036-3 / BT.2077-1 — UHDTV1/2 over 10G Mode D (`0xA1`/`0xA2`)
- ST 2036-4 / BT.2077-2 — 10G 12-bit container, inverted-polarity colorimetry (`0xA5`/`0xA6`)
- ST 2047-2 / ST 2047-4 — VC-2 mezzanine + Level 65 (`0xB0`/`0xB2`)
- ST 2048-3:2024 — DCI 4K dual/triple-link 10G (`0xB3`)
- RDD 22:2012 — DCI 2K film transfer (`0xB4`/`0xB5`)
- ST 2081-10/-11/-12/-30 — 6G family (`0xC0`–`0xC5`, `0xCB`–`0xCD`)
- ST 2082-10/-11/-12/-30 — 12G family (`0xCE`–`0xD3`, `0xD9`–`0xDE`)
- ITU-R BT.2077-2/-3 — 12-bit UHDTV registry (`0xDF`–`0xF1`, `0xF4`–`0xF9`)

Codes without a published bit-level layout (or in the SMPTE-RA reserved
range `0x07`–`0x80`) are surfaced through the embedded SMPTE Payload ID
Registry — never with synthesised content.

### Power features

- **URL share** (`?vpid=…`) with root-redirect query preservation.
- **Batch decode** with per-line `#` comments and sortable result table.
- **Compare two VPIDs** — byte XOR + per-field diff with spec citations.
- **ST 2110-20 SDP `a=fmtp`** generator (RFC 4175 + ST 2110-20:2017
  defaults for `PM` / `SSN` / `PAR` / `RANGE`).
- **JSON / CSV export** for single VPIDs and batches.
- **Receiver telemetry importer** — parses JSON / log dumps and 10-bit
  ANC user-data words from stream monitors (Tektronix Prism, EBU LIST,
  NMOS receivers, Imagine Selenio, Cinegy, Nevion VideoIPath, …) with
  deduplication and source-line context, auto-populating Batch decode.
- **Quick-start examples** — one-click load of common broadcast scenarios.

### Audit

Glass-to-glass audit against the authoritative SMPTE / ITU-R PDFs was
completed before this release (see `audit/SUMMARY.md`):

- 22 P0 (correctness) findings — all fixed.
- 88 P1 (silently-accepted spec violation) findings — all fixed.
- 30 P2 (cross-validation / labelling) findings — all fixed.
- 1 P3 (cosmetic) finding — fixed.

The embedded SMPTE-RA registry was refreshed against the live
spreadsheet on 2026-05-09. The audit notes one substantive bug in the
live SMPTE-RA spreadsheet (`0xCB` and `0xCC` descriptions are swapped
relative to ST 2081-30:2017 Tables 1 & 2) — the calculator follows the
ST 2081-30 PDF and is therefore *more accurate* than the live registry
for those two codes.

### Verification

Round-trip and warning-emission for every audited layout is verified
automatically by `tests/extract_vpid_js.py` + `node /tmp/vpid_test.js`.
The CI workflow runs the same self-test on every push.

### Limitations

- Codes registered in the SMPTE-RA Payload Identifier Registry but
  without a published bit-level layout in this build are surfaced
  through the registry-only fallback path with their full standard,
  description, and status — not with bit-decoded characteristics.
- ST 2081-10 (`0xC0`/`0xC1`) bit-level fields are sourced from the
  Tektronix "Creating 4K/UHD Content" poster (the original SMPTE PDF
  was not available); decoded fields are tagged `ST 2081-10 (Tek)` to
  make the provenance explicit.
