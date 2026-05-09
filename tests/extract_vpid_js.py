#!/usr/bin/env python3
"""Extract the JS from vpid.html, strip browser-only code, and add a Node entry-point.

The extracted file is written to ``/tmp/vpid_test.js`` (default) so that the
self-test can be run headlessly with ``node /tmp/vpid_test.js``.

Usage:
    python3 tests/extract_vpid_js.py [path/to/vpid.html] [output.js]

If no arguments are given, ``vpid.html`` next to the repo root is used as the
source and ``/tmp/vpid_test.js`` as the destination.
"""
import os
import re
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEFAULT_SRC = os.path.join(REPO_ROOT, 'vpid.html')
DEFAULT_OUT = '/tmp/vpid_test.js'


def remove_block(text: str, start_marker: str) -> str:
    """Remove a function-call block starting with `start_marker`, balancing braces."""
    idx = text.find(start_marker)
    if idx == -1:
        return text
    paren_open = text.find('{', idx)
    if paren_open == -1:
        return text
    depth = 0
    end = paren_open
    in_str = None
    in_comment = None
    i = paren_open
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if in_comment == '//':
            if ch == '\n':
                in_comment = None
        elif in_comment == '/*':
            if ch == '*' and nxt == '/':
                in_comment = None
                i += 2
                continue
        elif in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
        else:
            if ch == '/' and nxt == '/':
                in_comment = '//'
            elif ch == '/' and nxt == '*':
                in_comment = '/*'
                i += 2
                continue
            elif ch in ("'", '"', '`'):
                in_str = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        i += 1
    after = text.find(')', end)
    after = text.find(';', after) + 1 if after != -1 else end + 1
    return text[:idx] + text[after:]


