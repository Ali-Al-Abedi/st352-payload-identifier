# SMPTE Payload ID Registry refresh — 2026-05-09

**Source.** [SMPTE Registration Authority — Video Payload ID Codes for Serial Digital Interfaces](https://www.smpte-ra.org/video-payload-id-codes-serial-digital-interfaces) → spreadsheet export
**Live registry rows pulled.** 78 (of which 2 codes — `0xC1` and `0xC5` — appear twice as multi-mode entries).
**Tool registry entries.** 78 unique Byte 1 codes in `SMPTE_BYTE1_REGISTRY` (multi-mode codes captured via `modes: [...]` array).
**Auditor.** AI agent, glass-to-glass spec audit, 2026-05-09.

---

## 1. Coverage diff

* **Codes added in live registry but missing from tool:** none
* **Codes in tool but no longer in live registry:** none

The tool already mirrors every Byte 1 row currently published by SMPTE-RA.

## 2. Substantive content differences

### 2.1 `0xCB` / `0xCC` — live SMPTE-RA spreadsheet has them swapped

The live SMPTE-RA spreadsheet currently shows:

| Code | SMPTE-RA spreadsheet |
|---|---|
| `0xCB` | "Carriage of 4 × (SMPTE ST 292-1) 1080-line video payloads on a 6 Gb/s serial digital interface" |
| `0xCC` | "Carriage of 2 × (SMPTE ST 425-1) 720-line video payloads on a 6 Gb/s serial digital interface" |

The authoritative ST 2081-30:2017 PDF assigns these **the other way around**:

* **Table 1, §4.2** (Mode 1, dual-stream 3G mapping): `0xC3` = 2 × ST 425-1 1080-line, **`0xCB` = 2 × ST 425-1 720-line**.
* **Table 2, §5.2** (Mode 2, quad-stream HD mapping): **`0xCC` = 4 × ST 292-1 1080-line**, `0xCD` = 4 × ST 292-1 720-line.

**Verdict.** The tool's embedded values match the PDF. The live SMPTE-RA spreadsheet entry is a registry-side typo that swaps the `0xCB` and `0xCC` descriptions. No change required in `vpid.html`. (See companion audit finding `0xC3-CB-CC-CD-st2081-30.md`.)

### 2.2 `0xC1` — live status simplified to "Provisionally Assigned"

The live registry stores `0xC1` as **two rows** — one "In Force" for 1080-line and one "Provisionally Assigned" for 1080-HFR — and renders them in the spreadsheet as separate lines. The tool already captures both via `modes: [...]`. The combined `status: "In Force / Provisionally Assigned"` string in `SMPTE_BYTE1_REGISTRY` is a deliberate UI summary and continues to render the dual mode correctly (the dropdown shows both modes; the per-byte panel keys off the bit-level decoder). No change required.

### 2.3 `0xC5` — live now stores both modes; tool already aligned

Same pattern as `0xC1`: live registry has two rows (`mode 3` HFR + `mode 2` regular). The tool's `modes: [...]` array already exposes both. The combined `standard: "ST 2081-12 mode 2/3"` summary is informative; the bit-level decoder dispatches on the actual byte 2-4 fields. No change required.

### 2.4 `0xC3` description rewording

* Tool: `"Carriage of 2 x (SMPTE ST 425-1) 1080-line video payloads on a 6 Gb/s serial digital interface"`
* Live: `"Carriage of two SMPTE ST 425-1 3G-SDI signals on a single 6G-SDI link"`

Both describe the same Mode 1 mapping, but the tool's wording exactly matches the verbatim Table 1 row caption in the ST 2081-30:2017 PDF. The live wording matches §4 (the section heading). Either is defensible; the tool wording is closer to the table that actually defines the assignment. No change.

### 2.5 `0xD1` description scope

* Tool: `"Carriage of 2160-line / 2160-line HFR source image formats and ancillary data on a dual-link 12G-SDI interface"`
* Live: `"Carriage of 2160-line High Frame Rate (HFR) Source image formats and ancillary data on a dual-link 12G-SDI interface"`

The tool's broader wording matches the ST 2082-11 Mode 2 + Mode 3 capability span captured by the bit-level decoder (which flags both 2160 and 2160-HFR rates). The live registry currently only catalogs the HFR sub-mode by name. The dropdown wording in the tool already labels `0xD1` as "(4K extended — ST 2082-11 Mode 2/3)" so users see both modes. No change.

## 3. Cosmetic differences (live registry has whitespace artifacts)

The live spreadsheet contains several stray whitespace / punctuation artifacts that the tool does **not** mirror (these would only degrade the displayed text):

| Code | Artifact in live spreadsheet | Tool wording |
|---|---|---|
| `0xC3`/`0xCB`/`0xCC`/`0xCD` | `"ST2081-30"` (no space) | `"ST 2081-30"` |
| `0xD2` | `"4320- line"` (extra space) | `"4320-line"` |
| `0xDB` | `"425-1)1080"` (no space) | `"425-1) 1080"` |
| `0xE0` | `"on  single-link"` (double space) | `"on single-link"` |
| `0xF3` | `"1080- line"` (extra space) | `"1080-line"` |
| `0xF4` | `"Octa Link"` | `"Octa-link"` |

No corrective action.

## 4. Methodology

```bash
cd /tmp/smpte_reg
curl -sSL -o byte1_registry.xlsx 'https://creatorexport.zoho.com/smptezoho/smpte-st-352-2011/xls/SMPTE_ST_352_2011_Form_View/<token>/'
unzip -o byte1_registry.xlsx -d xlsx_extracted
python3 audit_diff_registry.py    # parses sheet1.xml, walks SMPTE_BYTE1_REGISTRY block in vpid.html, prints diff
```

The XLSX is parsed via stdlib `xml.etree.ElementTree` (no third-party deps) so anyone can re-run the diff during future audits.

## 5. Conclusion

✅ **No new Byte 1 codes need to be added to the tool.**
✅ **All substantive content in `SMPTE_BYTE1_REGISTRY` is consistent with the authoritative SMPTE PDFs**, including one case (`0xCB` vs `0xCC`) where the tool is **more accurate than the live SMPTE-RA spreadsheet** because it follows ST 2081-30:2017 Tables 1 & 2 directly.
