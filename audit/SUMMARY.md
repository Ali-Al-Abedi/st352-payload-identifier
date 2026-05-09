# VPID Calculator — Glass-to-Glass Audit Summary

This is the rolled-up summary of the glass-to-glass audit conducted against the authoritative
SMPTE / ITU-R PDFs in `~/Desktop/smpte docs/` (extracted to `audit/pdf-text/`, gitignored
because copyrighted). Every Byte 1 layout that the calculator decodes was checked end-to-end
against its source standard for:

- correct bit-field parsing,
- explicit `warnings.push(...)` for every reserved-bit violation and per-spec mandated-bit
  / cross-validation rule,
- exposure of raw numeric bit fields (`rate`, `samp`, `colorimBits`, etc.) so that the
  encoder can reconstruct the exact input bytes on round-trip,
- spec-canonical preset / smoke-test vectors.

Methodology is documented in `audit/README.md`. Each individual finding is in
`audit/findings/<code-range>-<spec>.md`.

## Severity legend

| Level | Meaning |
| ----- | ------- |
| P0    | Calculator is *demonstrably wrong* (incorrect decode, broken round-trip, off-spec characteristics). |
| P1    | Spec violation that should warn the operator but is silently accepted. |
| P2    | Cross-validation, label, or readability gap that confuses the operator but doesn't change correctness. |
| P3    | Cosmetic / low-impact. |

## Status

| Status | Code-range | Spec | P0 | P1 | P2 | P3 | Findings file |
| ------ | ---------- | ---- | -- | -- | -- | -- | ------------- |
| ✅ | 0x01 / 0x02 / 0x03 / 0x04 / 0x05 / 0x06 | ST 352:2013 Annex C | 6 | 19 | 1 | 0 | `findings/0x01-06-st352-annex-c.md` |
| ✅ | 0x81 / 0x82 / 0x83 / 0x86 | ST 352:2013 Annex B + ST 259 / ST 347 / ST 349 | 4 | 17 | 3 | 0 | `findings/0x81-82-83-86-st352-base.md` |
| ✅ | 0x84 / 0x85 | ST 292-1:2018 | 1 | 8 | 2 | 0 | `findings/0x84-85-st292-1.md` |
| ✅ | 0x87 | ST 372:2017 | 2 | 2 | 2 | 0 | `findings/0x87-st372.md` |
| ✅ | 0x88 / 0x89 / 0x8A-0x8D | ST 425-1:2017 | 0 | 4 | 4 | 0 | `findings/0x88-89-st425-1.md` |
| ✅ | 0x8E / 0x8F / 0x91 / 0x92 / 0x93 / 0x99 / 0x9A / 0x9B / 0xB1 | ST 425-2/-4/-6 + ST 292-2 (Stereoscopic) | 1 | 0 | 6 | 0 | `findings/0x8E-9B-stereo.md` |
| ✅ | 0x90 / 0xA0 | ST 435-1 | 0 | 1 | 3 | 0 | `findings/0x90-A0-st435-1.md` |
| ✅ | 0x94 / 0x95 / 0x96 / 0x97 / 0x98 | ST 425-3 / ST 425-5 | 4 | 22 | 4 | 0 | `findings/0x94-98-st425-3-5.md` |
| ✅ | 0xA1 / 0xA2 / 0xA5 / 0xA6 | ST 2036-3 / ST 2036-4 | 0 | 0 | 3 | 0 | `findings/0xA1-A2-A5-A6-st2036-3-4.md` |
| ✅ | 0xB0 / 0xB2 | ST 2047-2 / ST 2047-4 | 0 | 0 | 0 | 0 | `findings/0xB0-B2-st2047-2-4.md` |
| ✅ | 0xB3 | ST 2048-3:2024 | 0 | 0 | 1 | 0 | `findings/0xB3-st2048-3.md` |
| ✅ | 0xB4 / 0xB5 | RDD 22:2012 | 0 | 0 | 0 | 0 | `findings/0xB4-B5-rdd22.md` |
| ✅ | 0xC0 / 0xC1 | ST 2081-10:2018 | 1 | 1 | 0 | 0 | `findings/0xC0-C1-st2081-10.md` |
| ✅ | 0xC2 / 0xF3 | ST 2081-11:2019 | 0 | 0 | 0 | 0 | `findings/0xC2-F3-st2081-11.md` |
| ✅ | 0xC3 / 0xCB / 0xCC / 0xCD | ST 2081-30:2017 | 0 | 0 | 0 | 1 | `findings/0xC3-CB-CC-CD-st2081-30.md` |
| ✅ | 0xC4 / 0xC5 | ST 2081-12:2019 | 1 | 0 | 0 | 0 | `findings/0xC4-C5-st2081-12.md` |
| ✅ | 0xCE / 0xCF | ST 2082-10:2018 | 0 | 4 | 0 | 0 | `findings/0xCE-CF-st2082-10.md` |
| ✅ | 0xD0 / 0xD1 | ST 2082-11:2019 | 0 | 6 | 0 | 0 | `findings/0xD0-D1-st2082-11.md` |
| ✅ | 0xD2 / 0xD3 | ST 2082-12:2019 | 0 | 4 | 0 | 0 | `findings/0xD2-D3-st2082-12.md` |
| ✅ | 0xD9-0xDE | ST 2082-30:2017 | 0 | 0 | 0 | 0 | `findings/0xD9-DE-st2082-30.md` |
| ✅ | 0xDF-0xF1 | ITU-R BT.2077-2 | 0 | 0 | 1 | 0 | `findings/0xDF-F1-bt2077-2.md` |
| ✅ | 0xF4-0xF9 | ITU-R BT.2077-3 | 2 | 0 | 0 | 0 | `findings/0xF4-F9-bt2077-3.md` |

