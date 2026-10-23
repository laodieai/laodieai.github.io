/* 课程生成引擎：Day 31–365 的完整 60 分钟课程由内容库组装生成。
   输出结构与手写课程 LESSONS 完全一致。 */

/* 发音复习池：第 2~6 阶段每天滚动一个发音重点 */
const PHONICS_POOL = [
  { intro:"复习长短元音对比：长音咧嘴用力，短音放松短促。",
    groups:[{ name:"长音 vs 短音", items:[["sheep","/ʃiːp/ 绵羊"],["ship","/ʃɪp/ 船"],["leave","/liːv/ 离开"],["live","/lɪv/ 居住"],["eat","/iːt/ 吃"],["it","/ɪt/ 它"]] }],
    tips:["长音像微笑，短音完全放松。"] },
  { intro:"复习咬舌音 /θ/ 和 /ð/：舌尖轻咬在上下牙之间。",
    groups:[{ name:"咬舌音", items:[["think","/θɪŋk/ 想"],["this","/ðɪs/ 这个"],["three","/θriː/ 三"],["that","/ðæt/ 那个"],["thank","/θæŋk/ 谢谢"],["they","/ðeɪ/ 他们"]] }],
    tips:["/θ/ 不振动（think），/ð/ 振动（this）。"] },
  { intro:"复习美式卷舌音 /r/ 与词尾 -er。",
    groups:[{ name:"美式 R", items:[["water","/ˈwɔːtər/ 水"],["better","/ˈbɛtər/ 更好"],["red","/rɛd/ 红色"],["right","/raɪt/ 对的"],["car","/kɑːr/ 汽车"],["mother","/ˈmʌðər/ 妈妈"]] }],
    tips:["舌尖卷起悬空，不碰上颚；词尾 -er 一定要卷。"] },
  { intro:"复习咬唇音 /f/ 和 /v/：上牙咬下唇。",
    groups:[{ name:"咬唇音", items:[["five","/faɪv/ 五"],["very","/ˈvɛri/ 非常"],["food","/fuːd/ 食物"],["love","/lʌv/ 爱"],["fine","/faɪn/ 好"],["have","/hæv/ 有"]] }],
    tips:["/f/ 只送气，/v/ 送气加声带振动。"] },
  { intro:"连读入门：前词尾辅音 + 后词首元音要连起来。",
    groups:[{ name:"连读", items:[["an apple","ə-NAA-pul"],["get up","ge-DUP"],["pick it up","pi-ki-DUP"],["come on","cuh-MON"],["turn it off","ter-ni-TOFF"]] }],
    tips:["像读一个词一样读过去，不要断开。"] },
  { intro:"弱读：小词在句子里读得又轻又快，元音变成 /ə/。",
    groups:[{ name:"弱读", items:[["a cup of tea","uh CUP uh TEE"],["going to the store","tuh"],["bread and butter","bread-n-butter"],["as soon as possible","əz"] ] }],
    tips:["to、and、of、a、as 在句中几乎都弱读。"] },
  { intro:"美式 Flap T：两个元音之间的 t 读成轻轻的 d。",
    groups:[{ name:"Flap T", items:[["water","WAH-der"],["better","BEH-der"],["city","SIH-dee"],["pretty","PRIH-dee"],["little","LIH-dul"],["butter","BUH-der"]] }],
    tips:["这是美式英语最大的标志之一。"] },
  { intro:"句子重音：内容词重读，功能词轻读。",
    groups:[{ name:"句子重音", items:[["I WANT it.","强调「想要」"],["I want IT.","强调「它」"],["WHERE are you going?","重音在 WHERE 和 GOING"]] }],
    tips:["重读的词更高、更长、更响。"] },
  { intro:"美式语调：陈述句下降，Yes/No 问句上扬。",
    groups:[{ name:"语调", items:[["I like it.","↘ 陈述下降"],["Do you like it?","↗ 疑问上扬"],["What do you like?","↘ 特殊疑问下降"]] }],
    tips:["特殊疑问句（What/Where 开头）句尾也下降。"] },
  { intro:"缩读复习：美国人说英语大量使用缩读。",
    groups:[{ name:"缩读", items:[["I'm","/aɪm/"],["you're","/jʊr/"],["he's","/hiːz/"],["don't","/doʊnt/"],["can't","/kænt/"],["I'll","/aɪl/"],["I've","/aɪv/"],["it's","/ɪts/"]] }],
    tips:["听力里听到缩读要反应得过来。"] },
];

