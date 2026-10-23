// 一次性生成 ipa.js：把词库所有英文词/短语转成美式 IPA 音标（数据源 CMUdict）
const fs = require("fs");

// ---- 读取词库 ----
var WORD_DATA = { categories: [], phonics: [] };
for (const f of ["words1.js", "words2.js", "words3.js", "words4.js", "words5.js", "words6.js", "phonics.js"]) {
  const src = fs.readFileSync(f, "utf8").replace(/window\.WORD_DATA/g, "WORD_DATA");
  eval(src);
}

// ---- 读取 CMUdict ----
const dict = new Map();
for (const line of fs.readFileSync("/tmp/cmudict.dict", "utf8").split("\n")) {
  if (!line || line.startsWith(";;;")) continue;
  const sp = line.indexOf(" ");
  if (sp < 0) continue;
  let w = line.slice(0, sp).toLowerCase().replace(/\(\d+\)$/, "");
  if (!dict.has(w)) dict.set(w, line.slice(sp + 1).trim().split(/\s+/));
}

// ---- ARPAbet -> IPA ----
const MAP = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", EH: "ɛ", ER: "ɝ", IH: "ɪ", IY: "i",
  UH: "ʊ", UW: "u", OW: "oʊ", AY: "aɪ", AW: "aʊ", EY: "eɪ", OY: "ɔɪ",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s",
  SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ"
};
const VOWELS = new Set(["AA","AE","AH","AO","EH","ER","IH","IY","UH","UW","OW","AY","AW","EY","OY"]);

function arpaToIpa(phones) {
  // 先找出每个重读音节的起点（重音符号标在音节开头，即元音前的辅音丛之前）
  const marks = {}; // 插入位置 -> 符号
  let prevVowel = -1;
  const parsed = phones.map(p => {
    const m = p.match(/^([A-Z]+)([012])?$/);
    return m ? { base: m[1], stress: m[2] } : null;
  });
  parsed.forEach((p, idx) => {
    if (!p || !VOWELS.has(p.base)) return;
    if (p.stress === "1" || p.stress === "2") {
      marks[prevVowel + 1] = p.stress === "1" ? "ˈ" : "ˌ";
    }
    prevVowel = idx;
  });
  let out = "";
  parsed.forEach((p, idx) => {
    if (marks[idx]) out += marks[idx];
    if (!p) return;
    let sym = MAP[p.base] || "";
    if (VOWELS.has(p.base)) {
      if (p.base === "AH" && p.stress === "0") sym = "ə";
      if (p.base === "ER" && p.stress === "0") sym = "ər";
    }
    out += sym;
  });
  return out;
}

// ---- 常见缩略形式（CMUdict 没有，手工补）----
const MANUAL = {
  "i'm": "aɪm", "you're": "jʊr", "he's": "hiz", "she's": "ʃiz", "it's": "ɪts",
  "we're": "wɪr", "they're": "ðer", "don't": "doʊnt", "can't": "kænt",
  "won't": "woʊnt", "isn't": "ˈɪzənt", "aren't": "ɑrnt", "i've": "aɪv",
  "we'll": "wil", "they'd": "ðeɪd", "that's": "ðæts", "there's": "ðerz",
  "what's": "wʌts", "let's": "lets", "didn't": "ˈdɪdənt", "doesn't": "ˈdʌzənt",
  "haven't": "ˈhævənt", "wasn't": "ˈwʌzənt", "couldn't": "ˈkʊdənt",
  "shouldn't": "ˈʃʊdənt", "wouldn't": "ˈwʊdənt", "i'll": "aɪl", "you'll": "jul",
  "he'll": "hil", "we'd": "wid", "you'd": "jud", "you've": "juv", "we've": "wiv",
  "they've": "ðeɪv", "who's": "huz", "here's": "hɪrz"
};

function lookupWord(w) {
  w = w.toLowerCase().replace(/[.,!?;:"“”]/g, "");
  if (!w) return "";
  if (MANUAL[w]) return MANUAL[w];
  if (dict.has(w)) return arpaToIpa(dict.get(w));
  // 去掉撇号再试（如 gonna）
  const w2 = w.replace(/'/g, "");
  if (w2 !== w && dict.has(w2)) return arpaToIpa(dict.get(w2));
  return "";
}

function lookupPhrase(phrase) {
  const parts = phrase.trim().split(/[\s\-]+/).filter(Boolean);
  const ipas = parts.map(lookupWord);
  if (ipas.some(x => !x)) return "";
  return ipas.join(" ");
}

// ---- 收集所有英文词/短语 ----
const uniq = new Set();
WORD_DATA.categories.forEach(c => c.words.forEach(w => uniq.add(w[0])));
WORD_DATA.phonics.forEach(p => {
  if (p.words) p.words.forEach(w => uniq.add(w[0]));
  if (p.pairs) p.pairs.forEach(pr => { uniq.add(pr[0]); uniq.add(pr[2]); });
});

const out = {};
let hit = 0, miss = [];
for (const w of uniq) {
  const ipa = lookupPhrase(w);
  if (ipa) { out[w] = ipa; hit++; } else miss.push(w);
}

fs.writeFileSync("ipa.js",
  "// 美式 IPA 音标表（由 CMUdict 自动生成，build-ipa.js）\n" +
  "var WORD_IPA = " + JSON.stringify(out, null, 0) + ";\n");
console.log("total:", uniq.size, "hit:", hit, "miss:", miss.length);
console.log("miss sample:", miss.slice(0, 30).join(", "));
