# SMPTE source-of-truth PDFs

The SMPTE standards listed below are the authoritative bit-level
references for every decoder in `vpid.html`. They are **deliberately
not committed to this repository** — SMPTE standards are copyrighted
material and SMPTE members purchase them individually through the
SMPTE store. Once obtained, drop the PDFs into this directory and
they will be ignored by git automatically (see the repository
`.gitignore`).

## Where to obtain the PDFs

[https://www.smpte.org/standards](https://www.smpte.org/standards)
(SMPTE membership / purchase required for most documents).

## Files this repo's decoders reference

The list below is reverse-ordered by which Byte 1 family they unlock
in the calculator, so engineers can grab only the PDFs they actually
need to verify a particular code's behaviour.

### Core / always relevant

| File | Standard | Why we need it |
|------|----------|---------------|
| `st0352-2013.pdf`  | ST 352:2013   | The Payload Identifier ancillary data word itself — defines the four-byte structure that every other layout fits inside. |
| `ov0425-0-2014.pdf`, `ov0435-0-2012.pdf`, `ov2036-0-2015.pdf`, `ov292-0-2018.pdf` | ST 425 / 435 / 2036 / 292 overviews | Family-level overview documents that name the children, useful for reading the actual byte tables. |
| `eg2111-1-2021.pdf`, `eg2111-2-2019.pdf`, `eg2111-3-2021.pdf` | EG 2111 | SMPTE engineering guidelines on payload identification practice. Not normative but very helpful for explaining "why" the byte fields exist. |

### SD / HD / 3G interfaces

| File | Standard | Decoder it unlocks |
|------|----------|-------------------|
| `st0259-2008.pdf` | ST 259 | `0x81 / 0x82` SD-SDI 525i/625i / 525p/625p |
| `st0292-2-2011.pdf` | ST 292-2 | `0xB1` Stereoscopic dual-link 1.5G HD-SDI |
| `st0297-2015.pdf`, `st0297-1-2015.pdf` | ST 297 | Single-link HD overview (legacy support context) |
| `st0372-2017.pdf` | ST 372 | `0x87` Dual-link 1.5G HD-SDI |
| `st0425-2-2012.pdf` | ST 425-2 | `0x89 / 0x8A` 3G-SDI Level A / Level B |
| `st0425-4-2012.pdf` | ST 425-4 | `0x8C` Level B-DL dual-stream |
| `st0425-6-2014.pdf` | ST 425-6 | Stereoscopic 3D family (`0x8E, 0x8F, 0x91, 0x92, 0x93, 0x99, 0x9A, 0x9B`) |

### 6G / 12G / 10G mappings

| File | Standard | Decoder it unlocks |
|------|----------|-------------------|
| `st0435-1-2012.pdf`, `st0435-2-2012.pdf`, `st0435-3-2012.pdf` | ST 435 | `0x90 / 0xA0` 10G-SDI quad/octa-link 1080p / 2160p |
| `st2036-1-2014.pdf`, `st2036-2-2008.pdf` | ST 2036-1 / -2 | UHDTV image format & sampling base |
| `st2036-3-2018.pdf` | ST 2036-3 | `0xA1 / 0xA2` UHDTV1/2 over single/multi 10G |
| `st2036-4-2019.pdf` | ST 2036-4 | `0xA5 / 0xA6` UHDTV1/2 multi-link 10G 12-bit |
| `st2082-10-2018.pdf` | ST 2082-10 | `0xCE / 0xCF` 12G-SDI 4K / 1080p HFR |
| `st2082-11-2019.pdf` | ST 2082-11 | `0xD0` Dual-link 12G-SDI 4320-line (8K) §4.7; `0xD1` Dual-link 12G-SDI 2160-line (4K extended) Mode 2/3 §5.8 / §6.9 |
| `st2082-12-2019.pdf` | ST 2082-12 | `0xD2` Quad-link 12G-SDI 4320-line (8K) §4.6; `0xD3` Quad-link 12G-SDI 2160-line (4K extended) Mode 2 §5.9 |
| `st2082-30-2017.pdf` | ST 2082-30 | `0xD9 - 0xDE` Mode 1/2/3 muxes on 12G-SDI |

### VC-2 mezzanine compression

| File | Standard | Decoder it unlocks |
|------|----------|-------------------|
| `st02047-2-2010.pdf` | ST 2047-2 | `0xB0` VC-2 mezzanine compressed 1080p over 1.5G HD-SDI |
| `st2047-4-2011.pdf`  | ST 2047-4 | `0xB2` VC-2 Level 65 compressed HD over 270 Mb/s SD-SDI |
| `rp2047-1-2023.pdf`, `rp2047-3-2023.pdf`, `rp2047-5-2022.pdf` | RP 2047-x | Recommended-practice companion docs to the ST 2047 family |

### ST 2110 reference (for the SDP fmtp generator)

| File | Standard | Why we need it |
|------|----------|---------------|
| `st2110-20-2022.pdf` | ST 2110-20 | Uncompressed video over IP — SDP `a=fmtp` parameter list |
| `st2110-21-2022.pdf` | ST 2110-21 | Traffic shaping / timing — referenced by some SDP fields |
| `rp2110-23-2019.pdf`, `rp2110-24-2023.pdf` | RP 2110-23 / -24 | Single-source IP / SMPTE 2022-7 dual-stream RP |

### Industry reference (non-normative)

| File | Source | Why we need it |
|------|--------|---------------|
| `Creating-4K-UHD-Content-Poster_11W-60274-2-2.pdf` | Tektronix (publicly available) | Used as a non-normative cross-check for 6G-SDI / ST 2081-10 byte assignments; the official ST 2081-10 PDF was not available at decoder-implementation time. |

## What the decoders do without these PDFs

The implementation already has the byte-level layouts hard-coded from
having read these PDFs once — the calculator does **not** read PDFs at
runtime. These files are kept locally only as engineering provenance:
they let an engineer cross-check any decoded field back to the source
text, and they're the reference any future code that adds support for
a new byte-1 family would consult.
