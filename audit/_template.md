# Byte 1 = `0x..` — `<Standard / Section>`

**Spec source.** `<spec name>:<year>`, §<section>, Table <n>
**PDF.** `docs/smpte/<filename>.pdf`
**Code under audit.** `vpid.html` lines <start>-<end>
**Status.** ✅ Pass / ⚠️ Warn / ❌ Fail / 🛠 Fixed
**Auditor.** AI agent, <date>
**Round-trip:** <n> hand-computed vectors all pass after fix.

## Byte 2 — picture / rate

| Bits | Spec field | Spec values (verbatim) | Code field | Code mapping | Verdict |
|------|------------|-----------------------|-----------|--------------|---------|
| b7   | Transport scan | 0 = Interlaced<br>1 = Progressive | Transport scan | 0→Interlaced, 1→Progressive | ✅ |
| b6   | Picture scan   | 0 = Interlaced<br>1 = Progressive | Picture scan   | 0→Interlaced, 1→Progressive | ✅ |
| b5:b4 | Transfer characteristics | 0h = SDR (BT.709)<br>1h = HLG<br>2h = PQ<br>3h = Unspecified | Transfer characteristics | matches | ✅ |
| b3:b0 | Picture rate | (per ST 352 Table 2) | Picture rate | matches | ✅ |

## Byte 3 — sampling / color / hpix

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|--------------|---------|
| b7   |            |             |              |         |
| b6   |            |             |              |         |
| b5:b4 |           |             |              |         |
| b3:b0 |           |             |              |         |

## Byte 4 — link / channel / depth

| Bits | Spec field | Spec values | Code mapping | Verdict |
|------|------------|-------------|--------------|---------|
| b7:b5 |           |             |              |         |
| b4    |           |             |              |         |
| b3    |           |             |              |         |
| b2    |           |             |              |         |
| b1:b0 |           |             |              |         |

## Allowed-value enforcement

| Field | Spec subset | Code enforcement | Verdict |
|-------|-------------|------------------|---------|
| Picture rate |  |  |  |
| Sampling structure |  |  |  |
| Bit depth |  |  |  |
| Link assignment |  |  |  |

## Round-trip vectors

| Hex | Decode | Round-trip |
|-----|--------|-----------|
| `XX YY ZZ WW` | resolution / rate / scan / aspect / sampling / depth / colorimetry / channel | ✅ |

## Findings

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| 1 |          |             |     |

## Sign-off

- ☐ All decode fields trace to a verbatim line in the spec.
- ☐ All encode fields produce bytes that match the spec.
- ☐ All Reserved values produce a warning.
- ☐ All "must be 1" / "must be 0" bits produce a warning if violated.
- ☐ Round-trip vectors cover every bit position at least once.