/* 分阶段发音库：每个阶段练的内容不同，由浅到深 */
const PHONICS_BY_STAGE = {
2:[
  PHONICS_POOL[0], PHONICS_POOL[1], PHONICS_POOL[2], PHONICS_POOL[3],
  { intro:"梅花音 /æ/ 与 /e/ 对比：/æ/ 嘴巴张最大，/e/ 张一半。",
    groups:[{ name:"/æ/ vs /e/", items:[["bad","/bæd/ 坏的"],["bed","/bɛd/ 床"],["man","/mæn/ 男人"],["men","/mɛn/ 男人们"],["pat","/pæt/ 拍"],["pet","/pɛt/ 宠物"]] }],
    tips:["中国人最容易混的一对音，每天读一遍。"] },
  { intro:"数字听力辨析：-teen 重音在后，-ty 重音在前。",
    groups:[{ name:"十几 vs 几十", items:[["thirteen","/ˌθɜːrˈtiːn/ 十三"],["thirty","/ˈθɜːrti/ 三十"],["fourteen","十四"],["forty","四十"],["fifteen","十五"],["fifty","五十"]] }],
    tips:["听电话号码、价格时最容易错，重点练。"] },
  { intro:"词尾 -s 的三种读法：清后 /s/，浊后 /z/，咝音后 /ɪz/。",
    groups:[{ name:"词尾 -s", items:[["books","/bʊks/ 书（/s/）"],["dogs","/dɔːɡz/ 狗（/z/）"],["boxes","/ˈbɑːksɪz/ 盒子（/ɪz/）"],["days","/deɪz/ 天（/z/）"]] }],
    tips:["清辅音后读 /s/，元音和浊辅音后读 /z/。"] },
  { intro:"/l/ 与 /n/ 区分：/l/ 舌尖抵上齿龈，气流从两边走。",
    groups:[{ name:"/l/ vs /n/", items:[["light","/laɪt/ 灯"],["night","/naɪt/ 夜晚"],["lead","/liːd/ 带领"],["need","/niːd/ 需要"],["line","/laɪn/ 线"],["nine","/naɪn/ 九"]] }],
    tips:["捏住鼻子能读出来的是 /n/，读不出的是 /l/。"] },
],
3:[
  { intro:"过去式 -ed 三种读法：清后 /t/，浊后 /d/，t/d 后 /ɪd/。",
    groups:[{ name:"-ed 读法", items:[["walked","/wɔːkt/（/t/）"],["played","/pleɪd/（/d/）"],["wanted","/ˈwɑːntɪd/（/ɪd/）"],["cooked","/kʊkt/（/t/）"],["cleaned","/kliːnd/（/d/）"],["started","/ˈstɑːrtɪd/（/ɪd/）"]] }],
    tips:["不要把每个 -ed 都读成「德」。"] },
  { intro:"can 与 can't 听辨：can 弱读 /kən/，can't 重读 /kænt/。",
    groups:[{ name:"can vs can't", items:[["I can go.","/aɪ kən ɡoʊ/ 我能去"],["I can't go.","/aɪ kænt ɡoʊ/ 我不能去"],["Can you?","/kən juː/"],["Can't you?","/kænt juː/"]] }],
    tips:["肯定轻、否定重，听力靠重音区分。"] },
  { intro:"going to 口语读成 gonna，want to 读成 wanna。",
    groups:[{ name:"口语缩读", items:[["going to","gonna"],["want to","wanna"],["got to","gotta"],["have to","hafta"]] }],
    tips:["说的时候可以用，写的时候写原形。"] },
  { intro:"did you / would you 连读成 /dɪdʒə/ /ˈwʊdʒə/。",
    groups:[{ name:"d+y 变 /dʒ/", items:[["Did you eat?","di-JEET"],["Would you go?","wuh-JUH go"],["Did you see it?","di-juh see it"],["Could you help?","kuh-JUH help"]] }],
    tips:["d 遇到 you 的 /j/ 合成 /dʒ/。"] },
  { intro:"比较级重音在词干，-er 轻读。",
    groups:[{ name:"比较级发音", items:[["cheapER","/ˈtʃiːpər/"],["fastER","/ˈfæstər/"],["betTER","/ˈbɛtər/（Flap T）"],["bigGER","/ˈbɪɡər/"]] }],
    tips:["better 的 tt 是 Flap T，读 BEH-der。"] },
  { intro:"was / were 在句中弱读成 /wəz/ /wər/。",
    groups:[{ name:"was/were 弱读", items:[["I was busy.","I wuz busy"],["They were late.","they wer late"],["Was it good?","wuz it good"],["We were there.","we wer there"]] }],
    tips:["听到 /wəz/ 要反应出是 was。"] },
  { intro:"him / her 的 h 在句中脱落：tell him → TEL-lim。",
    groups:[{ name:"h 脱落", items:[["tell him","TEL-lim"],["ask her","AS-ker"],["call him","CA-lim"],["saw her","saw-ER"]] }],
    tips:["听力高频，听懂等于多抓一个词。"] },
  { intro:"/ŋ/ 与 /n/ 词尾区分：-ing 舌尖放下，-n 舌尖抵上。",
    groups:[{ name:"-ing vs -n", items:[["sing","/sɪŋ/"],["sin","/sɪn/"],["walking","/ˈwɔːkɪŋ/"],["taken","/ˈteɪkən/"]] }],
    tips:["温州人注意别把 -ing 读成 -in。"] },
],
4:[
  PHONICS_POOL[4], PHONICS_POOL[5], PHONICS_POOL[6], PHONICS_POOL[7], PHONICS_POOL[8], PHONICS_POOL[9],
  { intro:"元音相连加滑音：前面是 /iː/ 类加 /j/，/uː/ 类加 /w/。",
    groups:[{ name:"滑音", items:[["I am","I-yam"],["go out","go-wout"],["see it","see-yit"],["do it","do-wit"]] }],
    tips:["别在两个元音之间停顿。"] },
  { intro:"what do you 快读成 whaddaya，常见于日常对话。",
    groups:[{ name:"快语速", items:[["what do you","whaddaya"],["give me","gimme"],["let me","lemme"],["I don't know","I dunno"]] }],
    tips:["先听懂，再学着说。"] },
],
5:[
  { intro:"影子跟读：落后原声半秒，模仿语音语调，不看文字。",
    groups:[{ name:"影子跟读步骤", items:[["听一遍","理解意思"],["慢速跟读","落后半秒"],["常速跟读","同步节奏"],["脱稿跟读","凭耳朵"] ] }],
    tips:["每天 10 分钟，口语飞涨的王牌方法。"] },
  { intro:"快语速听辨：whaddaya / gimme / lemme / dunno。",
    groups:[{ name:"快语速词", items:[["What do you want?","whaddaya want"],["Give me a hand.","gimme a hand"],["Let me see.","lemme see"],["I don't know.","I dunno"]] }],
    tips:["美剧对话里全是这些，先练耳朵。"] },
  { intro:"重音强调练习：同一句话换重音，意思跟着变。",
    groups:[{ name:"重音游戏", items:[["I didn't say THAT.","没说「那个」"],["I DIDN'T say that.","「没」说"],["SHE did it.","是「她」"],["Give me the RED one.","要「红的」"]] }],
    tips:["想强调谁就重读谁。"] },
  { intro:"口语衔接词让话更连贯：well / so / anyway / actually。",
    groups:[{ name:"衔接词", items:[["Well, …","嗯……（开场）"],["So, …","那么……"],["Anyway, …","总之……"],["Actually, …","其实……"]] }],
    tips:["卡住时用一个，为自己争取思考时间。"] },
  { intro:"句子节奏：按重音打拍子，轻读词快速带过。",
    groups:[{ name:"节奏训练", items:[["I WANT to GO HOME.","三拍"],["WHAT are you DOing?","三拍"],["It's VEry GOOD.","三拍"],["TAKE it EA-sy.","三拍"]] }],
    tips:["英语像唱歌，别一个字一个字蹦。"] },
  { intro:"情绪语调：惊讶上扬，肯定下降，先升后降表强烈。",
    groups:[{ name:"情绪语调", items:[["Really? ↗","惊讶"],["Sure. ↘","爽快"],["Oh no! ↘","糟糕"],["You're kidding! ↗↘","开玩笑吧"]] }],
    tips:["语调带情绪，别像机器人。"] },
],
6:[
  { intro:"发音总纠偏：五个中国人最易错的音，逐个自检。",
    groups:[{ name:"纠偏清单", items:[["three","咬舌 /θ/"],["very","咬唇 /v/"],["red","卷舌 /r/"],["bad","梅花音 /æ/"],["world","/wɜːrld/ 卷舌+ dark L"]] }],
    tips:["每天读一遍，录下来和标准音对比。"] },
  { intro:"连读弱读综合：一句话里全部用上。",
    groups:[{ name:"综合连读", items:[["an apple","ə-NAA-pul"],["a cup of tea","uh-CUP-uh-TEA"],["I'm gonna go.","I'm-GUH-nuh-GO"],["What do you want?","whaddaya want"]] }],
    tips:["先慢后快，读成一个整体。"] },
  { intro:"语调综合：四种句型四种调。",
    groups:[{ name:"语调复习", items:[["I like it. ↘","陈述"],["Do you? ↗","是非问"],["What do you like? ↘","特殊问"],["Coffee or tea? ↗↘","选择问"]] }],
    tips:["毕业前必须过关的四件事。"] },
  { intro:"听写难点音总复习：最容易听混的五对。",
    groups:[{ name:"易混音对", items:[["sheep / ship","长短 i"],["bad / bed","æ vs e"],["walk / work","ɔː vs ɜːr"],["full / fool","ʊ vs uː"],["can / can't","轻 vs 重"]] }],
    tips:["听写时结合语境判断。"] },
  { intro:"快语速实战：整句常速听懂。",
    groups:[{ name:"常速整句", items:[["Whaddaya wanna do?","你想干嘛？"],["I dunno, lemme think.","不知道，让我想想。"],["Gimme a minute.","给我一分钟。"],["I'm gonna get going.","我得走了。"]] }],
    tips:["听不懂就拆成慢速，再合起来。"] },
  { intro:"毕业发音自检：大声朗读，用手机录音回听。",
    groups:[{ name:"自检流程", items:[["选一段课文","30 秒"],["大声朗读","注意连读弱读"],["录音","手机录音"],["回听对比","找差距"]] }],
    tips:["每周录一次，进步听得见。"] },
],
};

