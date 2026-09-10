#!/usr/bin/env node
/* Build compact NLU datasets for Empty-X (run: node scripts/build-nlu-data.mjs)
   Sources (jsDelivr, reachable in CN):
   - Bowserinator/Periodic-Table-JSON  → elements.json
   - pwxcoo/chinese-xinhua             → idioms.json
   - mledoze/countries                 → countries.json
*/
import { writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "data");

const CAPS_ZH = {
  CN: "北京", US: "华盛顿", JP: "东京", KR: "首尔", KP: "平壤", GB: "伦敦", FR: "巴黎", DE: "柏林",
  RU: "莫斯科", IN: "新德里", IT: "罗马", ES: "马德里", PT: "里斯本", NL: "阿姆斯特丹", BE: "布鲁塞尔",
  CH: "伯尔尼", AT: "维也纳", SE: "斯德哥尔摩", NO: "奥斯陆", DK: "哥本哈根", FI: "赫尔辛基",
  PL: "华沙", CZ: "布拉格", GR: "雅典", TR: "安卡拉", EG: "开罗", ZA: "比勒陀利亚", NG: "阿布贾",
  KE: "内罗毕", ET: "亚的斯亚贝巴", MA: "拉巴特", DZ: "阿尔及尔", SA: "利雅得", AE: "阿布扎比",
  IL: "耶路撒冷", IR: "德黑兰", IQ: "巴格达", PK: "伊斯兰堡", BD: "达卡", LK: "科伦坡",
  NP: "加德满都", TH: "曼谷", VN: "河内", MY: "吉隆坡", SG: "新加坡", ID: "雅加达", PH: "马尼拉",
  MM: "内比都", KH: "金边", LA: "万象", MN: "乌兰巴托", AU: "堪培拉", NZ: "惠灵顿",
  CA: "渥太华", MX: "墨西哥城", BR: "巴西利亚", AR: "布宜诺斯艾利斯", CL: "圣地亚哥", PE: "利马",
  CO: "波哥大", VE: "加拉加斯", CU: "哈瓦那", UA: "基辅", HU: "布达佩斯", RO: "布加勒斯特",
  BG: "索菲亚", RS: "贝尔格莱德", HR: "萨格勒布", IS: "雷克雅未克", IE: "都柏林", CU2: "",
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " -> http " + r.status);
  return r.json();
}

async function buildElements() {
  const d = await getJSON("https://cdn.jsdelivr.net/gh/Bowserinator/Periodic-Table-JSON@master/PeriodicTableJSON.json");
  const out = [];
  for (const e of d.elements) {
    if (!e || !e.number) continue;
    out.push({
      n: e.number,
      s: e.symbol,
      m: e.name,
      mass: e.atomic_mass,
      phase: e.phase,
      cat: e.category,
      grp: e.group,
      per: e.period,
      dens: e.density,
      melt: e.melt,
      boil: e.boil,
      eneg: e.electronegativity_pauling,
      cfg: e.electron_configuration_semantic || e.electron_configuration,
      disc: e.discovered_by,
      sum: (e.summary || "").slice(0, 180),
    });
  }
  return out;
}

