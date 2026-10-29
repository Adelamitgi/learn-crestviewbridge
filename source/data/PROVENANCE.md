# Provenance — 2025 HSK examination syllabus lists

These two tables are a **factual extraction**, not an authored work:

| File | Contents |
| --- | --- |
| `syllabus2025_words.tsv` | 10,896 distinct words → level, with pinyin and part of speech |
| `syllabus2025_chars.tsv` | 3,088 recognition characters (认读字) → level |

## Source

新版HSK考试大纲 (HSK Examination Syllabus), published November 2025 by the
Center for Language Education and Cooperation (中外语言交流合作中心). The HSK 3.0
exam based on it launches worldwide on 13 December 2026, after trial sittings in
January and September 2026. A 406-page PDF with a text layer; vocabulary occupies
pp. 79–354 and recognition characters pp. 356–376.

Regenerate from the official PDF:

```bash
python3 scripts/extract_syllabus_2025.py path/to/syllabus.pdf
```

## Validation

The extraction self-validates and should be re-run rather than trusted:

- Per-level **entry** counts reproduce the syllabus's own published cumulative
  totals exactly: 300 / 500 / 1,000 / 2,000 / 3,600 / 5,400 / 11,000.
- The 11,000 entries collapse to 10,896 distinct words; homographs graded at two
  levels occupy separate rows (所 / 所2). 74 words are graded at more than one
  level; we keep the lower.
- Each character level's parsed count equals that level's maximum item index
  (246 / 125 / 284 / 441 / 431 / 413 / 1,148), with no cross-level duplicates.

Note that this gives **3,088** recognition characters. Secondary sources widely
report 3,079; we believe that figure to be incorrect and have not found a
primary source for it.

## Rights

The underlying content is a published national examination standard issued by a
Chinese government body. What is reproduced here is the factual
word-to-level and character-to-level mapping — data, not expression — extracted
for research and educational use. The equivalent lists for the 2021 standard
(GF0025-2021) are already redistributed publicly under the MIT licence by
third parties.

**No claim of ownership is made over the underlying standard**, and no
editorial content, task descriptions, topic outlines or grammar material from
the syllabus is reproduced. The compilation right in the original tables has
not been formally assessed.

If you represent the issuing body and object to this redistribution, open an
issue on the repository and the tables will be removed; the extraction script
alone is sufficient for anyone to regenerate them from the official PDF.
