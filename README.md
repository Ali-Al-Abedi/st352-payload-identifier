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
| `0xC0 / 0xC1` | ST 2081-10 (Tek) | 6G-SDI 4K / 1080p HFR |
| `0xCE / 0xCF` | ST 2082-10 | 12G-SDI 4K / 1080p HFR |
| `0xD0` | ST 2082-11 | Dual-link 12G-SDI 8K |
| `0xD2` | ST 2082-12 | Quad-link 12G-SDI 8K |

### Registry-only fallback

Every Byte 1 in the [SMPTE-RA Payload Identifier Registry][smpte-ra]
that doesn't have a bit-level decoder above is still recognised and
displayed with its registered `standard`, `description`, and `status` —
deprecated or in-force — by routing through the embedded registry
mirror. This includes ST 259, ST 294, ST 274 (legacy), ST 296 (legacy),
ST 347, and ST 349.

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

## License

Internal to Fox / Vortex broadcast engineering. The SMPTE PDFs in
`docs/smpte/` are subject to SMPTE's own copyright; consult the SMPTE
Standards page before redistributing.