const COMMON_IDIOMS = `画蛇添足 塞翁失马 守株待兔 刻舟求剑 掩耳盗铃 亡羊补牢 井底之蛙 对牛弹琴 狐假虎威 杯弓蛇影
拔苗助长 自相矛盾 滥竽充数 叶公好龙 南辕北辙 螳臂当车 鹬蚌相争 朝三暮四 邯郸学步 望梅止渴
三顾茅庐 四面楚歌 卧薪尝胆 破釜沉舟 指鹿为马 纸上谈兵 背水一战 完璧归赵 负荆请罪 毛遂自荐
唇亡齿寒 草木皆兵 风声鹤唳 投鼠忌器 缘木求鱼 水中捞月 火上浇油 雪中送炭 锦上添花 画龙点睛
一箭双雕 一举两得 一鸣惊人 一鼓作气 一败涂地 一网打尽 一目了然 一丝不苟 一言九鼎 一诺千金
千钧一发 千载难逢 千变万化 千辛万苦 万无一失 万众一心 万紫千红 万众瞩目 半途而废 半信半疑
不耻下问 不寒而栗 不假思索 不计其数 不劳而获 不谋而合 不速之客 不同凡响 不相上下 不翼而飞
不屈不挠 不可思议 不由自主 不知所措 不足为奇 不约而同 不慌不忙 从容不迫 兴高采烈 兴致勃勃
心旷神怡 心花怒放 心灰意冷 心领神会 心照不宣 心惊胆战 心安理得 心平气和 心急如焚 心心相印
目不转睛 目瞪口呆 目中无人 目不暇接 眉飞色舞 眉开眼笑 迫在眉睫 燃眉之急 如火如荼 如鱼得水
如虎添翼 如释重负 如愿以偿 恍然大悟 恍如隔世 恍然大悟 无微不至 无与伦比 无所事事 无动于衷
无可奈何 无穷无尽 无独有偶 无精打采 无中生有 无边无际 无懈可击 各抒己见 各行其是 各得其所
异想天开 异口同声 废寝忘食 兴风作浪 别出心裁 别具一格 别开生面 势不可挡 势如破竹 勇往直前
奋不顾身 废寝忘食 姹紫嫣红 察言观色 掌上明珠 排山倒海 探囊取物 推陈出新 措手不及 掩人耳目
插翅难飞 提心吊胆 揭竿而起 握手言和 搜肠刮肚 摧枯拉朽 摩肩接踵 撞头鼠窜 擒贼擒王 翻天覆地
文质彬彬 斩钉截铁 断章取义 无稽之谈 无孔不入 无济于事 无影无踪 无拘无束 无所适从 无所作为
望尘莫及 望而生畏 望穿秋水 未雨绸缪 未卜先知 本末倒置 条分缕析 杯水车薪 东张西望 东施效颦
东拼西凑 东道主 两全其美 两败俱伤 两袖清风 举世闻名 举一反三 举足轻重 义无反顾 义正词严
兴师动众 兵不血刃 兵荒马乱 再接再厉 出类拔萃 出神入化 出尔反尔 出口成章 刀山火海 分道扬镳
分秒必争 别具匠心 刮目相看 刻不容缓 削足适履 前车之鉴 前赴后继 前程似锦 力挽狂澜 功亏一篑
功德无量 功成名就 劳而无功 势均力敌 化险为夷 化整为零 十全十美 十拿九稳 千锤百炼 千方百计
南柯一梦 危言耸听 危在旦夕 口若悬河 古色古香 另辟蹊径 只争朝夕 可歌可泣 史无前例 叹为观止
各司其职 合情合理 同舟共济 名不虚传 名列前茅 名副其实 后继有人 含辛茹苦 呕心沥血 因地制宜
坚不可摧 坚韧不拔 声东击西 声名鹊起 夜以继日 大器晚成 大显身手 大相径庭 大义凛然 天衣无缝
天花乱坠 天翻地覆 天经地义 天罗地网 天马行空 奋笔疾书 好高骛远 如出一辙 妙手回春 委曲求全
娓娓道来 字斟句酌 孤注一掷 宁缺毋滥 寥若晨星 寥寥无几 尺有所短 尽心尽力 层出不穷 峰回路转
川流不息 巧夺天工 差强人意 己所不欲 巴山夜雨 师出有名 平心而论 年富力强 广开言路 应运而生
废寝忘食 开卷有益 弃暗投明 弄巧成拙 引以为戒 张灯结彩 归心似箭 当仁不让 形影不离 彻头彻尾
循规蹈矩 微乎其微 心猿意马 必恭必敬 快马加鞭 怨天尤人 恍然大悟 惟妙惟肖 想入非非 感同身受
慢条斯理 慷慨解囊 成竹在胸 我行我素 战战兢兢 执迷不悟 扬长避短 拾金不昧 按图索骥 措置裕如
推心置腹 揠苗助长 敷衍了事 数不胜数 文过饰非 斩草除根 无地自容 无可厚非 春华秋实 暴跳如雷
曲高和寡 有条不紊 望眼欲穿 朝思暮想 朽木不雕 杯盘狼藉 柳暗花明 树大招风 殊途同归 毛遂自荐
气宇轩昂 水滴石穿 永垂不朽 江郎才尽 沧海一粟 波澜壮阔 海阔天空 混水摸鱼 渐入佳境 游刃有余
满腹经纶 滴水不漏 火上浇油 焦头烂额 熙熙攘攘 独一无二 狼狈为奸 独树一帜 班门弄斧 画饼充饥
百发百中 百折不挠 百读不厌 目不识丁 相得益彰 相形见绌 眉清目秀 破镜重圆 神机妙算 祸不单行
离经叛道 种瓜得瓜 积少成多 稳操胜券 空前绝后 穿针引线 突飞猛进 立竿见影 竭泽而渔 精卫填海
精打细算 精益求精 络绎不绝 绝处逢生 统筹兼顾 缘木求鱼 翻云覆雨 老马识途 耳濡目染 聚精会神
脍炙人口 自食其果 自欺欺人 舍己为人 良药苦口 花团锦簇 苦尽甘来 草船借箭 莫逆之交 落井下石
蓬荜生辉 薪火相传 虎头蛇尾 虚怀若谷 蛛丝马迹 街谈巷议 见多识广 见异思迁 触类旁通 言归于好
调虎离山 谈虎色变 负荆请罪 货真价实 走马观花 越俎代庖 趾高气扬 身临其境 车水马龙 迎刃而解
追本溯源 逆水行舟 逍遥法外 遇人不淑 遥遥无期 醍醐灌顶 金蝉脱壳 锲而不舍 闭门造车 问心无愧
防微杜渐 阳春白雪 随波逐流 集思广益 雨后春笋 雷厉风行 青出于蓝 面红耳赤 鞭长莫及 韦编三绝
顺水推舟 颐指气使 风驰电掣 风起云涌 饮鸩止渴 首屈一指 马到成功 驾轻就熟 骑虎难下 高瞻远瞩
鬼斧神工 鱼目混珠 鸟语花香 鹤立鸡群 黔驴技穷 鼎鼎大名 龙飞凤舞 龙争虎斗`.split(/\s+/).filter(Boolean);

