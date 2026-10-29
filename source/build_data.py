import csv, json, re, sys, os
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content_grammar import GRAMMAR
from content_reading import READINGS
from content_output import PICTURE, ESSAY, RETELL, STORY, QUESTIONS

SYL, COMPLETE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
han = lambda c: "一" <= c <= "鿿"

words = {}
for r in csv.DictReader(open(f"{SYL}/syllabus2025_words.tsv", encoding="utf-8"), delimiter="\t"):
    py, pos = r["pinyin"], r["pos"] or ""
    if re.search(r"[a-zāáǎàēéěèīíǐìōóǒòūúǔùǚü]", pos):
        py, pos = (py + " " + pos).strip(), ""
    words[r["word"]] = (int(r["level"]), py, pos)
rch = {r["character"]: int(r["level"]) for r in csv.DictReader(open(f"{SYL}/syllabus2025_chars.tsv", encoding="utf-8"), delimiter="\t")}
wch = {r["character"]: int(r["level"]) for r in csv.DictReader(open(f"{SYL}/syllabus2025_writing_chars.tsv", encoding="utf-8"), delimiter="\t")}

BAD = re.compile(r"^(surname|variant|old variant|erhua|abbr|used in|see |also written|classifier for)", re.I)
def pick(ms):
    for m in ms:
        g = re.sub(r"\s*\(.*?\)", "", m.split(";")[0]).replace(")", "").strip(" ,")
        if g and not BAD.match(g) and not g[0].isupper():
            return g[:40]
    return ""
gloss = {}
for e in json.load(open(COMPLETE, encoding="utf-8")):
    ms = [m for f in e.get("forms", []) for m in f.get("meanings", [])]
    g = pick(ms)
    if g and e["simplified"] not in gloss:
        gloss[e["simplified"]] = g

known_words = {w for w, v in words.items() if v[0] <= 3}
known_chars = {c for w in known_words for c in w if han(c)}
L4 = [w for w, v in words.items() if v[0] == 4]
fam = defaultdict(list)
for w in L4:
    for c in dict.fromkeys(ch for ch in w if han(ch)):
        fam[c].append(w)
families = [c for c in fam if len(fam[c]) >= 3]
families.sort(key=lambda c: (c not in known_chars, -len(fam[c])))

def anchor(c):
    cs = sorted([w for w in known_words if c in w and len(w) <= 3], key=lambda w: (words[w][0], len(w), w))
    return cs[0] if cs else ""

order, seen, wfam = [], set(), {}
for c in families:
    for w in sorted(fam[c], key=lambda w: (len(w), w)):
        if w not in seen:
            seen.add(w); order.append(w); wfam[w] = c
rest = sorted([w for w in L4 if w not in seen], key=lambda w: (all(ch in known_chars for ch in w if han(ch)) is False, w))
order += rest

W = []
for w in order:
    lv, py, pos = words[w]
    W.append([w, py, gloss.get(w, ""), pos, wfam.get(w, ""), 1 if all(ch in known_chars for ch in w if han(ch)) else 0])

FAM = [[c, "k" if c in known_chars else "n", anchor(c) if c in known_chars else "", fam[c], 1 if c in wch and wch[c] <= 4 else 0] for c in families]

# segmentation for readings / examples: longest match over syllabus words
maxlen = 6
def seg(text):
    out, i = [], 0
    while i < len(text):
        if not han(text[i]):
            j = i
            while j < len(text) and not han(text[j]): j += 1
            out.append([text[i:j]]); i = j; continue
        for L in range(min(maxlen, len(text) - i), 0, -1):
            piece = text[i:i+L]
            if piece in words or L == 1:
                if piece in words:
                    lv, py, _ = words[piece]
                    out.append([piece, py, gloss.get(piece, ""), lv])
                else:
                    out.append([piece, "", gloss.get(piece, ""), 0])
                i += L; break
    return out

issues = []
def check(text, where):
    bad = sorted({c for c in text if han(c) and rch.get(c, 99) > 4})
    if bad: issues.append((where, "".join(bad)))

R = []
for r in READINGS:
    check(r["text"], r["id"])
    R.append({**r, "tokens": seg(r["text"])})
for g in GRAMMAR:
    for zh, en in g["examples"]: check(zh, g["id"] + ":ex")
    for b in g["build"]: check("".join(b), g["id"] + ":build")
    for s, opts, a, why in g["choose"]: check(s + "".join(opts), g["id"] + ":choose")
for p in PICTURE:
    check(p[3], "pic:" + p[1])
    if p[1] not in words or words[p[1]][0] > 4: issues.append(("picword", p[1]))
for t in RETELL: check(t, "retell")
for q in QUESTIONS: check(q, "question")
for e in ESSAY: check(e[0], "essay")

from content_pairs import PAIRS
for ws, rule, items in PAIRS:
    for s_, a_, why in items: check(s_, "pair:" + "/".join(ws))
    for w_ in ws:
        if w_ not in words or words[w_][0] > 4: issues.append(("pairword", w_))

# HSK 1-3 foundation words (the new syllabus is cumulative: 2,000 words by Level 4)
BASE = [[w, v[1], gloss.get(w, ""), v[2], v[0]] for w, v in sorted(words.items(), key=lambda kv: (kv[1][0], kv[0])) if v[0] <= 3]

# handwriting characters by Level 4, each with a prompt word that contains it
HW = []
lvl_words = sorted([w for w, v in words.items() if v[0] <= 4 and len(w) <= 3], key=lambda w: (len(w) == 1, words[w][0] != 4, len(w), w))
for ch, lv in sorted(wch.items(), key=lambda kv: (-kv[1], kv[0])):
    if lv > 4: continue
    ex = next((w for w in lvl_words if ch in w), None)
    if ex: HW.append([ch, lv, ex, words[ex][1], gloss.get(ex, "")])

# sentence corpus for "seen in" examples on cards and the reading gap-fill
CORPUS = []
for g in GRAMMAR: CORPUS += [zh for zh, en in g["examples"]]
def sents(t): return [x.strip() for x in re.findall(r"[^。！？]+[。！？]", t) if 6 <= sum(1 for c in x if han(c)) <= 40]
for r in READINGS: CORPUS += sents(r["text"])
CORPUS += [t for x in RETELL for t in sents(x)] + [p[3] for p in PICTURE]
CORPUS += [s_.replace("___", ws[a_]) for ws, rule, items in PAIRS for s_, a_, why in items]
CORPUS = list(dict.fromkeys(CORPUS))

data = {"words": W, "families": FAM, "grammar": GRAMMAR, "readings": R, "base": BASE, "hw": HW, "pairs": PAIRS, "corpus": CORPUS,
        "picture": PICTURE, "essay": ESSAY, "retell": RETELL, "story": STORY, "questions": QUESTIONS,
        "meta": {"source": "2025 HSK Examination Syllabus (CLEC), via harukicoder/hsk30; glosses CC-CEDICT via complete-hsk-vocabulary"}}
s = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
open(f"{OUT}/app_data.json", "w", encoding="utf-8").write(s)
print("bytes", len(s.encode()), "words", len(W), "families", len(FAM), "no-gloss", sum(1 for w in W if not w[2]))
print("known-first count", sum(1 for c in families if c in known_chars))
for i in issues: print("ISSUE", i)