def extract(src_path: str, out_path: str) -> None:
    with open(src_path) as f:
        src = f.read()

    script_match = re.search(r'<script[^>]*>(.*?)</script>', src, re.DOTALL)
    if not script_match:
        print('No <script> tag found!', file=sys.stderr)
        sys.exit(1)
    js = script_match.group(1)

    js = remove_block(js, "document.addEventListener('DOMContentLoaded'")
    js = re.sub(r"window\.VPID\s*=\s*\{[^}]*\};\s*", '', js)

    js += r'''

// ---- Node self-test entry point ----
(function () {
  const failures = runSelfTest();
  if (failures.length === 0) {
    console.log('[VPID self-test] OK -- all tests passed');
  } else {
    console.error('[VPID self-test] ' + failures.length + ' failure(s):');
    for (const f of failures) console.error('   - ' + f);
    process.exit(1);
  }
  // Quick smoke checks for the new layouts and registry fallback.
  const cases = [
    ['89 CA 80 01', '3G-A 1080p59.94 SDR Rec.709'],
    ['85 06 20 01', 'HD-SDI 1080i29.97 SDR Rec.709'],
    ['85 CA 00 03', 'ST 292-1 1080p59.94 10-bit Full Range (b1:b0=3h per §9.5.4)'],
    ['85 CA 00 02', 'ST 292-1 1080p59.94 b1:b0=2h Reserved per §9.5.4 -- expect WARN'],
    ['85 CA 10 01', 'ST 292-1 1080p59.94 colorim 1h Reserved per §9.5.2 -- expect WARN'],
    ['85 CA 00 11', 'ST 292-1 1080p59.94 ICTCP signal type (byte 4 b4=1)'],
    ['84 4A 00 01', 'ST 292-1 720p59.94 (canonical: b7 Reserved=0 per §9.4 Table 4)'],
    ['84 CA 00 01', 'ST 292-1 720p59.94 NON-CANONICAL b7=1 -- expect WARN'],
    ['84 4A 00 00', 'ST 292-1 720p59.94 8-bit (b0=0 per §9.4.3)'],
    ['84 4A 01 01', 'ST 292-1 720p sampling 1h (must be 0h per §9.4.2) -- expect WARN'],
    ['87 CA 00 01', 'ST 372 dual-link 1080p59.94 SDR Rec.709 4:2:2 10-bit Link A'],
    ['87 CA 00 41', 'ST 372 dual-link 1080p59.94 same on Link B'],
    ['87 4A 00 01', 'ST 372 dual-link 1080PsF59.94 (b7=0,b6=1) -- expect Progressive (PsF)'],
    ['87 CA 00 02', 'ST 372 dual-link 1080p59.94 12-bit narrow per ST 372 §7.4 Table 5'],
    ['87 CA 00 03', 'ST 372 dual-link 1080p59.94 12-bit Full Range per ST 372 §7.4 Table 5'],
    ['87 CA 00 11', 'ST 372 dual-link 1080p59.94 ICTCP (byte 4 b4=1)'],
    ['87 CA 10 01', 'ST 372 colorim 1h Reserved per ST 372:2017 §7.3 -- expect WARN'],
    ['87 CA 0B 01', 'ST 372 sampling Bh Reserved per Table 6 -- expect WARN'],
    ['87 CA 00 81', 'ST 372 byte4 b7=1 reserved -- expect WARN'],
    ['87 CA 00 09', 'ST 372 byte4 b3=1 reserved -- expect WARN'],
    ['90 CA 20 01', 'ST 435-1 quad-link 1080p59.94 Ch1'],
    ['A0 C7 20 E1', 'ST 435-1 octa-link 2160p30 Ch8'],
    ['A1 CA 00 01', 'ST 2036-3 UHDTV1 single-link 4K p59.94'],
    ['A2 CB 00 01', 'ST 2036-3 UHDTV2 quad-link 8K p60'],
    ['A5 CB 02 01', 'ST 2036-4 UHDTV1 multi-link 4K p60 (INVERTED color bit)'],
    ['A6 CB 02 01', 'ST 2036-4 UHDTV2 multi-link 8K p60'],
    ['B0 0B 80 01', 'ST 2047-2 VC-2 mezzanine 1080p60'],
    ['D1 CA 82 02', 'ST 2082-11 Mode 2 -- 4K dual-link 12G p59.94 4:4:4 RGB 12-bit Link 1'],
    ['D1 CA C0 01', 'ST 2082-11 Mode 3 -- 4K dual-link 12G p59.94 4:2:2 YCbCr 10-bit Link 1'],
    ['D3 CA 82 22', 'ST 2082-12 Mode 2 -- 4K quad-link 12G p59.94 4:4:4 RGB 12-bit Link 2'],
    ['D3 CA C0 41', 'ST 2082-12 Mode 2 -- 4K quad-link 12G p59.94 4:2:2 YCbCr 10-bit Link 3'],
    ['D1 CA C0 02', 'ST 2082-11 INVALID -- 4:2:2 (Mode 3) with 12-bit (Mode 2 only) -- expect WARN'],
    ['D1 CA 82 41', 'ST 2082-11 INVALID -- Link 010 (Reserved) -- expect WARN'],
    ['83 06 05 01', 'ST 347 540 Mb/s 525i NTSC 4:4:4:4 Y/CB/CR/A 10-bit'],
    ['83 49 80 01', 'ST 347 540 Mb/s 625p PAL 4:2:2p 16:9 10-bit'],
    ['86 06 00 01', 'ST 349 SD-into-HD 525i 4:2:2 NTSC 4:3 normal mapping 10-bit'],
    ['86 19 02 11', 'ST 349 SD-into-HD 625p PAL 50 Hz 4:2:0p (system 12) 16:9 normal map 10-bit'],
    ['86 19 09 49', 'ST 349 SD-into-HD 625p PAL 50 Hz 4:2:0p ×2ch (system 12) 16:9 dual-ch normal map 10-bit'],
    ['86 06 00 41', 'ST 349 SD-into-HD 525i NTSC 4:2:2i ×2ch dual-ch (Tab B.4.2 sampling 0h with b6=1)'],
    ['82 4A 03 01', 'ST 352 §B.2 progressive 4:2:0 single-link 360 Mb/s 525p 59.94'],
    ['82 06 05 01', 'ST 352 §B.2 interlaced 4:4:4:4 525-line 29.97 sampling 5h Y/CB/CR/A'],
    ['82 4A 05 01', 'ST 352 §B.2 INVALID — progressive with 4:4:4:4 sampling — expect WARN'],
    ['82 4A 03 41', 'ST 352 §B.2 INVALID — SL 360 Mb/s with Ch2 — expect WARN'],
    ['83 06 05 01', 'ST 347 540 Mb/s 525i 4:4:4:4i Y/CB/CR/A 4:3 10-bit'],
    ['83 4A 80 01', 'ST 347 540 Mb/s 525p 59.94 4:2:2P 16:9 10-bit'],
    ['83 4A 05 01', 'ST 347 INVALID — progressive with 4:4:4:4 sampling — expect WARN'],
    ['83 06 00 01', 'ST 347 INVALID — interlaced with 4:2:2 sampling — expect WARN'],
    ['81 06 00 01', 'ST 352 §B.1 SD-270 525i NTSC 4:3 720 10-bit canonical'],
    ['81 46 00 01', 'ST 352 §B.1 INVALID — Byte 2 b6=1 progressive — expect WARN'],
    ['81 86 00 01', 'ST 352 §B.1 INVALID — Byte 2 b7 reserved — expect WARN'],
    ['B3 CA 01 21', 'ST 2048-3 DCI 4K p59.94 Link 1 Ch2 10-bit 4:4:4 RGB'],
    ['B3 06 02 41', 'ST 2048-3 DCI 4K p29.97 Link 3 Ch3 10-bit 4:2:0'],
    ['DF CA E0 01', 'BT.2077-2 8K (4320p) on single-link 24G SDR Rec.2020'],
    ['E0 DA F1 22', 'BT.2077-2 4K (2160p) single-link 24G HLG Rec.2020 4:4:4 RGB 12-bit ICTCP'],
    ['E1 EA E0 21', 'BT.2077-2 8K dual-link 24G PQ Rec.2020 Link 2 10-bit'],
    ['E2 CA E0 41', 'BT.2077-2 4K dual-link 24G SDR Rec.2020 Link 2'],
    ['E3 CA E0 61', 'BT.2077-2 8K quad-link 24G SDR Rec.2020 Link 3'],
    ['F1 CA E0 E1', 'BT.2077-2 8K octa-link 24G SDR Rec.2020 Link 7'],
    ['DF CA 13 01', 'BT.2077-2 INVALID -- colorim 1h Reserved -- expect WARN'],
    ['DF CA E0 41', 'BT.2077-2 INVALID -- Link 3 on single-link 24G -- expect WARN'],
    ['01 06 00 00', '[Deprecated] ST 352 §C.1 BT.601 525i 4:2:2 270 Mb/s'],
    ['01 05 00 00', '[Deprecated] ST 352 §C.1 BT.601 625i 4:2:2 270 Mb/s'],
    ['01 06 0F 00', '[Deprecated] ST 352 §C.1 BT.601 4fsc composite'],
    ['01 0A 00 00', '[Deprecated] ST 352 §C.1 INVALID — rate Ah not in {5h,6h} — expect WARN'],
    ['02 0A 03 00', '[Deprecated] ST 352 §C.2 BT.1358 525P 60/M single-link'],
    ['02 0A 43 00', '[Deprecated] ST 352 §C.2 BT.1358 525P 60/M dual-link Ch 1'],
    ['02 0A 00 00', '[Deprecated] ST 352 §C.2 INVALID — sampling 0h not 3h — expect WARN'],
    ['03 06 06 00', '[Deprecated] ST 352 §C.3 ST 347 525I 4:4:4:4 Y/CB/CR/Key'],
    ['03 09 04 00', '[Deprecated] ST 352 §C.3 ST 347 625P 4:2:2 (rate 9h + samp 4h)'],
    ['03 06 04 00', '[Deprecated] ST 352 §C.3 INVALID — rate 6h + samp 4h not in 6 legal pairs — expect WARN'],
    ['04 CA 05 00', '[Deprecated] ST 352 §C.4 ST 274 1080P 60/M progressive 4:2:2 (ScanFmt 3 + samp 5h)'],
    ['04 06 01 00', '[Deprecated] ST 352 §C.4 ST 274 1080I 30/M (ScanFmt 0 + samp 1h)'],
    ['04 4A 05 00', '[Deprecated] ST 352 §C.4 ST 274 1080PsF 60/M (ScanFmt 1 + samp 5h)'],
    ['04 06 05 00', '[Deprecated] ST 352 §C.4 INVALID — Interlace + samp 5h — expect WARN'],
    ['05 0A 05 00', '[Deprecated] ST 352 §C.5 ST 296 720p 60/1.001'],
    ['05 0A 01 00', '[Deprecated] ST 352 §C.5 INVALID — sampling 1h not 5h — expect WARN'],
    ['06 06 00 00', '[Deprecated] ST 352 §C.6 ST 349 SD into HD 525I'],
    ['06 0A 02 00', '[Deprecated] ST 352 §C.6 ST 349 SD into HD 525P (rate Ah + samp 2h)'],
    ['06 06 02 00', '[Deprecated] ST 352 §C.6 INVALID — interlaced rate + progressive samp — expect WARN'],
    ['06 06 11 00', '[Deprecated] ST 352 §C.6 INVALID — aspect bit set with non-720-pixel sampling — expect WARN'],
    ['B4 C3 42 01', 'RDD 22 Film 2K dual-link 1.5G — 24p 4:2:2 YCbCr Ch1'],
    ['B4 C5 42 41', 'RDD 22 Film 2K dual-link 1.5G — 25p 4:2:2 YCbCr Ch2'],
    ['B5 C2 47 01', 'RDD 22 Film 2K 3G — 23.976p 4:4:4 Rfs/Gfs/Bfs FS-Gamut Ch1'],
    ['C0 CA E0 01', 'ST 2081-10 Mode 1 — 4K p59.94 SDR Rec.2020 4:2:2 single-link'],
    ['C1 CA 80 01', 'ST 2081-10 Mode 2/3 — 1080p59.94 SDR Rec.709 4:2:2 single-link'],
    ['C2 CA E0 21', 'ST 2081-11 Mode 1 — 4K dual-link 6G p59.94 Link 2 4:2:2'],
    ['C2 EA E0 23', 'ST 2081-11 Mode 1 — 4K dual-link 6G p59.94 PQ Link 2 12-bit FR'],
    ['C4 CA E0 41', 'ST 2081-12 Mode 1 — 8K quad-link 6G p59.94 Link 3 4:2:2'],
    ['C5 CA E0 21', 'ST 2081-12 Mode 2 — 4K quad-link 6G p59.94 4:2:2 Link 2'],
    ['C5 CA E2 22', 'ST 2081-12 Mode 2 — 4K quad-link 6G p59.94 4:4:4 RGB Link 2 12-bit'],
    ['F3 CD E0 21', 'ST 2081-11 Mode 2 — 1080-line HFR 100Hz dual-link 6G Link 2'],
    ['C3 CA 80 01', 'ST 2081-30 §4 — 2× 3G-A 1080p59.94 SDR Rec.709 muxed on 6G'],
    ['CB CA 80 01', 'ST 2081-30 §4 — 2× 3G-A 720p59.94 SDR Rec.709 muxed on 6G'],
    ['CC 06 20 01', 'ST 2081-30 §5 — 4× HD-SDI 1080i29.97 muxed on 6G'],
    ['CD 0A 00 01', 'ST 2081-30 §5 — 4× HD-SDI 720p59.94 muxed on 6G'],
    ['F4 CA 20 0B', 'BT.2077-3 Octa-link 1.5G class — 4K p59.94 SDR Rec.709 Ch1 12-bit FR'],
    ['F5 CA 20 09', 'BT.2077-3 16-link 1.5G on 26.73G — 8K p59.94 SDR FP=7680x4320 narrow 10-bit'],
    ['F7 CA 20 09', 'BT.2077-3 32-link 1.5G on dual 26.73G — Link 1, 8K, FP=7680x4320 narrow 10-bit'],
    ['F9 CA 20 09', 'BT.2077-3 Quad-link 1.5G class — Ch1 4K narrow 10-bit'],
    ['A1 4A 02 01', 'ST 2036-3 PsF 4K (b7=0,b6=1) -- expect Progressive (PsF) scan, NO warning'],
    ['A1 0A 02 01', 'ST 2036-3 INVALID 4K (b7=0,b6=0 interlaced picture) -- expect WARN'],
    ['A1 8A 02 01', 'ST 2036-3 INVALID 4K (b7=1,b6=0 interlaced picture) -- expect WARN'],
    ['A2 4A 02 01', 'ST 2036-3 PsF 8K (b7=0,b6=1) -- expect Progressive (PsF) scan'],
    ['A5 CA 02 01', 'ST 2036-4 UHDTV1 multi-link 4K p59.94 SDR Rec.709 Ch1 link1 10NR (canonical)'],
    ['A5 4A 02 01', 'ST 2036-4 PsF (b7=0,b6=1) -- expect Progressive (PsF) scan'],
    ['A5 C0 02 01', 'ST 2036-4 INVALID rate 0h Undefined -- expect WARN'],
    ['A5 C1 02 01', 'ST 2036-4 INVALID rate 1h Reserved -- expect WARN'],
    ['A5 C4 02 01', 'ST 2036-4 INVALID rate 4h not assigned -- expect WARN'],
    ['A5 CA 03 01', 'ST 2036-4 INVALID byte3 b0=1 Reserved -- expect WARN'],
    ['A5 CA 02 03', 'ST 2036-4 INVALID depth 3h Reserved (12-bit FR not defined) -- expect WARN'],
    ['A5 CA 02 05', 'ST 2036-4 INVALID byte4 b2=1 Reserved -- expect WARN'],
    ['A5 CA 02 C1', 'ST 2036-4 INVALID link 18h exceeds Ch24 -- expect WARN'],
    ['90 4A 20 01', 'ST 435-1 PsF 1920p59.94 (b7=0,b6=1) -- expect Progressive (PsF) scan'],
    ['90 C4 60 02', 'ST 435-1 quad 2048×1080 p47.95 12-bit (rate 4h newly allowed)'],
    ['90 C8 60 02', 'ST 435-1 quad 2048×1080 p48 12-bit (rate 8h newly allowed)'],
    ['90 C4 20 02', 'ST 435-1 quad 1920×1080 INVALID rate 4h -- expect WARN'],
    ['90 CA 27 01', 'ST 435-1 quad 1920p59.94 sampling 7h FS1 (Color VANC)'],
    ['90 CA 2B 01', 'ST 435-1 quad sampling Bh Reserved -- expect WARN'],
    ['A0 46 20 01', 'ST 435-1 PsF 3840p29.97 (b7=0,b6=1) -- expect Progressive (PsF) scan'],
    ['A0 C9 20 01', 'ST 435-1 octa 50Hz INVALID -- expect WARN'],
    ['A0 C6 27 01', 'ST 435-1 octa sampling 7h FS1 (Color VANC)'],
    ['88 CA 80 02', 'ST 425-1 3G-A 720p59.94 SDR Rec.709 4:2:2 12-bit (canonical)'],
    ['88 CA 80 12', 'ST 425-1 3G-A 720p59.94 12-bit ICtCp signal (byte 4 b4=1)'],
    ['88 CA 50 01', 'ST 425-1 3G-A 720 byte 3 b6=1 reserved -- expect WARN'],
    ['88 CA 10 01', 'ST 425-1 3G-A 720 colorim 1h Reserved -- expect WARN'],
    ['88 CA 00 04', 'ST 425-1 3G-A 720 byte 4 b3:b2 nonzero -- expect WARN'],
    ['89 CA 80 01', 'ST 425-1 3G-A 1080p59.94 SDR Rec.709 (canonical)'],
    ['89 CA 80 11', 'ST 425-1 3G-A 1080p59.94 10-bit ICtCp signal (byte 4 b4=1)'],
    ['89 CA E0 02', 'ST 425-1 3G-A 1080p59.94 SDR UHDTV 2048x1080 12-bit'],
    ['89 80 80 01', 'ST 425-1 1080 trans=1 pic=0 undefined ST 425-1 combo -- expect WARN'],
    ['89 CA 0B 01', 'ST 425-1 1080 sampling Bh Reserved -- expect WARN'],
    ['89 C0 80 01', 'ST 425-1 1080 rate 0h Undefined -- expect WARN'],
    ['89 C1 80 01', 'ST 425-1 1080 rate 1h Reserved -- expect WARN'],
    ['8E CA 80 01', 'ST 425-2 stereo 720p59.94 (canonical hSamp=2)'],
    ['8E CA 00 01', 'ST 425-2 stereo 720 hSamp=0 -- expect WARN (must be 2 for 0x8E)'],
    ['8F CA 00 01', 'ST 425-2 stereo 1080p59.94 (canonical hSamp=0)'],
    ['8F CA 80 01', 'ST 425-2 stereo 1080 hSamp=2 -- expect WARN (must be 0/1 for 0x8F)'],
    ['B1 CA 80 01', 'ST 292-2 dual-link 1.5G stereo 720p59.94'],
    ['91 CA 90 01', 'ST 425-4 dual 3G-A stereo 720 colorim 1h Reserved -- expect WARN'],
    ['92 CA 90 01', 'ST 425-4 dual 3G-A stereo 1080 colorim 1h Reserved -- expect WARN'],
    ['93 CA 80 01', 'ST 425-4 dual 3G-B-DL stereo 1080p59.94 canonical'],
    ['99 CA 90 01', 'ST 425-6 quad 3G-A stereo 1080 colorim 1h Reserved -- expect WARN'],
    ['9A CA 80 01', 'ST 425-6 quad 3G-B-DL stereo 1080p59.94 canonical'],
    ['9B CA 80 02', 'ST 425-6 quad 3G-B-DS stereo 2160 with 12-bit -- expect WARN (only 10-bit allowed)']
  ];
  console.log('\n--- Smoke decode samples ---');
  for (const [hex, label] of cases) {
    const bytes = parseHex(hex);
    const r = decodeVpidBytes(...bytes);
    if (r.valid) {
      const c = r.characteristics;
      console.log(`${hex}  ${label}`);
      console.log(`           ${c.standard}`);
      console.log(`           ${c.resolution} ${c.frameRateLabel}Hz ${c.scan} ${c.aspect} ${c.sampling} ${c.bitDepth} ${c.colorimetry}`);
      console.log(`           Link/Channel: ${c.channel || '-'}`);
      if (r.warnings && r.warnings.length) {
        for (const w of r.warnings) console.log(`           WARN: ${w}`);
      }
    } else if (r.registered) {
      console.log(`${hex}  ${label} (registry-only)`);
      console.log(`           ${r.registry.standard} - ${r.registry.description}`);
    } else {
      console.log(`${hex}  UNKNOWN: ${r.error}`);
    }
  }

  // ---- Batch decoder smoke test ----
  // Verifies: line splitting, comment stripping, blank-line skipping,
  // valid + registry + invalid all coexist in one batch. As of this build
  // every code in the SMPTE Byte 1 registry is fully bit-decoded, so the
  // "registry-only" branch is exercised via an UNREGISTERED byte 1 (0x10),
  // which falls through to the unknown-code path.
  if (typeof batchDecodeAll === 'function') {
    const batchInput = [
      '89 CA 80 01    # 1080p59.94 SDR Rec.709',
      '85 06 20 01    # 1080i29.97',
      '',
      '# This is a comment-only line',
      'A1 CA 00 01    # ST 2036-3 UHDTV1 4K p59.94',
      'B0 0B 80 01    # ST 2047-2 VC-2 1080p60',
      '90 CA 20 01    # ST 435-1 quad-link 1080p59.94',
      'A0 C7 20 E1    # ST 435-1 octa-link 2160p30',
      '86 06 00 01    # ST 349 SD into HD-SDI (now bit-decoded)',
      'B4 C3 42 01    # ST RDD 22 Film 2K dual-link 1.5G (now bit-decoded)',
      'C2 CA E0 21    # ST 2081-11 dual-link 6G 4K p59.94 Link 2 (now bit-decoded)',
      'C5 CA E2 22    # ST 2081-12 quad-link 6G 4K Mode 2 12-bit (now bit-decoded)',
      'F4 CA 20 0B    # BT.2077-3 octa-link 1.5G (now bit-decoded)',
      'FF FF FF FF    # invalid (not registered)',
      'FE 00 00 00    # invalid (not registered)'
    ].join('\n');
    const results = batchDecodeAll(batchInput);
    const valid    = results.filter(r => r.decoded && r.decoded.valid).length;
    const registry = results.filter(r => r.decoded && !r.decoded.valid && r.decoded.registered).length;
    const invalid  = results.filter(r => !r.bytes || (r.decoded && !r.decoded.valid && !r.decoded.registered)).length;
    console.log(`\n--- Batch decode smoke test ---`);
    console.log(`  total=${results.length}, valid=${valid}, registry=${registry}, invalid=${invalid}`);
    if (results.length !== 13) { console.error('FAIL: expected 13 entries (after stripping blanks/comments), got ' + results.length); process.exit(2); }
    if (valid    !== 11) { console.error('FAIL: expected 11 valid entries, got ' + valid); process.exit(2); }
    if (registry !== 0) { console.error('FAIL: expected 0 registry-only entries (everything is bit-decoded now), got ' + registry); process.exit(2); }
    if (invalid  !== 2) { console.error('FAIL: expected 2 invalid (unregistered) entries, got ' + invalid); process.exit(2); }
    console.log('  OK');

    // CSV / JSON export shape
    const csv = batchExportRows(results, 'csv');
    if (!csv.startsWith('VPID,Friendly,')) { console.error('FAIL: batch CSV header mismatch'); process.exit(2); }
    const lines = csv.trim().split(/\n/);
    if (lines.length !== 14) { console.error('FAIL: expected 14 CSV rows (1 header + 13 data), got ' + lines.length); process.exit(2); }
    const json = JSON.parse(batchExportRows(results, 'json'));
    if (!Array.isArray(json) || json.length !== 13) { console.error('FAIL: batch JSON should be 13-element array'); process.exit(2); }
    console.log(`  CSV/JSON export shape OK (${lines.length} CSV rows, ${json.length} JSON entries)`);
  } else {
    console.error('FAIL: batchDecodeAll is not exported to global scope');
    process.exit(2);
  }

  // ---- Receiver telemetry importer smoke tests ----
  if (typeof extractVpidsFromText === 'function') {
    console.log(`\n--- Telemetry importer smoke test ---`);

    // 1. Tektronix Prism / generic JSON receiver telemetry
    const teleA = JSON.stringify({
      receiver: 'BROADCAST-MCR-RX-12',
      anc: [
        { did: '0x41', sdid: '0x01', vpid: '0x89CA8001', label: 'PGM-1' },
        { did: '0x41', sdid: '0x01', vpid: '0x89CA8001', label: 'PGM-1-bkp' },
        { did: '0x41', sdid: '0x01', vpid: '0xC1CA8001', label: 'PGM-2' }
      ]
    });
    const ea = extractVpidsFromText(teleA);
    if (ea.length !== 2) { console.error('FAIL: expected 2 unique VPIDs from JSON dump, got ' + ea.length); process.exit(2); }
    const ea0 = ea.find(e => e.hex.startsWith('89'));
    if (!ea0 || ea0.count !== 2) { console.error('FAIL: 89CA8001 should appear 2x, got ' + (ea0 && ea0.count)); process.exit(2); }
    if (!ea0.keys.some(k => /vpid|payload/i.test(k))) { console.error('FAIL: JSON key hint missing for 89CA8001'); process.exit(2); }

    // 2. EBU LIST style key (snake case + nested array)
    const teleB = JSON.stringify({
      streams: [
        { name: 'cam1', payload_id: '85 06 20 01' },
        { name: 'cam2', payload_identifier: [0xA1, 0xCA, 0x00, 0x01] },
        { name: 'cam3', videoPayloadIdentifier: 0xC0CAE001 }
      ]
    });
    const eb = extractVpidsFromText(teleB);
    if (eb.length !== 3) { console.error('FAIL: EBU-style importer expected 3 unique, got ' + eb.length); process.exit(2); }
    if (!eb.find(e => e.hex.replace(/\s/g,'') === 'C0CAE001')) { console.error('FAIL: int key value 0xC0CAE001 not extracted'); process.exit(2); }
    if (!eb.find(e => e.hex.replace(/\s/g,'') === 'A1CA0001')) { console.error('FAIL: byte-array key value [A1,CA,00,01] not extracted'); process.exit(2); }

    // 3. Free-form log dump with mixed VPIDs and noise
    const teleC = `2026-05-09T18:30:00Z RX-12 PRGM-A vpid=0x89CA8001 src=10.10.5.1
2026-05-09T18:30:00Z RX-12 PRGM-B vpid=89:CA:80:01 src=10.10.5.2
2026-05-09T18:30:01Z RX-13 GUID a1b2-c3d4-e5f6-0789 (should not match VPID)
2026-05-09T18:30:01Z MAC=89:CA:80:01:DE:AD:BE:EF (extra bytes -- still trips the regex; tool reports the first 4 as 89CA8001)
2026-05-09T18:30:01Z RX-14 SECONDARY 85 06 20 01`;
    const ec = extractVpidsFromText(teleC);
    if (ec.length < 2) { console.error('FAIL: free-form log should yield at least 2 unique VPIDs, got ' + ec.length); process.exit(2); }
    if (!ec.find(e => e.hex.replace(/\s/g,'') === '89CA8001')) { console.error('FAIL: 89CA8001 not extracted from log'); process.exit(2); }
    if (!ec.find(e => e.hex.replace(/\s/g,'') === '85062001')) { console.error('FAIL: 85062001 not extracted from log'); process.exit(2); }
    // Negative: GUIDs should not produce false-positive byte 1 in {valid registry}
    const guidMatches = ec.filter(e => /^a1b2/i.test(e.hex.replace(/\s/g,'')));
    if (guidMatches.length) { console.error('FAIL: GUID falsely extracted as VPID'); process.exit(2); }

    // 4. Sort order: byte 1 ascending
    if (ec[0].bytes[0] > ec[ec.length - 1].bytes[0]) {
      console.error('FAIL: importer output not sorted by byte 1 ascending');
      process.exit(2);
    }

    // 5. 10-bit ANC user-data words (parity stripped)
    const teleD = '0x289 0x2CA 0x180 0x101'; // bytes 89 CA 80 01 with parity bits set
    const ed = extractVpidsFromText(teleD);
    if (!ed.find(e => e.hex.replace(/\s/g,'') === '89CA8001')) {
      console.error('FAIL: 10-bit ANC parity stripping failed; got ' + JSON.stringify(ed.map(e => e.hex)));
      process.exit(2);
    }

    // 6. Idle/zero placeholders should not show up
    const teleE = 'something 00 00 00 00 something FF FF FF FF something 89 CA 80 01';
    const ee = extractVpidsFromText(teleE);
    if (ee.length !== 1) { console.error('FAIL: zero/idle placeholders should be dropped, got ' + ee.length + ' (' + ee.map(e=>e.hex).join(', ') + ')'); process.exit(2); }

    console.log('  OK');
  } else {
    console.error('FAIL: extractVpidsFromText is not exported to global scope');
    process.exit(2);
  }
})();
'''

    with open(out_path, 'w') as f:
        f.write(js)
    print(f'Wrote {out_path} ({len(js)} bytes)')


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    extract(src, out)