async function buildIdioms() {
  const raw = await getJSON("https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua@master/data/idiom.json");
  const seen = new Set();
  const byLetter = {};
  for (const it of raw) {
    const w = (it.word || "").trim();
    const e = (it.explanation || "").trim();
    const py = (it.pinyin || "").trim();
    if (!w || !e || !py) continue;
    if (w.length < 3 || w.length > 6) continue;
    if (!/^[\u4e00-\u9fff]+$/.test(w)) continue;
    if (e.indexOf("～") !== -1 || e.length < 8 || e.length > 150) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    const letter = py[0].toLowerCase();
    if (letter < "a" || letter > "z") continue;
    (byLetter[letter] = byLetter[letter] || []).push({ w: w, e: e.slice(0, 110), four: w.length === 4 });
  }
  const out = [];
  const chosen = new Set();
  const allByWord = new Map();
  for (const letter of Object.keys(byLetter)) {
    for (const item of byLetter[letter]) allByWord.set(item.w, item);
  }
  // 1) high-frequency whitelist first (guaranteed presence)
  for (const w of COMMON_IDIOMS) {
    const it = allByWord.get(w);
    if (it && !chosen.has(w)) {
      chosen.add(w);
      out.push({ w: it.w, e: it.e });
    }
  }
  // 2) uniform sampling across all pinyin initials
  for (const letter of Object.keys(byLetter)) {
    const list = byLetter[letter];
    const fours = list.filter((x) => x.four);
    const others = list.filter((x) => !x.four);
    const pool = fours.length >= 300 ? fours : fours.concat(others);
    const step = Math.max(1, Math.floor(pool.length / 300));
    for (let i = 0; i < pool.length && out.length < 9200; i += step) {
      if (chosen.has(pool[i].w)) continue;
      chosen.add(pool[i].w);
      out.push({ w: pool[i].w, e: pool[i].e });
    }
  }
  return out;
}

