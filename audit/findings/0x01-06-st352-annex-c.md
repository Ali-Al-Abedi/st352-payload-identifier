# Audit 0x01 / 0x02 / 0x03 / 0x04 / 0x05 / 0x06 — SMPTE ST 352:2013 Annex C (Historical)

| Field    | Value |
| -------- | ----- |
| Family   | Historical 2001-era VPIDs (deprecated; for legacy decoder compatibility) |
| Spec     | `audit/pdf-text/st0352-2013.txt` Annex C (Tables C.1 / C.2 / C.3 / C.4 / C.5 / C.6) |
| Code(s)  | 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 |

## Scope

Six historical Byte 1 codes from the trial-publication July 2001 SMPTE Journal version of
ST 352. ST 352:2013 keeps Annex C **normative** so that conforming decoders can identify
these legacy payloads, but explicitly forbids their use in new encoder designs:

> *"The payload identifier values defined in this annex should not be implemented in new
> encoder designs. The inclusion of this annex is solely to allow decoders conforming to
> this standard to be able to identify and decode payload identifiers that have been
> implemented according to the trial publication version as published in the July 2001
> issue of the SMPTE Journal."*

This audit verifies that the calculator decodes (and encodes for round-trip) every Annex C
payload exactly as specified in Tables C.1 – C.6 plus the per-section limitations.

## Findings

### P1: All six layouts — reserved-bit violations are silently accepted (no `warnings.push`)

Each decoder annotates its reserved-bit fields with a UI `flag: "warn"`, but does NOT push
a corresponding entry into the `warnings` array. The "deprecated" warning is already
emitted, but the operator has no visibility into *which* reserved bits are set incorrectly.

Probe evidence (representative):

```
--- 01 86 00 01 b7 reserved (Byte 2 b7:b4) ---     (only "deprecated" warning, no reserved-bit warning)
--- 03 86 06 00 b7 reserved ---                    (only "deprecated" warning)
--- 04 06 80 00 byte 3 b7:b4 reserved ---          (only "deprecated" warning)
--- 06 84 00 00 byte 3 b7 reserved ---             (only "deprecated" warning)
```

Fix: emit explicit `warnings.push(...)` calls for every reserved-bit violation in 0x01 –
0x06 (same pattern as 0x81 / 0x82 / 0x83 / 0x86).

### P1: 0x01 — frame rate / sampling limitations not enforced

ST 352:2013 §C.1 Table C.1 limits:

> *"The frame rate shall only use the values 5h (25 Hz, 625I) and 6h (30/1.001 Hz, 525I)."*
> *"The sampling identification shall only use the following values:*
>  *– 0h to identify 4:2:2 I, 720 active Luma pixels per line, 270 Mb/s SDI;*
>  *– 1h to identify 4:2:2 I, 960 active Luma pixels per line, 360 Mb/s SDI;*
>  *– Fh to identify 4:2:2 I, 4fsc operation, 143 Mb/s (525i) or 177 Mb/s (625i)."*

The current implementation does not validate either set. Probe:

```
--- 01 0A 00 01 invalid rate Ah ---                 (no rate warning)
--- 01 06 02 01 invalid sampling 2h ---             (no sampling warning)
--- 01 06 80 01 16:9 with samp=0 (valid) ---        (OK)
--- 01 06 81 01 16:9 with samp=1h ---               (OK; aspect bit only valid for 720-pixel)
```

Fix: emit warnings for any rate ∉ {5h, 6h} or sampling ∉ {0h, 1h, Fh}. The aspect bit (b4
of byte 3) is *only* defined for 720-pixel payloads (samp = 0h); emit a warning when b4 = 1
with samp ∈ {1h, Fh}.

### P1: 0x02 — frame rate / sampling / channel limitations not enforced

ST 352:2013 §C.2 Table C.2 limits:

> *"The frame rate shall only use the values 9h (50 Hz) for 625P systems and Ah (60/1.001 Hz)
> for 525P."*
> *"The sampling structure shall only use the 3h for 270 Mb/s dual-link SDI."*
> *"In the case of dual link 270 Mb/s SDI, bits b7 and b6 of byte 3 shall define a count
> value in the range 0 to 3 where 0 defines single-link operation, 1 defines channel 1 of
> dual-link operation, and 2 defines channel 2 of dual-link operation. The value of 3 is
> Reserved but not defined."*

