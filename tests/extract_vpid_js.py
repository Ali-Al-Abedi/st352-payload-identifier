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
    ['86 06 00 01', 'ST 349 (registry-only fallback)']
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
    } else if (r.registered) {
      console.log(`${hex}  ${label} (registry-only)`);
      console.log(`           ${r.registry.standard} - ${r.registry.description}`);
    } else {
      console.log(`${hex}  UNKNOWN: ${r.error}`);
    }
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
