/* 365 天诗词地图：六个阶段 */
const STAGES = [
  { id:1, name:"第一阶段", title:"启蒙五十首", range:[1,50], color:"#0d9488",
    desc:"五言七言绝句为主，短小上口，先养成每天一首诗的习惯。" },
  { id:2, name:"第二阶段", title:"唐宋基础", range:[51,100], color:"#2563eb",
    desc:"律诗与宋诗入门，山水田园、边塞送别，各大题材都尝一遍。" },
  { id:3, name:"第三阶段", title:"盛唐气象", range:[101,150], color:"#7c3aed",
    desc:"李白、杜甫、王维深度专场，读出唐诗的最高峰。" },
  { id:4, name:"第四阶段", title:"中晚唐韵", range:[151,199], color:"#d97706",
    desc:"白居易的平易、杜牧的俊爽、李商隐的深情，唐诗的下半场。" },
  { id:5, name:"第五阶段", title:"诗词长河", range:[200,298], color:"#e11d48",
    desc:"上溯诗经楚辞、魏晋风骨，挑战长诗，再入五代北宋词章。" },
  { id:6, name:"第六阶段", title:"词曲与现代", range:[299,365], color:"#16a34a",
    desc:"南宋词、元曲、明清诗词，最后在毛主席诗词中收官。" },
];

/* 每天一首：day -> 诗在 POEMS 中的序号（1 起） */
const DAY_MAP = [];
for(let d=1; d<=365; d++){
  let stage = STAGES.findIndex(s=>d>=s.range[0] && d<=s.range[1]) + 1;
  DAY_MAP.push({ day:d, poem:d-1, stage:stage, kind: d%7===0 ? "weekly" : "normal" });
}
