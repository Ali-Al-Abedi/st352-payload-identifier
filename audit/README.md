# VPID Calculator — Glass-to-glass spec audit

This directory contains a **bit-by-bit cross-check** of every Byte 1
family decoded by `vpid.html` against the authoritative SMPTE / ITU-R
PDF that defines it.

The goal is unambiguous: prove (or disprove, and fix) that every field
the tool decodes — bit position, name, value mapping, reserved-bit
handling, allowed value subsets, citation — matches the standard
verbatim, with no abstractions or assumptions hiding in the code.

## How this audit is conducted

For each Byte 1 family:

1. The relevant SMPTE / ITU-R PDF is converted to plain text via
   `pdftotext -layout` and stored under `pdf-text/`. The original PDFs
   are **not** committed (SMPTE copyright); engineers must obtain their
   own copies — see [`docs/smpte/README.md`](../docs/smpte/README.md).
2. The decoder + encoder source in `vpid.html` is read alongside the
   PDF text.
3. Every bit field of byte 2, byte 3, and byte 4 is checked
   individually against the spec table:
   - bit position and width
   - field name as written in the spec
   - value-to-label mapping (every defined value, plus all
     "Reserved" entries)
   - reserved-bit warning behaviour
   - allowed-value enforcement (e.g. an "allowedRates" subset)
4. 4-8 round-trip vectors are hand-computed from the spec and verified
   to round-trip cleanly through `decode(...) → encode(...) → bytes`.
5. Findings are recorded under `findings/<byte1>-<spec>.md` using the
   template below. Severities are P0 / P1 / P2 / P3 (see § Severity).
6. Bugs uncovered are fixed in `vpid.html` and then re-verified. The
   audit file's "status" line records the as-fixed state.

## Severity scale

| Severity | Definition | Example |
|----------|------------|---------|
| **P0**   | Decoder produces a *wrong* characteristic for a valid spec input. The tool would mislead an engineer. | `byte 3 b6` polarity inverted: 1080 source decoded as 2K DCI. |
| **P1**   | Decoder accepts an invalid spec input *without* warning. The tool is silently permissive. | Out-of-spec picture rate not flagged. |
| **P2**   | Decoder *would* warn but the warning text doesn't cite the right table / paragraph. | Warning says "ST 425-1 §6.4" when the spec ref is "§6.5". |
| **P3**   | Cosmetic: label wording differs slightly from the spec but the underlying value is correct. | Tool says "Y'CbCr" where the spec table writes "Y'C'B'C'R'". |

## Status legend

Each audit file's status line uses these markers:

| Marker | Meaning |
|--------|---------|
| ✅ Pass | Field implementation matches the spec exactly. |
| ⚠️ Warn | Implementation matches the spec but the spec itself has Reserved/undefined values that the test exercises. |
| ❌ Fail (P*x*) | Implementation differs from the spec; severity ranked. Fix is recorded inline. |
| 🛠 Fixed (was P*x*) | Audit found a bug; the fix has landed and is included in the round-trip vectors below. |

## Template

See [`_template.md`](_template.md) for the per-family audit template.
Each family follows the same structure so the audits are
machine-readable and human-skimmable.

## Files

```
audit/
├── README.md              ← this file
├── _template.md           ← audit template
├── _index.md              ← roll-up of every audit's status
├── pdf-text/              ← pdftotext extracts of every referenced PDF
│                            (gitignored, rebuilt by tests/extract_pdfs.sh)
└── findings/
    ├── 0xC0-C1-st2081-10.md
    ├── 0xC2-F3-st2081-11.md
    ├── 0xC4-C5-st2081-12.md
    ├── 0xC3-CB-CC-CD-st2081-30.md
    ├── 0xF4-F9-bt2077-3.md
    ├── 0xB4-B5-rdd22.md
    ├── 0xDF-F1-bt2077-2.md
    ├── 0xD9-DE-st2082-30.md
    ├── 0xD2-D3-st2082-12.md
    ├── 0xD0-D1-st2082-11.md
    ├── 0xCE-CF-st2082-10.md
    ├── 0xB3-st2048-3.md
    ├── 0xB0-B2-st2047.md
    ├── 0xA1-A2-A5-A6-st2036.md
    ├── 0x90-A0-st435-1.md
    ├── 0x8E-9B-stereo.md
    ├── 0x88-8D-st425-1.md
    ├── 0x94-98-st425-3-5.md
    ├── 0x87-st372.md
    ├── 0x84-85-st292-1.md
    ├── 0x81-86-st352-base.md
    └── 0x01-06-annex-c.md
```
