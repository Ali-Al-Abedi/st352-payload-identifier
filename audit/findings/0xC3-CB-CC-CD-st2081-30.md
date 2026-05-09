# Byte 1 = `0xC3` / `0xCB` / `0xCC` / `0xCD` — SMPTE ST 2081-30:2017

**Spec source.** SMPTE ST 2081-30:2017 — *Carriage of Multiple Source Image Formats and Ancillary Data on a Single 6G-SDI Link (Mux)*

**Scope.**

| Byte 1 | Mode | Section | Table | What it carries | Bytes 2-4 follow |
|---|---|---|---|---|---|
| `0xC3` | Mode 1 | §4.2 | Table 1 row 1 | 2 × (ST 425-1) 1080-line | ST 425-1 (Level A) — same byte 2-4 as `0x89` |
| `0xCB` | Mode 1 | §4.2 | Table 1 row 2 | 2 × (ST 425-1) 720-line  | ST 425-1 (Level A) — same byte 2-4 as `0x88` |
| `0xCC` | Mode 2 | §5.2 | Table 2 row 1 | 4 × (ST 292-1) 1080-line | ST 292-1               — same byte 2-4 as `0x85` |
| `0xCD` | Mode 2 | §5.2 | Table 2 row 2 | 4 × (ST 292-1) 720-line  | ST 292-1               — same byte 2-4 as `0x84` |

> Spec wording (§4.2 / §5.2 verbatim): "Bytes 2 through 4 of the
> payload identifier shall be set in accordance with the picture rate,
> sampling structure, dynamic range and bit-depth, etc., of the image
> format being carried on the interface as defined in SMPTE ST 425-1 /
> ST 292-1."

**PDF.** `docs/smpte/st2081-30-2017.pdf`
**Code under audit.** `vpid.html` — `makeMuxLayout()` factory and the four `VPID_LAYOUTS` registrations.
**Status.** 🛠 **Fixed (was P3).** Bit-level decode delegation is correct; only the registry description for `0xC3` differed from the verbatim Table 1 caption.
**Auditor.** AI agent, glass-to-glass spec audit, 2026-05-08.
**Round-trip:** 4 hand-computed vectors all pass.

---

## Byte 1 — base-layout delegation (the only byte ST 2081-30 specifies)

| Byte 1 | Tool's `baseLayoutHex` | Spec-required base layout (§4.2 / §5.2) | Verdict |
|---|---|---|---|
| `0xC3` | `0x89` (3G-A 1080-line) | "ST 425-1 Level A" 1080-line — `0x89` per ST 425-1 §6.4 | ✅ |
| `0xCB` | `0x88` (3G-A 720-line)  | "ST 425-1 Level A"  720-line — `0x88` per ST 425-1 §6.5 | ✅ |
| `0xCC` | `0x85` (HD 1080-line)   | "ST 292-1" 1080-line — `0x85` per ST 292-1 §9.5         | ✅ |
| `0xCD` | `0x84` (HD 720-line)    | "ST 292-1"  720-line — `0x84` per ST 292-1 §9.4         | ✅ |

> The lazy-lookup fix landed previously (`makeMuxLayout` resolves the
> base layout at decode/encode time, not at registration time) is
> verified working: all four mux layouts decode their bytes 2-4 by
> calling into the underlying single-stream layout and the result
> matches the spec.

## Bytes 2-4 — delegated

ST 2081-30 explicitly defers all bit-level definitions for bytes 2-4
to the underlying single-stream standard. Every field that `0xC3`
exposes (rate, sampling, bit depth, etc.) is **identical** to the
field set documented for `0x89` / `0x88` / `0x85` / `0x84` in their
respective audits:

- `0xC3` ⟂ `audit/findings/0x88-8D-st425-1.md` (`0x89`)
- `0xCB` ⟂ `audit/findings/0x88-8D-st425-1.md` (`0x88`)
- `0xCC` ⟂ `audit/findings/0x84-85-st292-1.md` (`0x85`)
- `0xCD` ⟂ `audit/findings/0x84-85-st292-1.md` (`0x84`)

Any P0/P1 found in those base-layout audits will affect these mux
layouts equally; nothing has been duplicated here.

---

## Findings

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| **1** | P3 | Registry description for `0xC3` was the section-heading text ("Carriage of two SMPTE ST 425-1 3G-SDI signals on a single 6G-SDI link") rather than the Table 1 caption ("Carriage of 2 x (SMPTE ST 425-1) 1080-line video payloads on a 6 Gb/s serial digital interface"). The other three (`0xCB`, `0xCC`, `0xCD`) already used the table-caption form. | Updated `0xC3` description to the Table 1 caption verbatim. The other three entries were already correct from the previous registry-correction pass. |
| 2 | (informational) | `status` field for all four codes is `"Provisionally Assigned"`. ST 2081-30 was published in 2017 ("In Force" per SMPTE), but the SMPTE Payload ID Registry online still tracks `0xC3`/`0xCB`/`0xCC`/`0xCD` as Provisionally Assigned at time of last refresh. Field reflects the registry, not the standard's force status — left as-is. | None. |

No P0 / P1 / P2 bugs uncovered.

---

## Round-trip vectors (all verified)

| Hex | Decode summary | Notes |
|-----|----------------|-------|
| `C3 CA 80 01` | 2× 3G-A 1080p59.94 SDR Rec.709 4:2:2 10-bit muxed on 6G | Mode 1 baseline (delegates to `0x89`) |
| `CB CA 00 01` | 2× 3G-A 720p59.94 muxed on 6G                              | Mode 1 720-line (delegates to `0x88`) |
| `CC 06 20 01` | 4× HD-SDI 1080i29.97 muxed on 6G                           | Mode 2 baseline (delegates to `0x85`) |
| `CD CA 00 01` | 4× HD-SDI 720p59.94 muxed on 6G                            | Mode 2 720-line (delegates to `0x84`) |

---

## Sign-off

- ✅ All four mux entries delegate to the spec-required base layout.
- ✅ Lazy-lookup fix (so mux registers before its base) verified by self-test.
- ✅ Registry descriptions match Table 1 / Table 2 captions verbatim.
- 🔗 Bit-level correctness depends on `0x84`/`0x85`/`0x88`/`0x89` audits — see linked files.
- ✅ Round-trip vectors cover all four mux entries.
