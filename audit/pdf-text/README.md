# PDF text extracts (gitignored)

The audit extracts plain-text versions of every SMPTE / ITU-R PDF in
`docs/smpte/` so that bit-level field tables can be searched, quoted,
and cross-checked without manually flipping through the PDF.

The extracts live here, **gitignored**, because they contain
copyrighted SMPTE / ITU-R material. They are regenerated locally from
your own copies of the PDFs by:

```bash
./tests/extract_pdfs.sh
```

(See that script for the exact list of files and the `pdftotext
-layout` invocation used.)

The committed audit findings under `audit/findings/` only quote the
minimum verbatim text necessary for the bit-level cross-check (a
single Table N row, a single sentence describing a Reserved field,
etc.) under fair-use review.