async function buildCountries() {
  const raw = await getJSON("https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json");
  const out = [];
  for (const c of raw) {
    if (!c.unMember && !["TW", "HK", "MO", "PS", "VA"].includes(c.cca2)) continue;
    const zh = (c.translations && c.translations.zho && c.translations.zho.common) || null;
    if (!zh) continue;
    const curKey = c.currencies ? Object.keys(c.currencies)[0] : null;
    const cur = curKey && c.currencies[curKey] ? (c.currencies[curKey].name || curKey) : null;
    const idd = c.idd && c.idd.root ? c.idd.root + (c.idd.suffixes && c.idd.suffixes[0] ? c.idd.suffixes[0] : "") : null;
    out.push({
      zh: zh,
      en: c.name && c.name.common,
      cap: (c.capital && c.capital[0]) || null,
      capZh: CAPS_ZH[c.cca2] || null,
      cur: cur,
      curCode: curKey,
      phone: idd,
      region: c.subregion || c.region || null,
      area: c.area || null,
      latlng: c.latlng || null,
    });
  }
  return out;
}

let CHATTER_CACHE = null;
async function chatterbotYml(lang, cat) {
  if (!CHATTER_CACHE) {
    const r = await fetch("https://codeload.github.com/gunthercox/chatterbot-corpus/tar.gz/refs/heads/master");
    if (!r.ok) throw new Error("chatterbot download failed " + r.status);
    const gz = Buffer.from(await r.arrayBuffer());
    CHATTER_CACHE = tarExtract(gz, (n) => /chatterbot_corpus\/data\/.*\.yml$/.test(n));
  }
  const want = "/data/" + lang + "/" + cat + ".yml";
  const f = CHATTER_CACHE.find((x) => x.name.endsWith(want));
  return f ? f.data.toString("utf8") : null;
}

const BAD = /操你|傻逼|尼玛|妈逼|你妈|妈的|你妹|滚蛋|去死|贱人|贱|婊|妓|嫖|约炮|做爱|性爱|爱爱|啪啪|裸|阴茎|阴道|乳房|强奸|自杀|杀人|毒品|冰毒|大麻|赌博|博彩|彩票|发票|贷款|加微信|加qq|q群|群号|http|www\.|\.com|\.cn|手机号|身份证|银行卡|色情|黄片|习近平|共产党|法轮功|六四|台独|港独|肺炎|疫情|病毒|导弹|战争|屠杀|移民|偷渡|诈骗|传销|代购|刷单|骚|淫|怀孕|避孕|开房|上床|妹纸|撸|屌|鸡巴|jb|sm之|sm是|菊花痒/i;
const JUNK = /^[\s\d\p{P}\p{S}]+$/u;