**Totals across all audits:** 22 P0, 88 P1, 30 P2, 1 P3.

Every finding has been fixed in `vpid.html` and verified by:

1. A targeted probe script (`/tmp/probe_<spec>.js`) executed via Node.js against the
   extracted JavaScript (`tests/extract_vpid_js.py`).
2. The full self-test bundle (`node /tmp/vpid_test.js`) — currently:
   `[VPID self-test] OK -- all tests passed`.
3. Decode smoke samples that exercise both canonical and intentionally-invalid byte
   combinations to confirm that warnings emit on violations and *don't* emit on canonical
   inputs.

## Common bug patterns and the fix template

A handful of root-cause patterns recurred across nearly every audit:

1. **Missing `warnings.push` for reserved bits.** Decoders flagged reserved-bit violations
   only at the `field` level (`flag: "warn"`) but did not push them onto the operator-
   visible `warnings` array. Fixed by adding explicit `warnings.push(...)` calls with
   citations to the source standard's table.
2. **Decoded characteristics expose strings, encoder expects raw fields.** `decode()` would
   populate `characteristics.aspect = "16:9"`, `characteristics.bitDepth = "10-bit"`, etc.,
   but `encode()` would reach for `c.aspectBit`, `c.depthBit`, etc. — silently zeroing out
   any non-canonical input on round-trip. Fixed by always exposing the raw numeric bit
   value (`aspectBit`, `samp`, `rate`, `colorimBits`, …) plus the per-byte reserved-bit
   captures in the `characteristics` object, and by rewriting each encoder to *prefer* those
   raw fields with backward-compatible string fallbacks.
3. **Bit-depth tables shared across specs that disagree.** ST 292-1:2018 §9.5.4 and
   ST 372:2017 §7.4 use the same field but with mutually-incompatible mappings (`{8/10/Res/
   10FR}` vs `{10FR/10/12/12FR}`). The single `BIT_DEPTH_HD_1080` constant was used
   everywhere. Fixed by introducing per-spec tables (`BIT_DEPTH_ST372`,
   `BIT_DEPTH_ST425_3_BDS`) and routing each layout through its matching table.
4. **Cross-validation absent.** Multi-mode codes (ST 425-1 Level B-DL, ST 2082-12 Mode 1/2/3,
   ST 347 Systems 1-6, ST 349 Table 1, ST 352 §C.3 six-pair set, etc.) define legal
   (rate × sampling × scan × link) tuples but the calculator never enforced them. Fixed by
   adding per-mode cross-validation that emits a warning for any out-of-set tuple.

## Remaining audit work

The Byte 1 registry up through 0xF9 is fully audited. Remaining items in the registry are
either:

- Reserved (0x07–0x80): no semantics defined; calculator already reports "Reserved".
- Unregistered (0xFA–0xFF): calculator already reports "Not registered".

No new Byte 1 codes appear in the SMPTE Payload ID Registry as of the version pulled into
`docs/registry/byte1-payload-id.csv`. If/when SMPTE publishes new codes, the audit framework
in `audit/README.md` provides a repeatable procedure to extend coverage.

## Repro

To re-verify the audit at any time:

```bash
python3 tests/extract_vpid_js.py        # writes /tmp/vpid_test.js
node /tmp/vpid_test.js                  # full self-test (round-trip + smoke)

# Per-family probes:
awk '/^\(function \(\) \{/{exit} {print}' /tmp/vpid_test.js > /tmp/probe_run.js
cat /tmp/probe_<family>.js >> /tmp/probe_run.js
node /tmp/probe_run.js
```

`tests/extract_pdfs.sh` regenerates `audit/pdf-text/*.txt` from the source PDFs in
`~/Desktop/smpte docs/`. The PDF text is gitignored because the source documents are
copyrighted.
