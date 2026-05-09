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
    ['B4 00 00 00', 'ST RDD 22 (registry-only fallback for 0xB4 — proves fallback still works)']
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
  // valid + registry + invalid all coexist in one batch.
  if (typeof batchDecodeAll === 'function') {
    const batchInput = [
      '89 CA 80 01    # 1080p59.94 SDR Rec.709',
      '85 06 20 01    # 1080i29.97',
      '',
      '# This is a comment-only line',
      'A1 CA 00 01',
      'B0 0B 80 01',
      '90 CA 20 01',
      'A0 C7 20 E1',
      '86 06 00 01    # ST 349 SD into HD-SDI (now bit-decoded)',
      'B4 00 00 00    # ST RDD 22 (still registry-only)',
      'FF FF FF FF    # invalid'
    ].join('\n');
    const results = batchDecodeAll(batchInput);
    const valid    = results.filter(r => r.decoded && r.decoded.valid).length;
    const registry = results.filter(r => r.decoded && !r.decoded.valid && r.decoded.registered).length;
    const invalid  = results.filter(r => !r.bytes || (r.decoded && !r.decoded.valid && !r.decoded.registered)).length;
    console.log(`\n--- Batch decode smoke test ---`);
    console.log(`  total=${results.length}, valid=${valid}, registry=${registry}, invalid=${invalid}`);
    if (results.length !== 9) { console.error('FAIL: expected 9 entries (after stripping blanks/comments), got ' + results.length); process.exit(2); }
    if (valid    !== 7) { console.error('FAIL: expected 7 valid entries (3G-A, HD, A1, B0, ST435 quad, ST435 octa, ST 349), got ' + valid); process.exit(2); }
    if (registry !== 1) { console.error('FAIL: expected 1 registry-only entry (B4 RDD22), got ' + registry); process.exit(2); }
    if (invalid  !== 1) { console.error('FAIL: expected 1 invalid entry, got ' + invalid); process.exit(2); }
    console.log('  OK');

    // CSV / JSON export shape
    const csv = batchExportRows(results, 'csv');
    if (!csv.startsWith('VPID,Friendly,')) { console.error('FAIL: batch CSV header mismatch'); process.exit(2); }
    const lines = csv.trim().split(/\n/);
    if (lines.length !== 10) { console.error('FAIL: expected 10 CSV rows (1 header + 9 data), got ' + lines.length); process.exit(2); }
    const json = JSON.parse(batchExportRows(results, 'json'));
    if (!Array.isArray(json) || json.length !== 9) { console.error('FAIL: batch JSON should be 9-element array'); process.exit(2); }
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
