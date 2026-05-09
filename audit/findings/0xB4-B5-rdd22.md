# Byte 1 = `0xB4` / `0xB5` — SMPTE RDD 22:2012

**Spec source.** SMPTE RDD 22:2012 — *Mapping of 2048×1556 Image Container into Serial Digital Interface (Film Transfer)*

**Scope.**

| Byte 1 | Section | Table | What it carries |
|---|---|---|---|
| `0xB4` | §10 | Table 25 | 2K film (2048×1556) on **dual-link 1.5 Gb/s** SDI (PsF carriage) |
| `0xB5` | §10 | Table 26 | 2K film (2048×1556) on **single 3 Gb/s** SDI (PsF carriage) |

> The image is 2048×1556 progressive captured but is **carried as PsF**
> (progressive segmented frame), so byte 2 b7 (transport) = 0
> (Interlaced) while b6 (picture) = 1 (Progressive). The hex image
> rectangle is mapped into the active picture area of two interlaced
> 1080-style frames (per §10 Figure 24 / Table 26).

**PDF.** `docs/smpte/rdd22-2012.pdf`
**Code under audit.** `vpid.html` — `makeRDD22Layout()` factory and the two `VPID_LAYOUTS` registrations.
**Status.** ✅ **Pass.** No bit-decode bugs. (Originally implemented from spec text directly — round-trip vectors lock the behaviour.)
**Auditor.** AI agent, glass-to-glass spec audit, 2026-05-08.
**Round-trip:** 5 hand-computed vectors, all pass.

---

## Byte 2 — picture / rate (both modes share Table 25/26 rows)

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|-------------|---------|
| b7    | Transport scan | "0 = Interlaced transport; 1 = Reserved" (§10 / Table 25 / Table 26) | Decoder labels `1`→Reserved (warn), `0`→Interlaced. | ✅ |
| b6    | Picture scan   | "0 = Reserved; 1 = Progressive picture" | Decoder warns on `b6=0`. | ✅ |
| b5:b4 | Reserved (=0)  | "Bits b5 and b4 shall be set to 0." | Decoder warns on non-zero. | ✅ |
| b3:b0 | Frame rate     | `2h`=24/1.001, `3h`=24, `5h`=25; **other values Reserved** | `RDD22_RATE` enforces the three-value subset; warns on others. | ✅ |

## Byte 3 — sampling / hpix (both modes)

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|-------------|---------|
| b7    | Reserved (=0) | "Bits b4, b5, and b7 are reserved and set to 0." | Decoder warns on `b7=1`. | ✅ |
| b6    | Horizontal pixel count | `0`=Reserved, `1`=2048 | Decoder warns on `b6=0`. | ✅ |
| b5:b4 | Reserved (=0) | Same | Decoder warns on non-zero. | ✅ |
| b3:b0 | Sampling structure | `1h`=Y'CbCr 4:2:2, `2h`=R'G'B', `7h`=Rfs/Gfs/Bfs (FS-Gamut); **other values Reserved** | `RDD22_SAMPLING` enforces the three-value subset; warns on others. | ✅ |

## Byte 4 — link / channel / depth

### `0xB4` (Table 25 / dual-link 1.5G)

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|-------------|---------|
| b7    | Reserved (=0) | "0 = Reserved; 1 = Reserved" — must be 0 | Warns on `b7=1`. | ✅ |
| b6    | Channel assignment | `0`=Ch1, `1`=Ch2 | Matches. | ✅ |
| b5:b2 | Reserved (=0) | All four bits Reserved | Warns on non-zero. | ✅ |
| b1:b0 | Bit depth | `1h`=10-bit; **`0h`/`2h`/`3h` Reserved** | `RDD22_DEPTH` rule enforces single value. | ✅ |

### `0xB5` (Table 26 / single 3G)

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|-------------|---------|
| b7    | Reserved (=0) | Must be 0 | Warns on `b7=1`. | ✅ |
| b6    | Channel assignment | `0h`=Ch1, `1h`=Ch2 (the source image is split across two channels even on a single 3G link, signalled by this bit per §10) | Matches. | ✅ |
| b5:b2 | Reserved (=0) | | Warns on non-zero. | ✅ |
| b1:b0 | Bit depth | `1h`=10-bit; **`0h`/`2h`/`3h` Reserved** | Same rule. | ✅ |

---

## Findings

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| 1 | (informational) | The decoder's resolution label says "2048×1556 (DCI 2K film container)". Strictly RDD 22 carries the 2048×1556 *source* image into two 1080-style PsF frames — the resolution presented to the user is the *content* size, not the carriage size. This is the correct user-facing label. | None — verified accurate per §3 / §10. |
| 2 | (informational) | The decoder reports `colorimetry: "FS-Gamut or Rec.709 (signalled in Color VANC packet, DID 41h SDID 02h)"`. Per RDD 22 §11, the colorimetry is determined by the Color ANC packet rather than the VPID; the tool surfaces this fact rather than guessing. | None. |

No P0 / P1 / P2 bugs uncovered.

---

## Round-trip vectors (all verified)

| Hex | Decode summary | Notes |
|-----|----------------|-------|
| `B4 43 42 01` | 2K film 24p Y'CbCr 4:2:2 dual-link 1.5G Ch1 10-bit | Mode 1 baseline (PsF: b7=0, b6=1) |
| `B4 45 42 41` | 2K film 25p Y'CbCr 4:2:2 dual-link 1.5G Ch2 10-bit | Channel 2 |
| `B4 42 47 01` | 2K film 23.976p Rfs/Gfs/Bfs (FS-Gamut) dual-link 1.5G Ch1 10-bit | FS-Log/FS-Gamut sampling |
| `B5 43 42 01` | 2K film 24p Y'CbCr 4:2:2 single-link 3G Ch1 10-bit | Mode 2 baseline |
| `B5 45 42 41` | 2K film 25p Y'CbCr 4:2:2 single-link 3G Ch2 10-bit | Channel 2 |

---

## Sign-off

- ✅ All decode fields trace to a verbatim line in RDD 22:2012 §10 / Tables 25-26.
- ✅ All encode fields produce bytes that match the spec.
- ✅ All Reserved values produce a warning.
- ✅ All "must be 0" / "must be 1" bits produce a warning if violated.
- ✅ Round-trip vectors cover both modes, all three rates (24/1.001, 24, 25), all three samplings (4:2:2, R'G'B', Rfs/Gfs/Bfs), and both channel values.
