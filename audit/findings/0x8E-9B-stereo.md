# Audit: 0x8E / 0x8F / 0x91-0x93 / 0x99-0x9B / 0xB1 — Stereoscopic VPIDs

**Specs under audit**:
- SMPTE ST 292-2:2011 §6 — single-link 3G stereoscopic byte 2/3/4
- SMPTE ST 425-2:2012 §4 — single-link 3G stereoscopic (carries ST 292-2)
- SMPTE ST 425-4:2012 §7 — dual-link 3G stereoscopic (Levels A and B-DL)
- SMPTE ST 425-6:2014 §7 — quad-link 3G stereoscopic (Levels A, B-DL, B-DS 2160)
- SMPTE ST 425-1:2017 §4.1.6.2.2 — referenced for the "Level A" byte 3
  layout used by 0x91 / 0x92 / 0x99 (post-2017 edition)

**Layouts audited**:
- `0x8E` — Stereoscopic 720-line on a single 3 Gb/s SDI (ST 425-2)
- `0x8F` — Stereoscopic 1080-line on a single 3 Gb/s SDI (ST 425-2)
- `0xB1` — Stereoscopic 720/1080-line on dual 1.5 Gb/s SDI (ST 292-2)
- `0x91` — Stereoscopic 720-line on dual 3G Level A (ST 425-4)
- `0x92` — Stereoscopic 1080-line on dual 3G Level A (ST 425-4)
- `0x93` — Stereoscopic 1080-line on dual 3G Level B-DL (ST 425-4)
- `0x99` — Stereoscopic 1080-line on quad 3G Level A (ST 425-6)
- `0x9A` — Stereoscopic 1080-line on quad 3G Level B-DL (ST 425-6)
- `0x9B` — Stereoscopic 2160-line on quad 3G Level B-DS (ST 425-6)

## Result

| Severity | Count | Status |
|----------|-------|--------|
| P0       | 1 (12 round-trips broken) | ✅ FIXED |
| P1       | 0     | —      |
| P2       | 6     | ✅ FIXED |
| P3       | 0     | —      |

## Findings

### F-stereo-01 — All stereoscopic decode → encode round-trips broken (P0)

**Spec**: A correctly-decoded VPID must encode back to its original
4-byte sequence so the tool can be used as a generator (the user
requested "bidirectional functionality").

**Bug**: All five stereo encoders (`encodeStereoSingle3G`,
`encodeStereoDualLevelA`, `encodeStereoDualLevelBDL`,
`encodeStereoQuadLevelA`, `encodeStereoQuadBDL_or_2160`) read
`c.bitDepth` and AND-masked it with `0x3`. But the decoders set
`c.bitDepth` to a **string** label (e.g. `"10-bit"`). String AND
0x3 evaluates to `NaN & 0x3 → 0`, producing always 0h depth on
encode, which corrupted every byte 4. Similarly:
- `c.rate` was never written by stereo decoders → encoders defaulted
  to `0xA` (59.94) on every round-trip
- `c.samp` was never written → defaulted to 0
- `c.eye` was never written → defaulted to 0 (Le)
- `c.dataStream` (for `0x9A`/`0x9B`) was never written → defaulted to 0
- `c.linkAssignment` (for `0x93`) — only matched on string `"Link B"`
  but the decoder set `c.channel = "Le, Link B"` (different shape)
- `c.audioRe` was never written, dropping any Re-eye audio status bits

Probe before fix: 0/12 round-trip vectors passed.
Probe after  fix: 12/12 round-trip vectors pass byte-exactly.

**Fix**: Each stereoscopic decoder now exposes raw numeric bit
fields in its `characteristics` object:
- `rate`, `samp`, `depthBits`, `colorimBits` (or `colorimSplitBits`),
  `aspectBit`, `hSampBit` / `hSampCode`, `audioReBits`
- `eye`, `linkBit`, `channelPairBit`, `dataStreamBits` as appropriate

Each encoder now *prefers* these raw numeric fields when present and
falls back to the legacy string-form properties to preserve any
external callers that may construct characteristics objects manually
(e.g. the SDP fmtp generator).

