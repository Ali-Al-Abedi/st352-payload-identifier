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
    ['86 15 02 11', 'ST 349 SD-into-HD 625i 4:2:0p 16:9 with channel pair'],
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
    ['01 06 00 00', '[Deprecated] ST 352 Annex C.1 BT.601 525i NTSC'],
    ['03 06 06 00', '[Deprecated] ST 352 Annex C.3 ST 347 525i 4:4:4:4 Y/CB/CR/A'],
    ['04 CA 05 00', '[Deprecated] ST 352 Annex C.4 ST 274 1080 progressive 4:2:2p'],
    ['05 0A 05 00', '[Deprecated] ST 352 Annex C.5 ST 296 720p 50'],
    ['06 06 00 00', '[Deprecated] ST 352 Annex C.6 ST 349 SD into HD 525i'],
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
    ['F9 CA 20 09', 'BT.2077-3 Quad-link 1.5G class — Ch1 4K narrow 10-bit']
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
})();
'''

    with open(out_path, 'w') as f:
        f.write(js)
    print(f'Wrote {out_path} ({len(js)} bytes)')


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    extract(src, out)