function tarExtract(gzBuf, wantedExt) {
  const tar = gunzipSync(gzBuf);
  const files = [];
  let off = 0;
  while (off + 512 <= tar.length) {
    const name = tar.toString("utf8", off, off + 100).replace(/\0.*$/, "");
    if (!name) { off += 512; continue; }
    const sizeStr = tar.toString("utf8", off + 124, off + 136).replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const dataStart = off + 512;
    const hit = typeof wantedExt === "function" ? wantedExt(name) : name.endsWith(wantedExt);
    if (hit) files.push({ name, data: tar.subarray(dataStart, dataStart + size) });
    off = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

function brandify(s) {
  return s.replace(/小黄鸡/g, "空又").replace(/黄鸡/g, "空又").replace(/小黄鸭/g, "空又")
    .replace(/小通/g, "空又").replace(/通通/g, "空又");
}

async function buildQA() {
  const pairs = [];
  /* 1) chatterbot Chinese categories (high quality, keep first) */
  const cats = ["greetings", "conversations", "emotion", "humor", "food", "money", "history", "psychology", "science", "trivia", "ai", "botprofile", "gossip"];
  for (const cat of cats) {
    try {
      const txt = await chatterbotYml("chinese", cat);
      if (!txt) continue;
      const re = /- - (.+)\n  - (.+)/g;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const q = m[1].trim();
        const a = m[2].trim();
        if (q.length < 2 || q.length > 22 || a.length < 1 || a.length > 60) continue;
        if (BAD.test(q) || BAD.test(a) || JUNK.test(q)) continue;
        pairs.push({ q: q, a: brandify(a), w: 2 });
      }
    } catch (e) { /* skip */ }
  }
  const chatterCount = pairs.length;
  /* 2) xiaohuangji 500k corpus (retrieval-based classic) */
  const r2 = await fetch("https://codeload.github.com/pzy2000/-/tar.gz/refs/heads/main");
  if (!r2.ok) throw new Error("xhj download failed " + r2.status);
  const gz = Buffer.from(await r2.arrayBuffer());
  const conv = tarExtract(gz, ".conv")[0];
  if (conv) {
    const text = conv.data.toString("utf8");
    const lines = text.split("\n");
    let cur = [];
    const seenQ = new Map();
    const all = [];
    for (const ln of lines) {
      if (ln === "E") {
        if (cur.length >= 2) {
          const q = cur[0].replace(/^M\s*/, "").trim();
          const a = cur[1].replace(/^M\s*/, "").trim();
          if (q.length >= 2 && q.length <= 20 && a.length >= 2 && a.length <= 60 && !/^(是|不|哦|嗯|啊|哈|呵|额|呃|噢|哎|嗨|喂|草|的|了|吗)$/.test(a) &&
              !BAD.test(q) && !BAD.test(a) && !JUNK.test(q) && !JUNK.test(a) &&
              !/[\uD800-\uDFFF]/.test(q) && !/[\uD800-\uDFFF]/.test(a)) {
            all.push([brandify(q), brandify(a)]);
          }
        }
        cur = [];
      } else if (ln.startsWith("M ")) {
        if (cur.length < 2) cur.push(ln);
      }
    }
    for (const [q, a] of all) {
      const cur = seenQ.get(q);
      if (cur) { cur.c++; }
      else seenQ.set(q, { a: a, c: 1 });
    }
    const uniq = Array.from(seenQ.entries());
    /* high-frequency questions first: the more people asked it, the more
       "everyday" it is — this is what makes the bot answer common chit-chat */
    uniq.sort((x, y) => y[1].c - x[1].c);
    const TARGET = 20000;
    for (let i = 0; i < uniq.length && pairs.length < chatterCount + TARGET; i++) {
      pairs.push({ q: uniq[i][0], a: uniq[i][1].a, w: 1 });
    }
  }
  return pairs;
}

const BAD_EN = /\b(sex|porn|fuck|shit|dick|cock|pussy|nigger|rape|suicide|nazi|drugs|kill you|masturbat)\w*\b/i;

function parseAIML(txt) {
  const out = [];
  const re = /<category>([\s\S]*?)<\/category>/gi;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const body = m[1];
    const pm = body.match(/<pattern>([\s\S]*?)<\/pattern>/i);
    if (!pm) continue;
    let pat = pm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!pat || pat.length < 2 || pat.length > 42) continue;
    if (/[*_^]/.test(pat)) continue;
    if (/[{}<>]/.test(pat)) continue;
    const tm = body.match(/<template>([\s\S]*?)<\/template>/i);
    if (!tm) continue;
    if (/<get\b|<bot\b|<set\b|<person2?\b|<gender\b|<condition\b|<srai\b|<sr\b|<topicstar|<thatstar/i.test(tm[1])) continue;
    let tpl = tm[1].replace(/<think>[\s\S]*?<\/think>/gi, " ");
    const lis = [];
    tpl.replace(/<li>([\s\S]*?)<\/li>/gi, (x, y) => { lis.push(y); return " "; });
    const candidates = lis.length ? lis : [tpl];
    let ans = candidates[Math.floor(Math.random() * candidates.length)]
      .replace(/<srai>[\s\S]*?<\/srai>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ").trim();
    if (!ans || ans.length < 2 || ans.length > 90) continue;
    if (/[{}]/.test(ans)) continue;
    if (/(^|\s)(my|your|his|her|their)\s*[.!?,]?$/i.test(ans)) continue;
    if (/don'?t know|no idea|not sure|ask me (another|something)|i have no answer|unknown/i.test(ans) && ans.length < 60) continue;
    if (BAD_EN.test(pat) || BAD_EN.test(ans)) continue;
    out.push({ q: pat, a: ans, w: 1 });
  }
  return out;
}

async function buildQAEn() {
  const pairs = [];
  /* 1) chatterbot english categories */
  const cats = ["greetings", "conversations", "emotion", "humor", "food", "money", "health", "movies", "sports", "literature", "computers", "coding", "ai", "botprofile", "psychology", "history", "science", "trivia", "gossip", "politics"];
  for (const cat of cats) {
    try {
      const txt = await chatterbotYml("english", cat);
      if (!txt) continue;
      const re = /- - (.+)\n  - (.+)/g;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const q = m[1].trim().toLowerCase();
        const a = m[2].trim();
        if (q.length < 2 || q.length > 42 || a.length < 1 || a.length > 90) continue;
        if (BAD_EN.test(q) || BAD_EN.test(a)) continue;
        pairs.push({ q: q, a: a, w: 3 });
      }
    } catch (e) { /* skip */ }
  }
  const chatterCount = pairs.length;
  /* 2) ALICE AIML corpus (daily files first, knowledge later) */
  const DAILY = /(conversations|emotion|food|humor|gossip|inquiry|interjection|bot_profile|ai|astrology|history|literature|movies|computers|drugs)/;
  const r2 = await fetch("https://codeload.github.com/wuweiit/AliceBot/tar.gz/refs/heads/master");
  if (!r2.ok) throw new Error("alicebot download failed " + r2.status);
  const gz = Buffer.from(await r2.arrayBuffer());
  const files = tarExtract(gz, (n) => /\.(xml|aiml)$/i.test(n) && n.indexOf("Corpus/English/") !== -1);
  const daily = [], knowledge = [];
  for (const f of files) {
    const short = f.name.split("/").pop();
    const parsed = parseAIML(f.data.toString("utf8"));
    if (DAILY.test(short)) daily.push(...parsed.map((x) => ({ ...x, w: 2 })));
    else knowledge.push(...parsed);
  }
  const seen = new Set(pairs.map((x) => x.q));
  for (const it of daily.concat(knowledge)) {
    if (seen.has(it.q)) continue;
    seen.add(it.q);
    pairs.push(it);
    if (pairs.length >= chatterCount + 20000) break;
  }
  return pairs;
}

const [elements, idioms, countries, qa, qaEn] = await Promise.all([buildElements(), buildIdioms(), buildCountries(), buildQA(), buildQAEn()]);
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "elements.json"), JSON.stringify(elements));
await writeFile(join(OUT, "idioms.json"), JSON.stringify(idioms));
await writeFile(join(OUT, "countries.json"), JSON.stringify(countries));
await writeFile(join(OUT, "qa.json"), JSON.stringify(qa));
await writeFile(join(OUT, "qa-en.json"), JSON.stringify(qaEn));
await writeFile(join(OUT, "manifest.json"), JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  elements: elements.length,
  idioms: idioms.length,
  countries: countries.length,
  qa: qa.length,
  qa_en: qaEn.length,
}));
console.log("elements:", elements.length, "| idioms:", idioms.length, "| countries:", countries.length, "| qa:", qa.length, "| qa_en:", qaEn.length);