### F-stereo-02 — Missing 0x8E hSampCode validity check (P2)
**Spec**: ST 425-2:2012 §4.1 / ST 292-2 Table 4 — `0x8E` is the
**dedicated 720-line stereoscopic** payload. Its byte 3 b7:b6 must be
2h (= 1280). Codes 0h (1920), 1h (2048), 3h (Reserved) are invalid for
this Byte 1 value.

**Bug**: Decoder accepted any of 0/1/2 silently and returned a wrong
resolution string like "1920×720" without flagging the inconsistency.

**Fix**: Added warning in `decodeStereoSingle3G` when
`layoutHex === 0x8E && hSampCode !== 2`.

### F-stereo-03 — Missing 0x8F hSampCode validity check (P2)
**Spec**: ST 425-2:2012 §4.1 — `0x8F` is the dedicated 1080-line
stereoscopic payload. Byte 3 b7:b6 must be 0h (1920) or 1h (2048).
2h (1280) and 3h (Reserved) are invalid for this Byte 1 value.

**Bug**: Decoder accepted 2h silently and returned "1280×1080".

**Fix**: Added warning in `decodeStereoSingle3G` when
`layoutHex === 0x8F && hSampCode !== 0 && hSampCode !== 1`.

### F-stereo-04 — Missing colorimetry-1h Reserved warning for 0x91 / 0x92 (P2)
**Spec**: ST 425-4 §7 references the ST 425-1:2017 Level A byte 3
layout for both `0x91` and `0x92`. Per ST 425-1:2017 §4.1.6.2.2, only
0h (Rec.709) / 2h (UHDTV) / 3h (Unknown) are defined; 1h is Reserved.

**Bug**: `decodeStereoDualLevelA` displayed "Reserved" as the label
(after the upstream `COLORIMETRY_2BIT[0x1]` fix from the ST 425-1
audit) but did not emit a warning.

**Fix**: Added explicit warning in `decodeStereoDualLevelA` when
`cm === 0x1`.

### F-stereo-05 — Missing colorimetry-1h Reserved warning for 0x99 (P2)
**Spec**: ST 425-6 §7.2 references the ST 425-3 Level A byte 3 layout
for `0x99`, which itself uses the modern 2-bit colorimetry encoding.
Same Reserved-1h rule applies.

**Bug**: `decodeStereoQuadLevelA` displayed "Reserved" as the label
but did not warn.

**Fix**: Added explicit warning in `decodeStereoQuadLevelA` when
`cm === 0x1`.

### F-stereo-06 — Missing reserved-sampling-code warnings on all five stereo decoders (P2)
**Spec**: ST 352:2013 Table 3 marks codes Bh, Ch, Dh, Fh as Reserved.
ST 292-2 / ST 425-2 / ST 425-4 / ST 425-6 inherit this table.

**Bug**: Decoders silently displayed "Reserved" as the sampling label
for these codes without adding a warning. (The single-link
`decodeStereoSingle3G` already had reserved-bit warnings on byte 3 b4
and byte 4 b7 / b5:b4 but not on the sampling codes.)

**Fix**: Added explicit reserved-sampling warnings on:
- `decodeStereoDualLevelA` (0x91 / 0x92)
- `decodeStereoDualLevelBDL` (0x93)
- `decodeStereoQuadLevelA` (0x99)
- `decodeStereoQuadBDL_or_2160` (0x9A / 0x9B)

(`decodeStereoSingle3G` already had a warning on `hSampCode === 3`,
so no change was needed there for this finding.)

## Validation

- `tests/extract_vpid_js.py` includes new vectors for canonical
  decodes, hSampCode validity, colorimetry-1h Reserved warnings,
  and the ST 425-6 (2160) 10-bit-only restriction:
  - `8E CA 80 01`, `8E CA 00 01`
  - `8F CA 00 01`, `8F CA 80 01`
  - `B1 CA 80 01`
  - `91 CA 90 01`, `92 CA 90 01`
  - `93 CA 80 01`
  - `99 CA 90 01`, `9A CA 80 01`, `9B CA 80 02`
- A focused probe (`/tmp/probe_stereo.js`) confirms 12/12 round-trip
  vectors are now byte-exact across all five stereo decoders.
- All previous self-tests continue to pass.