function stagePhonics(stage, day){
  const pool = PHONICS_BY_STAGE[stage] || PHONICS_POOL;
  return pool[day % pool.length];
}

/* 根据音标自动生成发音提示 */
function autoTip(ipa){
  if(!ipa) return "点喇叭慢速跟读 3 遍";
  if(ipa.includes("θ")||ipa.includes("ð")) return "咬舌音：舌尖轻咬在牙缝间";
  if(ipa.includes("v")) return "咬下唇 + 声带振动";
  if(ipa.includes("r")||ipa.includes("ɜː")||ipa.includes("ər")) return "注意美式卷舌";
  if(ipa.includes("iː")||ipa.includes("uː")) return "长元音，读够长度";
  if(ipa.includes("æ")) return "梅花音 /æ/，嘴巴张大";
  if(ipa.includes("ŋ")) return "舌根鼻音 /ŋ/，舌尖放下";
  if(ipa.includes("ʃ")||ipa.includes("tʃ")) return "噘嘴送气";
  return "注意重音位置";
}

function pickN(arr, n, offset){
  const out = [];
  for(let i=0;i<n && arr.length;i++) out.push(arr[(offset+i)%arr.length]);
  return out;
}
function shuffleSeed(arr, seed){
  const a = arr.slice();
  let x = seed || 1;
  for(let i=a.length-1;i>0;i--){ x=(x*9301+49297)%233280; const j=Math.floor(x/233280*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

/* 由词库生成选择题（含干扰项） */
function genVocabQuizItems(dayVocab, bank, count, seed){
  const items = [];
  const words = shuffleSeed(dayVocab.slice(), seed).slice(0, count);
  words.forEach((v,i)=>{
    const distract = shuffleSeed(bank.filter(o=>o.w!==v.w), seed+i*7).slice(0,3);
    if(distract.length<3) return;
    const mode = (seed+i)%4;
    if(mode===0){
      const opts = shuffleSeed([v,...distract], seed+i).map(o=>o.cn);
      items.push({ type:"listen", cat:"听力", say:v.w, options:opts, answer:opts.indexOf(v.cn), explain:`${v.w} ${v.ipa} = ${v.cn}`, vocabWord:v.w });
    }else if(mode===1){
      const opts = shuffleSeed([v,...distract], seed+i).map(o=>o.w);
      items.push({ type:"choice", cat:"词汇", q:`“${v.cn}”的英文是？`, options:opts, answer:opts.indexOf(v.w), explain:`${v.w} ${v.ipa}`, vocabWord:v.w });
    }else if(mode===2){
      const opts = shuffleSeed([v,...distract], seed+i).map(o=>o.cn);
      items.push({ type:"choice", cat:"词汇", q:`${v.w} ${v.ipa} 的中文意思是？`, options:opts, answer:opts.indexOf(v.cn), explain:v.ex, vocabWord:v.w });
    }else{
      const opts = shuffleSeed([v,...distract], seed+i).map(o=>o.w);
      items.push({ type:"listen", cat:"听力", say:v.w, options:opts, answer:opts.indexOf(v.w), explain:`${v.w} ${v.ipa} = ${v.cn}`, vocabWord:v.w });
    }
  });
  return items;
}

function genSentenceQuizItems(theme, count, seed){
  const items = [];
  const sents = theme.sentences || [];
  if(sents.length<4) return items;
  pickN(shuffleSeed(sents, seed), count, 0).forEach((s,i)=>{
    const distract = shuffleSeed(sents.filter(o=>o[0]!==s[0]), seed+i*13).slice(0,3).map(o=>o[0]);
    if(distract.length<3) return;
    const opts = shuffleSeed([s[0],...distract], seed+i);
    if((seed+i)%2===0)
      items.push({ type:"listen", cat:"听力", say:s[0], options:opts, answer:opts.indexOf(s[0]), explain:s[1] });
    else
      items.push({ type:"choice", cat:"句型", q:`“${s[1]}”英文怎么说？`, options:opts, answer:opts.indexOf(s[0]), explain:s[0] });
  });
  return items;
}

/* 组装一天的完整课程 */
function buildDailyLesson(day, info){
  const theme = GEN_CONTENT[info.theme];
  const cfg = STAGE_WEEKS[info.stage];
  let di = 0;
  if(cfg){
    let d = cfg.start;
    for(const wk of cfg.weeks){
      if(day>=d && day<d+6){ di = day-d; break; }
      d += 7;
    }
  }
  const perDay = Math.max(4, Math.ceil(theme.vocab.length/6));
  const dayVocabRaw = theme.vocab.slice(di*perDay, di*perDay+perDay);
  const dayVocab = dayVocabRaw.map(v=>({ w:v[0], ipa:v[1], cn:v[2], tip:autoTip(v[1]), ex:v[3], exCn:v[4] }));
  const bank = theme.vocab.map(v=>({ w:v[0], ipa:v[1], cn:v[2], ex:v[3] }));
  const g = theme.grammar[di % theme.grammar.length];
  const listening = dayVocab.slice(0,4).map(v=>({ say:v.w, show:`${v.w} ${v.ipa} ${v.cn}`, cn:"听音辨词" }));
  if(theme.sentences && theme.sentences.length)
    listening.push({ say:theme.sentences[di % theme.sentences.length][0], show:`${theme.sentences[di % theme.sentences.length][0]} ${theme.sentences[di % theme.sentences.length][1]}`, cn:"听整句" });
  const speaking = pickN(theme.questions, 3, di*2).map(q=>({ q:q[0], hint:q[1] }));
  const quiz = genVocabQuizItems(dayVocab, bank, 4, day)
    .concat(genSentenceQuizItems(theme, 2, day+3));
  const ph = theme.phonics || stagePhonics(info.stage, day);
  return {
    title: info.title,
    goal: `今日主题：${info.title}（${info.theme}）。掌握 ${dayVocab.length} 个高频词、1 个语法/句型点，完成听力、口语与每日测试。`,
    plan: [["发音/听力",15],["单词",10],["语法/句型",10],["口语",15],["复习/测试",10]],
    phonics: ph, vocab: dayVocab,
    grammar: g,
    listening, speaking, quiz,
  };
}

/* 测试日（周测/月测/阶段测/总测）：从当周或全阶段词库抽题 */
function buildTestLesson(day, info){
  const stageThemes = Object.keys(GEN_CONTENT).filter(t => GEN_CONTENT[t].stage === info.stage);
  let poolThemes = stageThemes.map(t=>GEN_CONTENT[t]);
  if(!poolThemes.length) poolThemes = Object.values(GEN_CONTENT); // 第 6 阶段：全部内容
  if(info.kind==="final-test") poolThemes = Object.values(GEN_CONTENT); // 毕业总测：抽全年
  let label = "月度测试";
  if(info.kind==="weekly-test"){
    label = "本周测试";
    const t = GEN_CONTENT[info.theme];
    if(t) poolThemes = [t];
  }
  else if(info.kind==="stage-test") label = "阶段测试";
  else if(info.kind==="final-test") label = "毕业总测试";
  const bank = [], sents = [], qs = [];
  poolThemes.forEach(t=>{
    t.vocab.forEach(v=>bank.push({ w:v[0], ipa:v[1], cn:v[2], ex:v[3] }));
    (t.sentences||[]).forEach(s=>sents.push(s));
    (t.questions||[]).forEach(q=>qs.push(q));
  });
  const nQ = info.kind==="weekly-test" ? 10 : 15;
  const fakeTheme = { sentences: sents };
  const quiz = genVocabQuizItems(shuffleSeed(bank, day), bank, Math.ceil(nQ*0.6), day+11)
    .concat(genSentenceQuizItems(fakeTheme, Math.floor(nQ*0.4), day+5))
    .slice(0, nQ);
  const reviewVocab = shuffleSeed(bank, day+1).slice(0,6).map(v=>({ w:v.w, ipa:v.ipa, cn:v.cn, tip:autoTip(v.ipa), ex:v.ex, exCn:"" }));
  const speaking = pickN(qs.length?qs:[["How are you?","I'm good, thanks."]], 5, day).map(q=>({ q:q[0], hint:q[1] }));
  return {
    title: info.title,
    goal: `${label}：从已学内容中抽取 ${quiz.length} 题，检验听力、词汇与句型。80 分以上为掌握，错题自动进入错题本。`,
    plan: [["重点回顾",15],["听力专项",10],[label,25],["讲评与错题记录",10]],
    phonics: stagePhonics(info.stage, day+1),
    vocab: reviewVocab,
    grammar: { title:label+"说明", rule:"今天不学新内容。先快速过一遍下面的复习词和口语题，再开始测试。测试提交即完成打卡。",
      examples: sents.slice(0,4) },
    listening: reviewVocab.slice(0,4).map(v=>({ say:v.w, show:`${v.w} ${v.ipa} ${v.cn}`, cn:"考前热身" })),
    speaking, quiz,
  };
}

/* 综合复习日（第 6 阶段与各阶段尾巴）：跨主题抽取 */
function buildReviewLesson(day, info){
  const bank = [], sents = [], qs = [];
  Object.values(GEN_CONTENT).forEach(t=>{
    t.vocab.forEach(v=>bank.push({ w:v[0], ipa:v[1], cn:v[2], ex:v[3] }));
    (t.sentences||[]).forEach(s=>sents.push(s));
    (t.questions||[]).forEach(q=>qs.push(q));
  });
  const dayVocab = shuffleSeed(bank, day).slice(0,6).map(v=>({ w:v.w, ipa:v.ipa, cn:v.cn, tip:autoTip(v.ipa), ex:v.ex, exCn:"" }));
  const fakeTheme = { sentences: sents };
  const quiz = genVocabQuizItems(dayVocab, bank, 4, day+17).concat(genSentenceQuizItems(fakeTheme, 2, day+9));
  return {
    title: info.title,
    goal: `综合复习日：从全部已学内容中抽取词汇、句子与口语题进行强化训练，错题自动进错题本。`,
    plan: [["发音/听力",15],["词汇复习",15],["句型复习",10],["口语输出",15],["测试",5]],
    phonics: stagePhonics(info.stage, day+2),
    vocab: dayVocab,
    grammar: { title:"句型复习", rule:"跟读下面的复习句，注意连读、弱读和语调。",
      examples: pickN(sents, 5, day) },
    listening: dayVocab.slice(0,4).map(v=>({ say:v.w, show:`${v.w} ${v.ipa} ${v.cn}`, cn:"听音辨词" }))
      .concat(sents.length?[{ say:sents[day%sents.length][0], show:`${sents[day%sents.length][0]} ${sents[day%sents.length][1]}`, cn:"听整句" }]:[]),
    speaking: pickN(qs.length?qs:[["What did you learn?","I learned …"]], 3, day).map(q=>({ q:q[0], hint:q[1] })),
    quiz,
  };
}

function getLesson(day){
  if(LESSONS[day]) return LESSONS[day];
  const info = DAY_MAP[day-1];
  if(!info) return null;
  if(info.kind !== "outline") return buildTestLesson(day, info);
  if(GEN_CONTENT[info.theme]) return buildDailyLesson(day, info);
  return buildReviewLesson(day, info);
}