The current implementation handles only the chPair = 3 reserved warning. Rate / sampling
validation is missing.

Fix: emit warnings for any rate ∉ {9h, Ah} or sampling ≠ 3h. The aspect bit (byte 3 b4) is
*only* defined for 720-pixel sampling; warn when b4 = 1 with non-720-pixel mapping.

### P1: 0x03 — frame-rate × sampling cross-validation not enforced

ST 352:2013 §C.3 limits Annex C.3 to **exactly six** (rate × sampling) combinations:

| Rate (b2 b3:b0) | Sampling (b3 b3:b0) | Description |
|----------------:|--------------------:|-------------|
| 5h (25, 625) | 6h | 4:4:4:4 I; Y/CB/CR/Key |
| 6h (30/1.001, 525) | 6h | 4:4:4:4 I; Y/CB/CR/Key |
| 5h (25, 625) | 7h | 4:4:4:4 I; R/G/B/Key |
| 6h (30/1.001, 525) | 7h | 4:4:4:4 I; R/G/B/Key |
| 9h (50, 625) | 4h | 4:2:2 P, 4:3 |
| Ah (60/1.001, 525) | 4h | 4:2:2 P, 4:3 |

Current implementation does not validate.

Fix: emit a warning if (rate, sampling) is not one of the six legal pairs.

### P1: 0x04 — scan-format × sampling cross-validation not enforced

ST 352:2013 §C.4 limits scanning format (byte 2 b7:b6) and pairs each value with a
mandatory sampling code:

| ScanFmt (b7:b6) | Mandatory sampling (b3:b0) | Description |
|-----------------|----------------------------|-------------|
| 0h | 1h | 4:2:2 I, 16:9 |
| 1h | 5h | 4:2:2 P, 16:9 (PsF) |
| 3h | 5h | 4:2:2 P, 16:9 (Progressive) |
| 2h | — | Reserved (already warns) |

The current implementation warns for ScanFmt = 2h but does NOT cross-validate the sampling
field against the scan format.

Fix: emit warnings for (ScanFmt = 0, samp ≠ 1h), (ScanFmt = 1, samp ≠ 5h), (ScanFmt = 3,
samp ≠ 5h).

### P1: 0x05 — frame rate / sampling limitations not enforced

ST 352:2013 §C.5 limits:

> *"The frame rate shall only use the values as defined in SMPTE ST 296."*
> *"The sampling structure shall be set to 5h (4:2:2 P, 16:9)."*

ST 296 defines 720p frame rates 5h (25), 6h (30/1.001), 9h (50), Ah (60/1.001). The current
implementation does not validate either.

Fix: emit warnings for rate ∉ {5h, 6h, 9h, Ah} or sampling ≠ 5h.

### P1: 0x06 — frame rate / sampling / aspect cross-validation not enforced

ST 352:2013 §C.6 references ST 349 Table 1 for valid (rate × sampling) combinations.
Per ST 349 Table 1:

- Interlaced sampling codes {0h, 1h, 3h, 4h} require rate ∈ {5h (625), 6h (525)}.
- Progressive sampling codes {2h, 5h, 6h} require rate ∈ {9h (625), Ah (525)}.
- Aspect bit (byte 3 b4) is *only* defined for 720-pixel sampling (samp = 0h or 4h, etc.).

The current implementation does not validate.

Fix: emit a warning for any rate × sampling combination outside the legal sets and
emit a warning when the aspect bit is set with non-720-pixel sampling.

### P0: All six layouts — round-trip is BROKEN

Same root cause as every previous audit: encoders read raw numeric bit fields (`c.rate`,
`c.samp`, `c.aspectBit`, `c.scanFmtBit`, `c.chPairBit`, `c.mappingBit`), but decoders
populate string labels into `c.aspect = "16:9"`, `c.scan = "PsF"`, `c.channel = "Dual-link
Ch 1"`, and do not expose the underlying numeric bit values. They also drop reserved-bit
captures, so any non-canonical input is silently zeroed on encode.

Probe evidence:

