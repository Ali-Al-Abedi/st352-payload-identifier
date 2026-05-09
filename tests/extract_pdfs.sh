#!/usr/bin/env bash
# Regenerate audit/pdf-text/*.txt from your local docs/smpte/*.pdf.
# These extracts are gitignored — they're for engineers running the
# audit locally to cross-check vpid.html against the spec text.
#
# Requires:
#   - poppler-utils (`pdftotext -layout`).
#   - SMPTE / ITU-R PDFs in docs/smpte/ (each engineer must obtain
#     these individually from SMPTE / ITU; see docs/smpte/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/docs/smpte"
DST_DIR="$REPO_ROOT/audit/pdf-text"

# Engineers may keep PDFs at ~/Desktop/smpte docs/ rather than
# committing them to docs/smpte/. Allow either path.
ALT_SRC="$HOME/Desktop/smpte docs"
if [ ! -d "$SRC_DIR" ] || [ -z "$(ls "$SRC_DIR"/*.pdf 2>/dev/null || true)" ]; then
  if [ -d "$ALT_SRC" ]; then
    SRC_DIR="$ALT_SRC"
  fi
fi

mkdir -p "$DST_DIR"

# Files referenced by audit/findings/*.md. Add new ones here as the
# audit grows.
FILES=(
  st0259-2008.pdf
  st0292-2-2011.pdf
  st292-1-2018.pdf
  st0347-2001_stable2006.pdf
  st0349-2001_stable2006.pdf
  st0352-2013.pdf
  st0372-2017.pdf
  st0425-2-2012.pdf
  st0425-4-2012.pdf
  st0425-6-2014.pdf
  st425-1-2017.pdf
  st425-3-2019.pdf
  st425-5-2019.pdf
  st0435-1-2012.pdf
  st0435-2-2012.pdf
  st0435-3-2012.pdf
  st02047-2-2010.pdf
  st2047-4-2011.pdf
  st2036-3-2018.pdf
  st2036-4-2019.pdf
  st2048-3-2024.pdf
  st2081-10-2018.pdf
  st2081-11-2019.pdf
  st2081-12-2019.pdf
  st2081-30-2017.pdf
  st2082-10-2018.pdf
  st2082-11-2019.pdf
  st2082-12-2019.pdf
  st2082-30-2017.pdf
  rdd22-2012.pdf
  "R-REC-BT.2077-2-201706-S!!PDF-E.pdf"
  "R-REC-BT.2077-3-202106-I!!PDF-E.pdf"
)

for f in "${FILES[@]}"; do
  src="$SRC_DIR/$f"
  out="$DST_DIR/${f%.pdf}.txt"
  if [ -f "$src" ]; then
    if [ ! -f "$out" ] || [ "$src" -nt "$out" ]; then
      pdftotext -layout "$src" "$out"
      echo "extracted: $f"
    fi
  else
    echo "SKIP (missing): $f"
  fi
done