```
RT 01 06 80 01: MISMATCH (encoder ignores Byte 4 b0 = 1 reserved capture)
RT 02 0A 73 00: MISMATCH (chPair string-only path drops the value)
RT 03 09 04 00: MISMATCH (rate/sampling raw vs string mismatch)
RT 04 4A 05 00: MISMATCH (scanFmt PsF string vs numeric)
RT 05 0A 05 00: MISMATCH (rate string-only path)
RT 06 4A 12 00: MISMATCH (mappingMode + aspect string-only path)
```

Fix: expose raw numeric fields (`rate`, `samp`, `aspectBit`, `scanFmtBit`, `chPairBit`,
`mappingBit`, plus per-byte reserved captures) in `characteristics`; rewrite each encoder
to prefer those fields with backward-compatible string fallbacks.

### P2: All six layouts — sampling labels show modern Table 3 instead of historical §C.x meaning

The historical Annex C sections were written against the 2001 trial-publication of ST 352
which defined sampling-structure values **differently** from the modern (2013-onwards) main-
body Table 3. For example, ST 352:2013 main-body Table 3 maps `5h → 4:4:4:4 (Y/CB/CR/A)`,
but §C.5 mandates `5h = 4:2:2 P, 16:9` for ST 296 payloads.

The current implementation routes every `samp` value through the modern global `SAMPLING`
table, producing inaccurate labels (e.g. "4:4:4:4 Y'CbCr+A" for `0x05 0A 05 00`, when the
correct historical label is "4:2:2 P, 16:9").

Fix: introduce per-section sampling-label tables (`SAMPLING_C1` … `SAMPLING_C6`) that
reflect the historical interpretation; use them in each decoder's `fields` push and in the
`characteristics.sampling` field. Values not defined in §C.x render as
`"Reserved (Xh not defined for §C.y)"`.

## Resolution

All findings addressed in the same pass:

- 🛠 **0x01 – 0x06 decoders rewritten** to emit explicit `warnings.push(...)` for every
  reserved-bit violation (Tables C.1 – C.6) and every per-section limitation that is
  violated (rate sets, sampling sets, scan × sampling cross-validations, ST 349 system
  cross-validation for 0x06). Every layout now exposes raw numeric bit fields.
- 🛠 **0x01 – 0x06 encoders rewritten** to prefer the new raw fields with backward-
  compatible string fallbacks (so manual UI input still works).
- 🛠 **0x02 chPair captured as raw `chPairBit`** in characteristics (was previously dropped).
- 🛠 **Per-§C sampling-label tables** (`SAMPLING_C1`–`SAMPLING_C6`) introduced and wired
  through each decoder's `fields` and `characteristics.sampling`.

## Verification

- Probe `/tmp/probe_352_annex_c.js`: every reserved-bit violation in 0x01 – 0x06 emits an
  explicit warning; every per-section limitation (rates, samplings, ScanFmt cross-validation,
  Annex C.6 system cross-validation) emits a warning; all 24 round-trip cases (4 per layout)
  round-trip identically.
- Self-test (`node /tmp/vpid_test.js`): `[VPID self-test] OK -- all tests passed`.
- Smoke decode samples: 6 new vectors (canonical and intentionally-invalid for warning
  exercise) decode with correct characteristics and only the expected `WARN` lines.

| Status | Code | Findings |
| ------ | ---- | -------- |
| ✅     | 0x01 | 4 × P1 (reserved-bit warnings, rate set, sampling set, aspect-bit cross-validation), 1 × P0 (round-trip), 1 × P2 (sampling label) |
| ✅     | 0x02 | 4 × P1 (reserved-bit warnings, rate set, sampling set, aspect-bit cross-validation), 1 × P0 (round-trip), shared P2 (sampling label) |
| ✅     | 0x03 | 2 × P1 (reserved-bit warnings, six-pair cross-validation), 1 × P0 (round-trip), shared P2 (sampling label) |
| ✅     | 0x04 | 2 × P1 (reserved-bit warnings, ScanFmt × sampling cross-validation), 1 × P0 (round-trip), shared P2 (sampling label) |
| ✅     | 0x05 | 3 × P1 (reserved-bit warnings, rate set, sampling = 5h), 1 × P0 (round-trip), shared P2 (sampling label) |
| ✅     | 0x06 | 4 × P1 (reserved-bit warnings, rate × sampling cross-validation, aspect-bit cross-validation), 1 × P0 (round-trip), shared P2 (sampling label) |
