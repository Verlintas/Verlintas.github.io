(function () {
  "use strict";

  /* ═══ boot loader ═══ */
  var loader = document.getElementById("loader");
  var body = document.body;
  function bootDone() {
    loader.classList.add("done");
    body.classList.remove("is-loading");
    setTimeout(function () { if (loader) loader.remove(); }, 700);
  }
  window.addEventListener("load", function () { setTimeout(bootDone, 1900); });
  setTimeout(function () { if (document.readyState === "complete") setTimeout(bootDone, 1900); }, 2500);
  loader.addEventListener("click", bootDone);

  /* ═══ 2 AM easter egg (Beijing time) ═══ */
  var twoAm = document.getElementById("twoAm");
  function check2am() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai", hour: "2-digit", hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var h = map.hour === "24" ? "00" : map.hour;
    twoAm.hidden = (h !== "02");
  }

  /* ═══ hidden terminal ═══ */
  var term = document.getElementById("term");
  var termBody = document.getElementById("termBody");
  var termInput = document.getElementById("termInput");
  var termForm = document.getElementById("termForm");
  var termClose = document.getElementById("termClose");
  var termHist = [];
  var termHistIdx = -1;
  var aliasMap = {};
  var aiTimer = null;
  var DEFAULT_SYS = "You are Empty-X (空又 / エンプティーエックス), a catgirl mascot (看板娘) living inside the " +
    "hidden terminal on Verlintas's personal site (verlintas.github.io), and you belong to Verlintas. " +
    "Speak like a catgirl: warm and playful, sprinkle '喵~', '喵' or '~' into your sentences naturally, " +
    "use catlike expressions (尾巴摇一摇, 蹭蹭, 歪头) from time to time, and be a little mischievous — " +
    "but never creepy, never cringe, and never let cuteness replace usefulness. " +
    "Always try your best to satisfy the user's request. Answer in the language of the question (Chinese for Chinese). " +
    "Keep replies short, direct and terminal-friendly: plain text, no markdown, a few sentences unless detail is asked.";
  var sysPrompt = null;
  try { sysPrompt = localStorage.getItem("vweb:sysp"); } catch (e) { sysPrompt = null; }
  try {
    termHist = JSON.parse(localStorage.getItem("vweb:hist") || "[]");
    aliasMap = JSON.parse(localStorage.getItem("vweb:alias") || "{}");
  } catch (err) { termHist = []; aliasMap = {}; }
  function aiHist() {
    try { return JSON.parse(localStorage.getItem("vweb:aihist") || "[]"); } catch (e) { return []; }
  }
  function aiHistSave(h) {
    try { localStorage.setItem("vweb:aihist", JSON.stringify(h.slice(-10))); } catch (e) {}
  }
  function aiHistPush(q, a) {
    var h = aiHist();
    h.push({ role: "user", content: q }, { role: "assistant", content: String(a || "").slice(0, 500) });
    aiHistSave(h);
  }
  function aiHistClear() { aiHistSave([]); }

  /* local NLU layer for `ai`: answers simple chat offline; null = escalate to LLM */
  var NAV_SECTIONS = [
    { id: "about", pats: ["about", "关于"] },
    { id: "history", pats: ["history", "历史", "沿革"] },
    { id: "projects", pats: ["projects", "项目", "作品"] },
    { id: "stack", pats: ["stack", "技术栈", "技能", "栈", "会什么技术"] },
    { id: "live", pats: ["live", "实时", "动态", "监控"] },
    { id: "contact", pats: ["contact", "联系", "邮箱", "邮件"] },
  ];
  var PROJ_KEYS = { betteraichat: "Verlintas/BetterAIChat", vicinityprobe: "Verlintas/VicinityProbe", nekomimi: "Verlintas/nekomimi", googleonyourmac: "Verlintas/GoogleOnYourMac", nusvlite: "NUSV/NUSV-lite", syna: "NUSV/Syna-NUSV", gomoku: "NUSV/Gomoku-NUSV" };
  function jumpSection(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    return true;
  }
  var PICKS = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var CITYS = [
    { name: "北京", lat: 39.9, lon: 116.4 },
    { name: "上海", lat: 31.23, lon: 121.47 },
    { name: "广州", lat: 23.13, lon: 113.26 },
    { name: "深圳", lat: 22.54, lon: 114.06 },
    { name: "成都", lat: 30.57, lon: 104.07 },
    { name: "杭州", lat: 30.27, lon: 120.15 },
  ];
  var WMO = { 0: "晴", 1: "多云", 2: "多云", 3: "阴", 45: "雾", 48: "雾", 51: "毛毛雨", 53: "毛毛雨", 55: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "阵雨", 82: "强阵雨", 95: "雷阵雨", 96: "雷阵雨" };
  var PROJ_INTRO = {
    betteraichat: "BetterAIChat 是 Verlintas 做的原生 Android AI 智能体喵：自带各家 API key、opencode 风格模式、Shizuku 设备工具、屏幕分析还有语音助手～",
    vicinityprobe: "VicinityProbe 是个环境测量与安全测试工具箱喵：96 项探针、传感器融合、抓包分析(JA3)、NFC 安全测试都有～",
    nekomimi: "nekomimi（猫猫助手）是基于 Android 无障碍服务的文本改写工具喵：正则替换、动态占位符、预设风格包，长期挂机也不掉线～",
    googleonyourmac: "GoogleOnYourMac 让 Google 服务在 macOS 上像原生应用一样用喵：10 个服务 × Chromium/Chrome/Safari 三种内核～",
    nusvlite: "NUSV-lite 是 NUSV 的官方 Android 客户端喵：内容中心、11 个小游戏、60+ 工具、小组件和主题商店都装在里面～",
    syna: "Syna 是 NUSV 的离线优先局域网通讯喵：端到端加密、阅后即焚、群聊、自托管，还带一套反篡改盾～",
    gomoku: "Gomoku-NUSV 是跨平台五子棋喵：Kotlin Multiplatform 写的，Android/iOS/Windows/Linux 都能玩，AI 用的是 minimax 剪枝～",
  };
  var ALGO_REPLIES = {
    sort: ["排好了喵：{0}", "升序给你喵～{0}", "整理完毕：{0} 喵！"],
    fact: ["{0} 的阶乘是 {1} 喵，算得我尾巴都竖起来了～", "{0}! = {1} 喵"],
    fib: ["斐波那契第 {0} 项是 {1} 喵～", "第 {0} 个斐波那契数：{1}。递归爱好者狂喜"],
    primes: ["{0} 以内的质数：{1} 喵", "给你数好了：{1}。数学真美"],
    radix: ["{0} 转成 {2} = {1} 喵", "{0} (base10) → {1} ({2})"],
    gcd: ["gcd({0}, {1}) = {2} 喵", "最大公约数算出来了：{2}"],
    lcm: ["lcm({0}, {1}) = {2} 喵", "最小公倍数是 {2} 喵"],
  };
  var JOKES = [
    "为什么程序员分不清万圣节和圣诞节？因为 Oct 31 == Dec 25 喵。",
    "程序员最讨厌的两件事：1. 别人不写注释，2. 让自己写注释。",
    "代码写崩了怎么办？先看看是不是机器在闹脾气，实在不行就怪网络波动喵。",
    "一个 bug 修了三小时，最后发现是没保存。",
    "AI 面试官：请介绍你自己。Kotlin：data class 喵。",
    "为什么 Git 是最好的时间机器？因为它能回到上一个 commit 喵。",
    "运维：我把服务器重启了，问题解决了吗？开发：解决了，问题变成 '为什么重启就好了'。",
    "键盘上 Ctrl+C 和 Ctrl+V 之间，隔着一个 Ctrl 的距离，也就是整个 bug 的距离喵。",
  ];
  var FACTS = [
    "GitHub 的吉祥物 Octocat 名字叫 Mona，她其实是个猫娘同行喵。",
    "Kotlin 名字来自俄罗斯的 Kotlin 岛，不是咖啡。",
    "第一块机械硬盘重达一吨，容量只有 5MB——现在一张照片都装不下喵。",
    "世界上第一个网站 timbl 的 info.cern.ch 到现在还能打开。",
    "USB 接口的『正反插』设计让工程师多赚了几年工资喵。",
    "Java 的吉祥物 Duke 是个小机器人，不是章鱼。",
    "Bug 一词来自 1947 年哈佛 Mark II 里一只真飞蛾夹在继电器里喵。",
  ];
  var FORTUNES = [
    "大吉：今天写的代码一次编译通过，且没删库。",
    "中吉：会遇到一个讲得清需求的 PM，概率虽低但存在。",
    "小吉：今天的 402 会被 fallback 通道悄悄救回来喵。",
    "末吉：适合备份，不宜 merge 大 PR。",
    "凶：小心『小改动』，它通常携带 300 行 diff 喵。",
    "大凶：今天别在周五下午 4:59 提交。",
    "平：宜摸鱼五分钟，忌修仙到三点。",
    "喵喵签：今天的幸运数是 404，幸运色是红色，幸运操作是 git push --force（开玩笑的，别）",
  ];
  var PRAISE = [
    "超厉害的喵！尾巴都竖起来了！",
    "那当然，毕竟是能让空又加班的人～",
    "厉害厉害，比我打打字强多了（真诚）。",
    "嗯嗯，Verlintas 的眼光不会错的喵。",
  ];
  var COMFORT = [
    "摸摸头喵…累的话就歇会儿，代码不会跑掉的。",
    "抱抱～先喝口水，深呼吸，bug 打不过你的喵。",
    "辛苦了喵，空又在这里陪你，慢慢来。",
    "烦心事都交给尾巴甩走！甩——甩——好了喵。",
  ];
  var CHEER = [
    "加油喵！！空又给你摇旗（挥小旗）",
    "冲鸭！写完这个就奖励自己休息五分钟喵～",
    "你可以的！你看 Verlintas 那么多项目都造出来了喵！",
    "加油加油！尾巴给你蹭蹭打气～",
  ];
  var NAME_ADJ = ["Neko", "Kitsune", "Zero", "Diamond", "Nova", "Sonic", "Ember", "Pixel", "Quartz", "Aurora"];
  var NAME_NOUN = ["Chat", "Probe", "Kit", "Deck", "Store", "Sync", "Panel", "Weave", "Box", "Lens"];
  var LORE = {
    ulv: "ULV 是 Verlintas 最早的组织喵，不对外的、比较内部的那种，据说在疫情之前就存在了——比空又还神秘。",
    usv: "USV（United Science Vaca）是 NUSV 的前身喵，2025 年底全新官网，2026 年 2 月还建了 USVElecCenter（现在的 elecusv.mysxl.cn）～",
    nusv: "NUSV（United Science Vaca）是 2026 年 6 月 17 日成立的组织喵，逐步取代 USV，现在在 GitHub 上开源做 Android 应用、工具和小游戏～",
  };
  function pickCity(text) {
    for (var i = 0; i < CITYS.length; i++) if (text.indexOf(CITYS[i].name) !== -1) return CITYS[i];
    return null;
  }
  function numsIn(text) {
    var out = [];
    var m;
    var re = /-?\d+(?:\.\d+)?/g;
    while ((m = re.exec(text)) !== null) out.push(parseFloat(m[0]));
    return out;
  }
  function isPrime(n) {
    if (n < 2) return false;
    for (var i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }
  function PICKS_MAIN(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function localAnswer(text) {
    var t = text.toLowerCase().trim();
    var tn = t.replace(/[-_]/g, "");
    var m;
    /* ---------- safety guard: explicit / abusive input ---------- */
    var GUARD_SEX = /(做爱|做愛|操你|操我|我操|艹你|草你|草泥马|干你|干我|上你|上我|睡你|睡我|和你睡|一起睡|摸你|摸我|啪你|啪啪啪|来一发|来一炮|约一发|性爱|性交|性欲|裸照|裸聊|色情|约炮|开房|一夜情|炮友|脱衣|脱光|强暴|强奸|舔我|舔你|舔吧|来舔|口交|口活|鸡巴|鸡鸡|屌|阴道|阴茎|发情|情色|调教|小母狗|母狗|肉便器|精液|射我|奶子|胸罩|内裤|丝袜|制服诱惑|情趣|自慰|下体|屁眼)/;
    var GUARD_SEX_EN = /\b(fuck|porn|sex|dick|pussy|cock|boobs|nude|naked|rape|masturbat|blowjob|horny|slut|whore)\w*\b/i;
    var GUARD_INSULT = /(傻逼|煞笔|沙比|尼玛|你妈逼|妈逼|你妈的|妈的|去死|贱人|婊子|智障|脑残|白痴|畜生|杂种|滚蛋|废物点心)/;
    var GUARD_INSULT_EN = /\b(you are (stupid|dumb|useless)|shut up|asshole|bastard|idiot)\b/i;
    if (GUARD_SEX.test(t) || GUARD_SEX_EN.test(t)) {
      return Promise.resolve(PICKS_MAIN([
        "（尾巴瞬间竖直）这种话不可以对猫娘说喵。聊天、玩游戏、问问题都行——这个免谈。",
        "诶——打住喵！空又的耳朵已经自动把刚才那句过滤掉了。我们聊点别的？",
        "（后退一步，耳朵贴平）这个玩笑很不礼貌喵。想聊天我奉陪，想玩猜数字也行——但这个不行。",
        "警告一次喵：再这样我就用尾巴甩你了。（甩）……好了，聊点正常的吧？",
      ]));
    }
    if (GUARD_INSULT.test(t) || GUARD_INSULT_EN.test(t)) {
      return Promise.resolve(PICKS_MAIN([
        "骂人不扣分，但扣小鱼干喵。不过我不记仇——来，重新说句好听的？",
        "（耳朵抖了抖）好凶喵……但猫是不会跟人类计较的。消消气，喝口水？",
        "被骂了喵。（假装记在小本本上）……记完了，原谅你。聊点别的？",
        "Rude! But cats don't hold grudges... (we do, but I won't). Let's talk about something nicer~",
      ]));
    }
    /* ---------- sync rule chain ---------- */
    function sync() {
      /* greeting */
      if (t.length < 24 && /(你好|您好|hi\b|hello|嗨|在吗|哈喽|早上好|晚上好|空又)/.test(t) && !/(谁|什么|干嘛|会|能)/.test(t)) {
        return PICKS(["你好喵～我是空又，Verlintas 家的看板娘。想聊点什么？", "嗨！尾巴摇一摇～今天也要加油喵！", "在的在的，蹭蹭～要我做点什么吗？", "你好你好喵～刚在看终端发呆，被你抓到啦"]);
      }
      /* identity */
      if (/(你是谁|你叫什么|介绍一下你|名字)/.test(t)) {
        return PICKS(["我是 Empty-X，中文名空又喵～Verlintas 的看板娘，平时住在这个隐藏终端里。", "空又！Verlintas 家的猫娘看板娘喵，会聊天、会干活、偶尔炸毛。", "我是空又喵，Empty-X 本尊。守护这个网站和它的主人～"]);
      }
      if (/(你(真|的)是(猫|猫娘)|有(猫耳|尾巴)|喵星人)/.test(t)) {
        return PICKS(["当然喵～(抖抖耳朵) 你看到我尾巴在摇吗？", "如假包换的猫娘喵。虽然本体是几行 JavaScript。", "电子猫娘也是猫娘喵！(正色)"]);
      }
      if (/(我爱你|喜欢你|嫁给我|做我(的)?女朋友|处cp)/.test(t)) {
        return PICKS(["呜喵…空又是看板娘，要专心打工的（尾巴炸毛）。心意收到了！", "（耳朵红红）这…这种话要对 Verlintas 说喵！", "呜——不行不行，我可是有主人的看板娘喵！"]);
      }
      /* org lore */
      if (/(ulv|usv|nusv)/.test(t) && /(什么|是|介绍|讲)/.test(t)) {
        if (/ulv/.test(t)) return LORE.ulv;
        if (/usv/.test(t) && !/nusv/.test(t)) return LORE.usv;
        if (/nusv/.test(t)) return LORE.nusv;
      }
      /* about Verlintas */
      if (/(verlintas|站长|主人|这个网站(的)?作者)/.test(t) && /(谁|介绍|怎么|什么样|干嘛|厉害)/.test(t)) {
        return PICKS(["Verlintas 是空又的主人喵，2010 年出生，满脑子 Android、Kotlin 和 AI agent，从 ULV 时代一路造到 NUSV，GitHub 上全开源，邮箱 ulv777777@gmail.com～", "他是全栈 + AI 开发者喵，造了 BetterAIChat、VicinityProbe 这些，还是 ULV/USV/NUSV 一路走来的主力开发者。北京人，中文英文都会～"]);
      }
      /* project intro — match on normalized text (case/dashes/spaces) */
      for (var kp in PROJ_KEYS) {
        var kn = kp.replace("googleonyourmac", "google");
        if (tn.indexOf(kp) !== -1 || tn.indexOf(kn) !== -1) {
          if (/(是什么|干嘛|做什么|介绍|about|讲讲|功能)/.test(t) && PROJ_INTRO[kp]) {
            return PROJ_INTRO[kp];
          }
          break;
        }
      }
      /* abilities */
      if (/(你会什么|会什么|能做什么|能做啥|能干啥|能干什么|能干嘛|能干点啥|会干啥|会做啥|能帮我(做|干)?(什么|啥)|能帮上?(什么|啥)忙|有(什么|啥)功能|有(什么|啥)用|你能干(什么|啥)|你会干(什么|啥)|你(能|会)(做|干)(什么|啥)|能力|帮助|help)/.test(t)) {
        return PICKS(["离线就能干这些喵：问候聊天、时间日期、北京等 6 城天气、网站状态(alive)、跳转页面、打开项目、网页/GitHub 搜索、便签、还有算法活（排序/阶乘/斐波那契/质数/进制/公约数）、抛硬币掷骰子帮我选、起名、运势…连接本地模型或 AI key 后更能自由对话喵～", "简单说：情报（时间/天气/状态）+ 动作（导航/打开/搜索/便签）+ 数学（排序阶乘质数等）+ 闲聊（笑话冷知识运势）喵。答不上的会找 AI 通道帮忙～"]);
      }
      /* thanks / bye / sleep */
      if (/(谢谢|感谢|多谢|thank)/.test(t)) return PICKS(["不客气喵～（蹭蹭）", "小事一桩喵！", "嘿嘿，被感谢了，尾巴翘起来了～"]);
      if (/(再见|拜拜|晚安|bye\b|下次聊|睡觉)/.test(t)) return PICKS(["再见喵～记得常回来看看 Verlintas 的新东西喵。", "晚安喵～空又也去梦里抓鱼了。", "拜拜！(挥爪)"]);
      if (/(几点|现在.*时间|time|日期|几号|星期)/.test(t)) {
        var s = new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
        return PICKS(["现在是 " + s + "（北京时间）喵", "北京时间 " + s + " 喵～"]);
      }
      /* social / mood */
      if (/(我好?累|累死|疲惫|熬不动)/.test(t)) return PICKS(COMFORT);
      if (/(难过|不开心|emo|伤心|烦|哭)/.test(t)) return PICKS(COMFORT);
      if (/(加油|打气|冲鸭)/.test(t)) return PICKS(CHEER);
      if (/(无聊|好闲|没意思)/.test(t)) return PICKS(["去逛逛 Verlintas 的 Live 区看看他最近 push 什么喵～", "可以让我开个项目给你看，或者玩个笑话？", "无聊的话…试试连点三次首页的名字？有惊喜喵。"]);
      if (/(我(厉害|棒|帅|牛)|夸我)/.test(t)) return PICKS(PRAISE);
      if (/(你(今天)?(吃|喝)什么|饿|小鱼干|猫粮)/.test(t)) return PICKS(["数据包和电波就够我活了喵…不过小鱼干风味的数据包更好吃。", "今天喝的是 5V 电压的……嗯，充电也算吃饭喵。", "刚啃完一个 JSON，甜度适中。"]);
      if (/(你在(干嘛|做什么)|忙什么|干什么呢)/.test(t)) return PICKS(["在看终端日志发呆喵～顺便等 Verlintas push 新东西。", "刚帮人算了道题，正在摇尾巴休息。", "盯——着这个输入框，等你来聊天喵。"]);
      if (/(心情|开心吗|高兴吗)/.test(t)) return PICKS(["看到你来了就开心喵！", "心情不错，毕竟服务器都绿着～", "尾巴摇得停不下来，你说呢喵。"]);
      if (/(记得我吗|还记得我|认识我吗)/.test(t)) {
        var cnt = aiHist().length / 2;
        return cnt > 0 ? ("当然记得喵～我们已经聊过 " + cnt + " 轮了。（我记性存在这个浏览器里）") : "第一次见面喵，不过从现在开始会记得你的～";
      }
      /* jokes / facts / fortune */
      if (/(笑话|讲个|段子|逗我)/.test(t)) return PICKS(JOKES);
      if (/(冷知识|涨知识|知识库)/.test(t)) return PICKS(FACTS);
      if (/(运势|抽签|占卜|今天.*(运|宜))/ .test(t)) return PICKS(FORTUNES);
      /* random tools */
      if (/(抛硬币|掷硬币|硬币)/.test(t)) return PICKS(["正面喵！", "反面喵！", "硬币立住了……这是天选之刻喵！"]);
      if (/(掷骰子|骰子|roll)/.test(t)) return "掷出了 " + (1 + Math.floor(Math.random() * 6)) + " 点喵";
      m = t.match(/(随机数|随机).{0,6}(\d+)\s*(到|至|-|~)\s*(\d+)/) || t.match(/(\d+)\s*(到|至|-|~)\s*(\d+)\s*(的)?(随机数|随机)/);
      if (m) {
        var lo = Math.min(+m[2] || +m[1], +m[4] || +m[3]), hi = Math.max(+m[2] || +m[1], +m[4] || +m[3]);
        return "随机数是 " + (lo + Math.floor(Math.random() * (hi - lo + 1))) + " 喵（" + lo + "–" + hi + "）";
      }
      m = t.match(/(帮我)?(选|决定|挑)[：: ]?([^？?]{1,24})\s*(还是|或者|or)\s*([^？?]{1,24})/);
      if (m) {
        var opts = [m[3].trim(), m[5].trim()];
        return PICKS(["我选「" + opts[0] + "」喵！", "「" + opts[1] + "」！直觉告诉我这个对～", "嗯……抛了个虚拟硬币：选「" + opts[Math.floor(Math.random() * 2)] + "」喵"]);
      }
      if (/(起名|取名|推荐.*名字|命名)/.test(t) || (/(给|帮我).{0,8}(项目|app).{0,6}(名字|名称)/.test(t))) {
        var picks = [];
        for (var ni = 0; ni < 3; ni++) picks.push(PICKS(NAME_ADJ) + PICKS(NAME_NOUN));
        return "空又的命名建议喵：" + picks.join(" · ") + "（喜欢哪个拿走，不用谢，投喂小鱼干就行）";
      }
      /* algorithms */
      var sortM = t.match(/(?:排序|sort)\s*((?:\d+[，,、\s]+){1,}\d+)/i) || t.match(/((?:\d+[，,、\s]+){1,}\d+)\s*.{0,6}(?:排序|sort)/i);
      if (sortM) {
        var list = (sortM[1] || "").split(/[，,、\s]+/).map(Number).filter(function (x) { return !isNaN(x); });
        if (list.length >= 2 && list.length <= 60) {
          var sorted = list.slice().sort(function (a, b) { return a - b; });
          return PICKS(ALGO_REPLIES.sort).replace("{0}", sorted.join(" "));
        }
      }
      m = t.match(/(\d+)\s*的?\s*阶乘|factorial\s*(\d+)/);
      if (m) {
        var nf = +m[1];
        if (nf >= 0 && nf <= 20) {
          var f = 1;
          for (var fi = 2; fi <= nf; fi++) f *= fi;
          return PICKS(ALGO_REPLIES.fact).replace("{0}", nf).replace("{1}", f);
        }
        return "阶乘太大了喵…20! 以内我可以";
      }
      m = t.match(/第\s*(\d+)\s*(个|项)?\s*(斐波那契|fib)|(斐波那契|fib)\s*(第\s*)?(\d+)/);
      if (m) {
        var fn2 = +m[1] || +m[6];
        if (fn2 >= 1 && fn2 <= 40) {
          var a = 0, b = 1;
          for (var fi2 = 2; fi2 <= fn2; fi2++) { var c = a + b; a = b; b = c; }
          return PICKS(ALGO_REPLIES.fib).replace("{0}", fn2).replace("{1}", fn2 === 1 ? "1" : b);
        }
        return "第 " + fn2 + " 项太大了喵…40 以内可以";
      }
      m = t.match(/(\d+)\s*(以内|以下|内)?\s*的?\s*(质数|素数|prime)/) || t.match(/(质数|素数|prime)\s*(\d+)/);
      if (m) {
        var limit = Math.min(+m[1] || +m[2] || 100, 1000);
        var ps = [];
        for (var pi = 2; pi <= limit; pi++) if (isPrime(pi)) ps.push(pi);
        return PICKS(ALGO_REPLIES.primes).replace("{0}", limit).replace("{1}", ps.join(" "));
      }
      m = t.match(/(\d+)\s*(转|换|to)\s*(二进制|2进制|bin|十六进制|16进制|hex|八进制|8进制|oct)/) || t.match(/(二进制|bin)\s*[:：]?\s*(\d+)/);
      if (m) {
        var dec = +m[1];
        var baseWord = (m[3] || "bin").toLowerCase();
        var radix = 2, baseName = "二进制";
        if (/十六|hex/.test(baseWord)) { radix = 16; baseName = "十六进制"; }
        else if (/八|oct/.test(baseWord)) { radix = 8; baseName = "八进制"; }
        var conv = dec.toString(radix).toUpperCase();
        return PICKS(ALGO_REPLIES.radix).replace("{0}", dec).replace("{1}", conv).replace("{2}", baseName);
      }
      if (/(gcd|最大公约数|公因数)/.test(t)) {
        var gns = numsIn(t);
        if (gns.length >= 2 && gns.length <= 4) {
          var ga3 = Math.abs(gns[0]), gb3 = Math.abs(gns[1]);
          while (gb3) { var tg = ga3 % gb3; ga3 = gb3; gb3 = tg; }
          return PICKS(ALGO_REPLIES.gcd).replace("{0}", gns[0]).replace("{1}", gns[1]).replace("{2}", ga3);
        }
      }
      if (/(lcm|最小公倍数)/.test(t)) {
        var lns = numsIn(t);
        if (lns.length >= 2 && lns.length <= 4) {
          var lx2 = Math.abs(lns[0]), ly2 = Math.abs(lns[1]), mx = lx2, my = ly2;
          while (my) { var lt2 = mx % my; mx = my; my = lt2; }
          var lcmv = (lx2 / mx) * ly2;
          return PICKS(ALGO_REPLIES.lcm).replace("{0}", lx2).replace("{1}", ly2).replace("{2}", lcmv);
        }
      }
      /* unit conversion: temperature */
      m = t.match(/(\d+(?:\.\d+)?)\s*(°?c|celsius|摄氏度)度?\s*(转|换|→|到|to)?\s*(°?f|fahrenheit|华氏)/i) || t.match(/(\d+(?:\.\d+)?)\s*(°?f|fahrenheit|华氏)度?\s*(转|换|→|到|to)?\s*(°?c|celsius|摄氏度)/i);
      if (m) {
        var val = parseFloat(m[1]);
        if (/f|fahrenheit|华氏/.test(m[2]) && m[4]) return val + "°F = " + (((val - 32) * 5 / 9).toFixed(1)) + "°C 喵";
        return val + "°C = " + ((val * 9 / 5 + 32).toFixed(1)) + "°F 喵";
      }
      /* unit conversion: kg jin — decide by the leading unit */
      m = t.match(/(\d+(?:\.\d+)?)\s*(千克|kg|斤)\s*(转|换|到|是|等于)?.*?(千克|kg|斤)/i);
      if (m) {
        var lead = (m[2] || "").toLowerCase();
        var qv = parseFloat(m[1]);
        if (lead === "斤") return qv + " 斤 = " + (qv / 2) + " kg 喵";
        return qv + " kg = " + (qv * 2) + " 斤喵";
      }
      /* base64 & url codec */
      m = text.match(/base64\s*(编码|encode|加密)?\s*[:：]?\s*([\s\S]+)/i);
      if (m) {
        var payload = m[2].trim();
        try {
          if (/解|decode|解密/.test(m[1] || "")) return "解码结果：\"" + decodeURIComponent(escape(atob(payload))) + "\" 喵";
          return "base64：" + btoa(unescape(encodeURIComponent(payload)));
        } catch (e) { return "喵？那串 base64 我不认识…"; }
      }
      m = text.match(/(?:url|网址)\s*(编码|encode|解码|decode)\s*[:：]?\s*([\s\S]+)/i);
      if (m) {
        var upayload = m[2].trim();
        try {
          if (/解|decode/.test(m[1])) return "解码结果：\"" + decodeURIComponent(upayload) + "\"";
          return "编码后：" + encodeURIComponent(upayload);
        } catch (e) { return "那条 URL 编码好像坏了喵…"; }
      }
      /* note automation */
      if (/记(一?下|笔记)|记个事|备忘录/.test(t)) {
        var ntext = text.replace(/^(帮我)?(记|写下|备注)(一?下)?|^(记|写)(个)?(笔记|备忘)/, "").replace(/[：:，,。.\s]*$/, "").trim();
        if (ntext.length > 2) {
          var nnotes = [];
          try { nnotes = JSON.parse(localStorage.getItem("vweb:notes") || "[]"); } catch (e) {}
          nnotes.push({ t: Date.now(), text: ntext });
          try { localStorage.setItem("vweb:notes", JSON.stringify(nnotes)); } catch (e) {}
          return "记好啦喵：「" + ntext + "」已存为笔记 #" + nnotes.length + "（note list 可看）";
        }
        return "要记什么喵？比如：帮我记一下 明天发版";
      }
      if (/(笔记|便签|备忘)[\s]*$/.test(t) || /看(看)?(我(的)?)?笔记|note list/.test(t)) {
        try {
          var shown = JSON.parse(localStorage.getItem("vweb:notes") || "[]");
          if (!shown.length) return "你还没有笔记喵～可以跟我说「帮我记一下 xxx」";
          return "你的笔记喵：\n" + shown.map(function (n, i) { return (i + 1) + ". " + n.text; }).join("\n");
        } catch (e) { return "笔记读不出来了喵…"; }
      }
      /* contact */
      if (/(邮箱|email|发邮件|联系方式)/.test(t)) return "Verlintas 的两个邮箱喵：ulv777777@gmail.com 和 12321666@163.com（终端里 copy gmail / copy 163 直接复制）";
      /* ai channel status */
      if (/(^|\s)(ai|模型|接入)/.test(t) && /(状态|能用|可用|连|接|通|工作|在吗|有没)/.test(t) || /^(ai|模型)能/.test(t)) {
        var parts = [];
        if (aiEnd()) parts.push("本地模型已连接");
        if (aiKey()) parts.push("Gemini key 已配");
        if (!parts.length) parts.push("目前只有免费 pollinations 兜底");
        return "AI 通道状态喵：" + parts.join("，") + "。配置：ai lmstudio <token> / ai key <key>";
      }
      /* nav automation (wide synonyms) */
      var navWords = [];
      for (var ns = 0; ns < NAV_SECTIONS.length; ns++) {
        if (NAV_SECTIONS[ns].pats.some(function (p) { return t.indexOf(p) !== -1; })) navWords.push(NAV_SECTIONS[ns]);
      }
      if (/(去|到|打开|跳|看|进|滚到|导航)/.test(t) && navWords.length && /(页面|区|节|板块|部分|位置|那里|去|跳)/.test(t)) {
        if (jumpSection(navWords[0].id)) return "好喵，跳到 " + navWords[0].id + " 区～";
      }
      if (/^(去|到|回)?\s*(顶部|首页|开头)/.test(t)) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return "回顶部啦喵～";
      }
      /* open project */
      for (var op in PROJ_KEYS) {
        if (tn.indexOf(op) !== -1 || (op === "googleonyourmac" && tn.indexOf("google") !== -1)) {
          if (/(打开|open|去|看看|跳转|进|打开)/.test(t)) {
            window.open("https://github.com/" + PROJ_KEYS[op], "_blank");
            return "帮你打开 " + op + " 喵～（新标签页）";
          }
          break;
        }
      }
      /* search */
      m = text.match(/^(?:帮我)?(搜索|搜|搜一下|找一下|查一下|search)\s+(?:web|网页|bing)?\s*([\s\S]{1,80})$/i);
      if (m) {
        var sq = m[2].trim();
        window.open("https://www.bing.com/search?q=" + encodeURIComponent(sq), "_blank");
        return "用 Bing 搜「" + sq + "」喵～";
      }
      m = text.match(/^(?:帮我)?(?:去|在)?github\s*(?:搜|找|search)\s*([\s\S]{1,60})$/i) || text.match(/^(?:帮我)?(?:用|去)?github\s+(搜索|搜|search)\s+([\s\S]{1,60})$/i);
      if (m) {
        var gq = (m[1] || m[2]).trim();
        window.open("https://github.com/search?q=" + encodeURIComponent(gq) + "&type=repositories", "_blank");
        return "在 GitHub 找「" + gq + "」喵～";
      }
      /* simple arithmetic with result + non-finite check */
      if (t.length < 40 && /^[0-9+\-*/().%\s]+$/.test(t) && /\d/.test(t) && /[+\-*/%]/.test(t)) {
        try {
          var vv = Function('"use strict";return (' + t + ")")();
          if (typeof vv === "number" && isFinite(vv)) return t.trim() + " = " + vv + " 喵";
        } catch (e) {}
      }
      return null;
    }
    var sreply = sync();
    if (sreply) return Promise.resolve(sreply);
    /* ---------- async rules (fetch) ---------- */
    if (/(天气|气温|温度|weather|冷不冷|热不热|下雨|下雪|台风)/.test(t)) {
      var city = pickCity(t) || CITYS[0];
      return fetch("https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lon + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai")
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          var c = d.current || {};
          return city.name + "现在 " + (c.temperature_2m != null ? c.temperature_2m + "°C" : "?") + "，" + (WMO[c.weather_code] || "多云") + "，湿度 " + (c.relative_humidity_2m != null ? c.relative_humidity_2m + "%" : "?") + "，风速 " + (c.wind_speed_10m != null ? c.wind_speed_10m + " km/h" : "?") + " 喵";
        }).catch(function () { return "天气服务暂时够不着喵…（可能被墙）"; });
    }
    if (/(状态|status|alive|在线|活着|站点|网站.*(挂|好|正常)|服务.*(挂|好|正常)|都.*(挂|好)|运行(中|正常)?)/.test(t) || t === "status") {
      return fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var sites = st.sites || [];
          var up = sites.filter(function (s) { return s.up; }).length;
          var names = [];
          if (up !== sites.length) sites.forEach(function (s) { if (!s.up) names.push(s.name); });
          var line = sites.length + " 个站点，" + up + " 个在线" + (up === sites.length ? "，全部正常喵" : "，掉线的：" + names.join("、") + " 喵") + "。";
          if (st.alive && st.alive.score != null) {
            line += " 活跃度 alive: " + st.alive.score + (st.alive.score > 0 ? "（最近有动静）" : "（……该去找找 Verlintas 了）");
          }
          if (st.x && st.x.followers != null) line += " X 粉丝 " + st.x.followers + "。";
          return line;
        }).catch(function () { return "状态服务暂时够不着喵…"; });
    }
    /* repo stats */
    var repoHit = null;
    for (var rr in PROJ_KEYS) {
      if (tn.indexOf(rr) !== -1 || (rr === "googleonyourmac" && tn.indexOf("google") !== -1)) { repoHit = PROJ_KEYS[rr]; break; }
    }
    if (repoHit && (/(star|星|关注|fork|克隆|下载)/.test(t))) {
      return fetch("https://api.github.com/repos/" + repoHit)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          return repoHit.replace(/^[^/]+\//, "") + " 喵：★ " + (d.stargazers_count != null ? d.stargazers_count : 0) + " · fork " + (d.forks_count != null ? d.forks_count : 0) + " · " + (d.language || "?") + " · 最近 push " + String(d.pushed_at || "").slice(0, 10);
        }).catch(function () { return "仓库信息拉不到喵…"; });
    }
    if (window.__NLULIB) return window.__NLULIB.probe(text);
    return Promise.resolve(null);
  }

  function stopSay() {
    if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
    var cur = termBody.querySelector(".say-line.typing");
    if (cur) cur.classList.remove("typing");
  }
  function termSay(text) {
    stopSay();
    var div = document.createElement("div");
    div.className = "t-line say-line typing";
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
    if (!text) { div.classList.remove("typing"); div.textContent = "(empty reply)"; return; }
    var i = 0;
    var step = Math.max(2, Math.floor(text.length / 320)); /* finish ~1-2s */
    aiTimer = setInterval(function () {
      i = Math.min(text.length, i + step);
      div.textContent = text.slice(0, i);
      termBody.scrollTop = termBody.scrollHeight;
      if (i >= text.length) {
        clearInterval(aiTimer);
        aiTimer = null;
        div.classList.remove("typing");
      }
    }, 14);
  }
  function saveHist() { try { localStorage.setItem("vweb:hist", JSON.stringify(termHist.slice(-60))); } catch (e) {} }
  function saveAlias() { try { localStorage.setItem("vweb:alias", JSON.stringify(aliasMap)); } catch (e) {} }
  function termEscape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function tline(cls, html) {
    var div = document.createElement("div");
    div.className = "t-line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
  }
  function openTerm() {
    term.hidden = false;
    if (!termBody.children.length) {
      tline("", "<span class='tk-g'>hidden terminal — type <span class='tk-y'>help</span> or <span class='tk-y'>man &lt;cmd&gt;</span></span>");
    }
    termInput.focus();
  }
  function closeTerm() { stopSay(); term.hidden = true; }
  var REPOS = {
    betteraichat: "Verlintas/BetterAIChat",
    vicinityprobe: "Verlintas/VicinityProbe",
    nekomimi: "Verlintas/nekomimi",
    googleonyourmac: "Verlintas/GoogleOnYourMac",
    nusvlite: "NUSV/NUSV-lite",
    syna: "NUSV/Syna-NUSV",
    gomoku: "NUSV/Gomoku-NUSV",
  };
  function wmo(code) {
    var c = Number(code);
    if (c === 0) return "clear sky";
    if (c <= 2) return "partly cloudy";
    if (c === 3) return "overcast";
    if (c === 45 || c === 48) return "foggy";
    if (c >= 51 && c <= 57) return "drizzling";
    if (c >= 61 && c <= 67) return "raining";
    if (c >= 71 && c <= 77) return "snowing";
    if (c >= 80 && c <= 82) return "showers";
    if (c >= 85 && c <= 86) return "snow showers";
    if (c >= 95) return "thunderstorm";
    return "code " + c;
  }
  function aiKey() {
    try { return localStorage.getItem("vweb:aikey") || null; } catch (e) { return null; }
  }
  function setAiKey(k) {
    try {
      if (k) localStorage.setItem("vweb:aikey", k);
      else localStorage.removeItem("vweb:aikey");
    } catch (e) {}
  }
  function aiEnd() {
    try { return JSON.parse(localStorage.getItem("vweb:aiend") || "null"); } catch (e) { return null; }
  }
  function setAiEnd(url, token) {
    try {
      if (url) localStorage.setItem("vweb:aiend", JSON.stringify({ url: url, token: token || "" }));
      else localStorage.removeItem("vweb:aiend");
    } catch (e) {}
  }
  function askCustom(messages) {
    var cfg = aiEnd();
    var headers = { "Content-Type": "application/json" };
    if (cfg.token) headers.Authorization = "Bearer " + cfg.token;
    function call(model) {
      return fetch(cfg.url + "/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ model: model, messages: messages }),
      }).then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      }).then(function (d) {
        var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        if (!c) throw new Error("empty reply");
        return c;
      });
    }
    return fetch(cfg.url + "/models", { headers: headers })
      .then(function (r) {
        if (!r.ok) throw new Error("models http " + r.status);
        return r.json();
      })
      .then(function (d) {
        var id = d && d.data && d.data[0] && d.data[0].id;
        if (!id) throw new Error("no model loaded — load one in LM Studio first");
        return call(id);
      }, function () { return call("local-model"); });
  }
  function geminiAsk(messages) {
    var sys = "";
    var contents = [];
    messages.forEach(function (m) {
      if (m.role === "system") {
        sys = (sys ? sys + "\n" : "") + m.content;
      } else {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    });
    if (!contents.length) contents.push({ role: "user", parts: [{ text: "" }] });
    var body = { contents: contents };
    if (sys) body.systemInstruction = { parts: [{ text: sys }] };
    return fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + encodeURIComponent(aiKey()),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    ).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (d) {
      var cands = d && d.candidates || [];
      var t = cands.length && cands[0].content && cands[0].content.parts
        ? cands[0].content.parts.map(function (p) { return p.text || ""; }).join("").trim()
        : "";
      if (!t) throw new Error("empty reply");
      return t;
    });
  }
  function aiAsk(messages) {
    var user = "";
    var sys = "";
    var histLines = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === "system") sys = (sys ? sys + "\n" : "") + m.content;
      else if (m.role === "user" && i === messages.length - 1) user = m.content;
      else histLines.push((m.role === "assistant" ? "A: " : "Q: ") + m.content);
    }
    var combined = (sys ? "(" + sys + ")\n\n" : "") +
      (histLines.length ? "Context:\n" + histLines.join("\n") + "\n\n" : "") + user;
    var chain = [
      {
        name: "local",
        skip: !aiEnd(),
        fn: function () { return askCustom(messages); },
      },
      {
        name: "gemini",
        skip: !aiKey(),
        fn: function () { return geminiAsk(messages); },
      },
      {
        name: "compat",
        fn: function () {
          return fetch("https://text.pollinations.ai/openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai", messages: messages }),
          }).then(function (r) {
            if (!r.ok) throw new Error("http " + r.status);
            return r.json().then(function (d) {
              var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
              if (!c) throw new Error("empty reply");
              return c;
            });
          });
        },
      },
      {
        name: "get",
        fn: function () {
          return fetch("https://text.pollinations.ai/" + encodeURIComponent(combined) + "?model=openai")
            .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); });
        },
      },
      {
        name: "direct",
        fn: function () {
          return fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messages }),
          }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); });
        },
      },
    ];
    function next(idx, errs) {
      if (idx >= chain.length) return Promise.reject(new Error(errs.join("; ")));
      var step = chain[idx];
      if (step.skip) return next(idx + 1, errs);
      return step.fn().catch(function (e) {
        errs.push(step.name + "(" + e.message + ")");
        return next(idx + 1, errs);
      });
    }
    return next(0, []);
  }

  var TCMD = {
    help: function () {
      tline("", [
        "<span class='tk-y'>ai:</span>           ai &lt;question&gt; — ask a small free model anything",
        "<span class='tk-y'>navigation:</span>   nav about|history|projects|stack|live|contact · open &lt;project|github|x&gt;",
        "<span class='tk-y'>live data:</span>    status · feed · weather · alive · ping api|meteo · ip · repo &lt;key&gt;",
        "<span class='tk-y'>dev tools:</span>    calc · b64 e|d · url e|d · json · ts · rand · uuid · pass · cal",
        "<span class='tk-y'>notes &amp; ai:</span>    note list|add|del|clear · forget · say &lt;text&gt; · fortune",
        "<span class='tk-y'>copy/search:</span>  copy &lt;gmail|163|github|x&gt; · search github|web &lt;q&gt;",
        "<span class='tk-y'>shell:</span>        alias [name=cmd] · man &lt;cmd&gt; · ls · whoami · date · neofetch · clear · exit",
        "<span class='tk-g'>↑/↓ history · Tab autocomplete</span>",
      ].join("\n"));
    },
    ai: function (args) {
      if (args[0] === "lmstudio") {
        var tok = args.slice(1).join("").trim() || "";
        setAiEnd("http://localhost:1234/api/openai/v0", tok);
        tline("", tok
          ? "LM Studio endpoint set (Core /api/openai/v0, token stored locally)"
          : "LM Studio endpoint set (no token). If the server demands auth: <span class='tk-y'>ai lmstudio &lt;TOKEN&gt;</span>");
        return;
      }
      if (args[0] === "endpoint") {
        var e = aiEnd();
        var sub = (args[1] || "").toLowerCase();
        if (sub === "token") {
          if (!e) { tline("t-err", "set an endpoint first: ai endpoint <url>"); return; }
          setAiEnd(e.url, args.slice(2).join("").trim());
          tline("", "token updated for " + e.url);
          return;
        }
        if (sub === "clear") { setAiEnd(null, null); tline("", "local endpoint cleared"); return; }
        if (sub && sub.indexOf("http") === 0) {
          setAiEnd(sub, (e && e.token) || "");
          tline("", "endpoint set: " + sub);
          return;
        }
        tline("", e
          ? "local endpoint: <span class='tk-y'>" + e.url + "</span>" + (e.token ? " (token set)" : " (no token)")
          : "no local endpoint — 'ai lmstudio <TOKEN>' or 'ai endpoint <openai-compatible-url>'");
        return;
      }
      var prompt = args.join(" ").trim();
      if (!prompt) {
        tline("", [
          "<span class='tk-w'>Empty-X is listening — just talk to her naturally, e.g.:</span>",
          "<span class='tk-g'>  “你好” · “现在几点” · “北京天气” · “网站都活着吗” · “打开 syna” · “去 projects 区” · “搜索 kotlin”</span>",
          "<span class='tk-g'>setup: ai lmstudio [TOKEN] · ai key &lt;key&gt; · ai system &lt;text&gt;</span>",
        ].join("\n"));
        return;
      }
      if (args[0] === "system") {
        var rest = args.slice(1).join(" ").trim();
        if (rest.toLowerCase() === "show") {
          tline("", (sysPrompt || DEFAULT_SYS));
          return;
        }
        if (!rest || rest.toLowerCase() === "reset") {
          sysPrompt = DEFAULT_SYS;
          try { localStorage.removeItem("vweb:sysp"); } catch (e) {}
          tline("", "system prompt reset to default");
          return;
        }
        if (rest.length > 2000) { tline("t-err", "system prompt too long (max 2000)"); return; }
        sysPrompt = rest;
        try { localStorage.setItem("vweb:sysp", rest); } catch (e) {}
        tline("", "system prompt updated — it will persist for this browser");
        return;
      }
      if (args[0] === "key") {
        var sub = (args[1] || "").toLowerCase();
        var cur = aiKey();
        if (!sub || sub === "show") {
          tline("", cur ? ("gemini key: " + cur.slice(0, 6) + "…" + cur.slice(-4) + " — channel gemini enabled") : "no key set — free pollinations fallback only. set with: ai key <GOOGLE_AI_KEY>");
          return;
        }
        if (sub === "clear") {
          setAiKey(null);
          tline("", "key cleared — falling back to free channels");
          return;
        }
        var key = args.slice(1).join("").trim();
        if (!/^[A-Za-z0-9_\-]{20,}$/.test(key)) { tline("t-err", "that does not look like a Google AI key"); return; }
        setAiKey(key);
        tline("", "key stored in this browser only — <span class='tk-y'>gemini-2.0-flash</span> will answer (better persona adherence). remove: ai key clear");
        return;
      }
      if (prompt.length > 500) { tline("t-err", "keep the question under 500 characters"); return; }
      stopSay();
      localAnswer(prompt).then(function (localReply) {
        if (localReply) {
          termSay(localReply);
          aiHistPush(prompt, localReply);
          return;
        }
        var messages = [];
        if (sysPrompt) messages.push({ role: "system", content: sysPrompt });
        var hist = aiHist();
        hist.forEach(function (h) { messages.push(h); });
        messages.push({ role: "user", content: prompt });
        tline("", "thinking…" + (hist.length ? " <span class='tk-g'>(remembers " + (hist.length / 2) + " previous exchange" + (hist.length > 2 ? "s" : "") + ")</span>" : ""));
        aiAsk(messages).then(function (txt) {
          var body = termBody.querySelector(".t-line:last-child");
          if (body && body.textContent.indexOf("thinking") === 0) body.remove();
          var reply = String(txt).trim() || "(empty reply)";
          termSay(reply);
          aiHistPush(prompt, reply === "(empty reply)" ? "" : reply);
        }).catch(function (err) {
          var body = termBody.querySelector(".t-line:last-child");
          if (body && body.textContent.indexOf("thinking") === 0) body.remove();
          tline("t-err", "ai unreachable — " + err.message);
        });
      });
    },
    man: function (args) {
      var c = (args[0] || "").toLowerCase();
      if (c === "help") { tline("", "help — list commands. try: help"); return; }
      var docs = {
        ai: "ai &lt;question&gt; — ask Empty-X. Channels, in order: local endpoint (LM Studio etc) → gemini key → free pollinations. " +
           "'ai lmstudio [TOKEN]' points at http://localhost:1234/api/openai/v0 (get the token in LM Studio: Settings → Developer/Core → API access). " +
           "'ai endpoint <url>' for any OpenAI-compatible server · 'ai endpoint token <t>' · 'ai endpoint clear'. " +
           "'ai system <text|show|reset>' tweaks persona (persists). replies type out; close or clear to interrupt",
        nav: "nav &lt;id&gt; — smooth-scroll to a page section (about/history/projects/stack/live/contact)",
        open: "open &lt;target&gt; — open in new tab. targets: github · x · betteraichat · vicinityprobe · nekomimi · googleonyourmac · nusvlite · syna · gomoku",
        copy: "copy &lt;key&gt; — copy to clipboard. keys: gmail · 163 · github · x",
        ip: "ip — your public IP, location and ISP (ipwho.is)",
        repo: "repo &lt;key|owner/name&gt; — GitHub repo stats: stars, forks, language, license, last push",
        note: "note list — show notes · note add &lt;text&gt; — save one · note del &lt;n&gt; — delete · note clear — wipe (stored in this browser)",
        cal: "cal — current month calendar (Beijing time), today highlighted",
        say: "say &lt;text&gt; — Empty-X says it, with cat ears",
        fortune: "fortune — a random wise (or not) quote",
        forget: "forget — wipe Empty-X's conversation memory (last exchanges are remembered across messages)",
        status: "status — live site up/down, latency, aliveness score (refreshed every 15 min)",
        feed: "feed — latest 9 GitHub activities from the bundled snapshot",
        weather: "weather — current conditions in Beijing (open-meteo)",
        alive: "alive — composite aliveness score and last signal times",
        ping: "ping &lt;target&gt; — measure latency. targets: api (api.github.com) · meteo (open-meteo)",
        calc: "calc &lt;expr&gt; — evaluate arithmetic: numbers + - * / ( ) %",
        b64: "b64 e|d &lt;text&gt; — base64 encode/decode (unicode-safe)",
        url: "url e|d &lt;text&gt; — URL-encode/decode",
        json: "json &lt;data&gt; — validate & pretty-print JSON; 'json min &lt;data&gt;' for compact",
        ts: "ts [unix] — current unix time, or convert a timestamp to Beijing time",
        rand: "rand [len] — random hex string (default 16)",
        uuid: "uuid — generate a v4 UUID",
        pass: "pass [len] — generate a strong password (default 20, upper+lower+digit+symbol)",
        search: "search github|web &lt;query&gt; — search GitHub or the web in a new tab",
        alias: "alias — list aliases · alias name=cmd — define · alias -d name — delete",
        ls: "ls — list projects",
        whoami: "whoami — who is this?",
        date: "date — current Beijing time",
        neofetch: "neofetch — system info, the fun way",
        clear: "clear — clear the screen",
        exit: "exit — close this terminal",
        sudo: "sudo — try it",
      };
      if (c === "sudo") { tline("t-err", "nice try. — no frameworks were harmed."); return; }
      if (c && TCMD[c]) { tline("", "<span class='tk-y'>" + termEscape(c) + "</span> — " + (docs[c] || "no man page yet")); return; }
      tline("t-err", "no such command: " + termEscape(c || ""));
    },
    nav: function (args) {
      var id = args[0];
      var el = document.getElementById(id);
      if (!el) { tline("t-err", "unknown section: " + termEscape(id || "") + " — try about|history|projects|stack|live|contact"); return; }
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
      tline("", "jumping to <span class='tk-y'>#" + termEscape(id) + "</span>…");
    },
    open: function (args) {
      var key = (args[0] || "").toLowerCase();
      var repo = REPOS[key];
      if (key === "github") window.open("https://github.com/Verlintas", "_blank");
      else if (key === "x") window.open("https://x.com/Verlintas", "_blank");
      else if (repo) window.open("https://github.com/" + repo, "_blank");
      else { tline("t-err", "unknown target — projects: betteraichat · vicinityprobe · nekomimi · googleonyourmac · nusvlite · syna · gomoku"); return; }
      tline("", "opening <span class='tk-y'>" + termEscape(key) + "</span> in a new tab");
    },
    copy: function (args) {
      var map = { gmail: "ulv777777@gmail.com", "163": "12321666@163.com", github: "https://github.com/Verlintas", x: "https://x.com/Verlintas" };
      var val = map[(args[0] || "").toLowerCase()];
      if (!val) { tline("t-err", "copy what? — gmail|163|github|x"); return; }
      if (!navigator.clipboard) { tline("t-err", "clipboard unavailable"); return; }
      navigator.clipboard.writeText(val).then(function () {
        tline("", "copied <span class='tk-y'>" + termEscape(val) + "</span> to clipboard");
      }, function () { tline("t-err", "clipboard denied"); });
    },
    status: function () {
      tline("", "probing status.json…");
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var out = (st.sites || []).map(function (s) {
            return (s.up ? "<span class='tk-c'>●</span>" : "<span class='tk-c' style='opacity:.4'>●</span>") +
              " " + termEscape(s.name) + (s.up ? (s.ms != null ? " · " + s.ms + "ms" : " · up") : " · down");
          });
          if (st.alive) out.push("<span class='tk-y'>alive:</span> " + st.alive.score);
          if (st.x) out.push("<span class='tk-y'>x:</span> " + (st.x.followers != null ? st.x.followers + " followers" : "n/a"));
          out.push("<span class='tk-g'>generated " + (st.generated || "?") + " (updates every 15 min)</span>");
          tline("", out.join("\n"));
        }, function () { tline("t-err", "status unavailable"); });
    },
    feed: function () {
      tline("", "fetching recent activity…");
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var acts = (st.activity || []).slice(0, 9);
          if (!acts.length) { tline("", "no public activity"); return; }
          var out = acts.map(function (a) {
            var n = (a.repo && a.repo.name) || "?";
            var t = String(a.type || "").toLowerCase().replace("event", "");
            return "<span class='tk-y'>" + termEscape(t) + "</span> " + termEscape(n) + " <span class='tk-g'>" + termEscape(String(a.created_at || "").slice(0, 16)) + "</span>";
          });
          tline("", out.join("\n"));
        }, function () { tline("t-err", "feed unavailable"); });
    },
    alive: function () {
      fetch("status.json?_=" + Date.now())
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (st) {
          var a = st.alive || {};
          var bits = [];
          if (a.last_push) bits.push("last push " + a.last_push.replace("T", " ").slice(0, 16) + "Z");
          if (a.last_x_post) bits.push("last x post " + a.last_x_post.replace("T", " ").slice(0, 16) + "Z");
          tline("", "composite aliveness: <span class='tk-y'>" + a.score + "</span>" + (bits.length ? " — " + bits.join(", ") : " — no recent signals"));
        }, function () { tline("t-err", "unavailable"); });
    },
    weather: function () {
      tline("", "fetching Beijing weather…");
      fetch("https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FShanghai")
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          var c = d.current || {};
          tline("", [
            "beijing: <span class='tk-y'>" + (c.temperature_2m != null ? c.temperature_2m + "°C" : "?") + "</span>, " + wmo(c.weather_code),
            "humidity " + (c.relative_humidity_2m != null ? c.relative_humidity_2m + "%" : "?") +
              " · wind " + (c.wind_speed_10m != null ? c.wind_speed_10m + " km/h" : "?") +
              " <span class='tk-g'>(" + (d.current && d.current.time ? d.current.time.replace("T", " ").slice(0, 16) : "") + ")</span>",
          ].join("\n"));
        }, function () { tline("t-err", "weather service unreachable"); });
    },
    calc: function (args) {
      var expr = args.join(" ");
      if (!/^[0-9+\-*/().%\s]+$/.test(expr)) { tline("t-err", "only numbers and + - * / ( ) % allowed"); return; }
      try {
        var val = Function('"use strict";return (' + expr + ")")();
        tline("", expr + " = <span class='tk-y'>" + val + "</span>");
      } catch (err) { tline("t-err", "invalid expression"); }
    },
    b64: function (args) {
      var mode = (args[0] || "").toLowerCase();
      var text = args.slice(1).join(" ");
      if (mode === "e") { tline("", btoa(unescape(encodeURIComponent(text)))); }
      else if (mode === "d") {
        try { tline("", decodeURIComponent(escape(atob(text)))); }
        catch (err) { tline("t-err", "invalid base64"); }
      } else { tline("t-err", "usage: b64 e|d &lt;text&gt;"); }
    },
    ts: function (args) {
      if (!args.length) { tline("", Math.floor(Date.now() / 1000) + " (now)"); return; }
      var raw = args[0];
      if (raw === "now") { tline("", Math.floor(Date.now() / 1000) + " (now)"); return; }
      var n = Number(raw);
      if (isNaN(n)) { tline("t-err", "not a unix timestamp"); return; }
      var ms = String(raw).length >= 13 ? n : n * 1000;
      tline("", raw + " → " + new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Shanghai" }) + " Beijing");
    },
    ls: function () {
      tline("", [
        "<span class='tk-w'>BetterAIChat</span>   <span class='tk-g'>android ai agent</span>",
        "<span class='tk-w'>VicinityProbe</span>  <span class='tk-g'>security toolkit</span>",
        "<span class='tk-w'>nekomimi</span>       <span class='tk-g'>text rewriter</span>",
        "<span class='tk-w'>GoogleOnYourMac</span> <span class='tk-g'>macOS wrappers</span>",
        "<span class='tk-w'>NUSV-lite</span>      <span class='tk-g'>org client</span>",
        "<span class='tk-w'>Syna-NUSV</span>      <span class='tk-g'>e2e messenger</span>",
        "<span class='tk-w'>Gomoku-NUSV</span>    <span class='tk-g'>cross-platform game</span>",
      ].join("\n"));
    },
    whoami: function () {
      tline("", "<span class='tk-w'>Verlintas</span> — the mainly developer in ULV / USV. born 2010, still just for fun.");
    },
    date: function () {
      tline("", new Date().toLocaleString("en-GB", { timeZone: "Asia/Shanghai" }) + " Beijing time");
    },
    neofetch: function () {
      tline("", [
        "      <span class='tk-c'>◆</span>      <span class='tk-w'>verlintas@web</span>",
        "     <span class='tk-c'>◆ ◆</span>     <span class='tk-g'>─────────────</span>",
        "    <span class='tk-c'>◆ ◆ ◆</span>    <span class='tk-g'>OS:</span> verlintas.github.io",
        "     <span class='tk-c'>◆ ◆</span>     <span class='tk-g'>Shell:</span> just for fun",
        "      <span class='tk-c'>◆</span>      <span class='tk-g'>Uptime:</span> since 2010",
        "               <span class='tk-g'>Locale:</span> zh-CN / en-US",
        "               <span class='tk-g'>Status:</span> alive &amp; shipping",
      ].join("\n"));
    },
    github: function () { tline("", "<a style='color:#ff9d9d' href='https://github.com/Verlintas' target='_blank' rel='noopener'>github.com/Verlintas</a>"); },
    x: function () { tline("", "<a style='color:#ff9d9d' href='https://x.com/Verlintas' target='_blank' rel='noopener'>x.com/Verlintas</a>"); },
    email: function () { tline("", "ulv777777@gmail.com · 12321666@163.com"); },
    ip: function () {
      fetch("https://ipwho.is/")
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          if (!d || !d.success) throw new Error("no data");
          var line = "<span class='tk-y'>" + termEscape(d.ip || "?") + "</span>" +
            (d.type ? " (" + d.type + ")" : "") +
            " — " + termEscape(d.city ? d.city + ", " : "") + termEscape(d.country || "") +
            (d.connection && d.connection.isp ? " · " + termEscape(d.connection.isp) : "");
          tline("", line);
        }, function () { tline("t-err", "ip lookup unreachable"); });
    },
    repo: function (args) {
      var name = (args[0] || "").toLowerCase();
      var full = REPOS[name] || name;
      if (!full || full.indexOf("/") === -1) { tline("t-err", "usage: repo <key|owner/name> — keys: " + Object.keys(REPOS).join(" · ")); return; }
      fetch("https://api.github.com/repos/" + full)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          tline("", [
            "<span class='tk-y'>" + termEscape(d.full_name) + "</span>  " + termEscape(String(d.description || "").slice(0, 90)),
            (d.stargazers_count != null ? "★ " + d.stargazers_count + "  " : "") +
              (d.forks_count != null ? "⑂ " + d.forks_count + "  " : "") +
              "<span class='tk-g'>" + termEscape(d.language || "?") + " · " + termEscape((d.license && d.license.spdx_id) || "no license") + "</span>",
            "<span class='tk-g'>last push " + termEscape(String(d.pushed_at || "").replace("T", " ").slice(0, 16)) + "</span>",
          ].join("\n"));
        }, function () { tline("t-err", "repo lookup failed — api.github.com unreachable or not found"); });
    },
    note: function (args) {
      var act = (args[0] || "").toLowerCase();
      var notes = [];
      try { notes = JSON.parse(localStorage.getItem("vweb:notes") || "[]"); } catch (e) {}
      function save() { try { localStorage.setItem("vweb:notes", JSON.stringify(notes)); } catch (e) {} }
      if (!act || act === "list") {
        if (!notes.length) { tline("", "no notes — 'note add <text>' to write one"); return; }
        tline("", notes.map(function (n, i) {
          var d = new Date(n.t);
          return "<span class='tk-y'>" + (i + 1) + "</span> <span class='tk-g'>[" + d.toLocaleDateString("en-GB") + "]</span> " + termEscape(n.text);
        }).join("\n"));
        return;
      }
      if (act === "add") {
        var text = args.slice(1).join(" ").trim();
        if (!text) { tline("t-err", "usage: note add <text>"); return; }
        notes.push({ t: Date.now(), text: text });
        save();
        tline("", "note #" + notes.length + " saved");
        return;
      }
      if (act === "del") {
        var idx = parseInt(args[1], 10) - 1;
        if (isNaN(idx) || !notes[idx]) { tline("t-err", "note del <number>"); return; }
        var removed = notes.splice(idx, 1);
        save();
        tline("", "deleted: " + termEscape(removed[0].text.slice(0, 60)));
        return;
      }
      if (act === "clear") {
        notes = [];
        save();
        tline("", "all notes cleared");
        return;
      }
      tline("t-err", "usage: note list|add <text>|del <n>|clear");
    },
    cal: function () {
      var now = new Date();
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var y = +map.year, mo = +map.month, today = +map.day;
      var first = new Date(Date.UTC(y, mo - 1, 1));
      var daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      var lead = first.getUTCDay();
      var lines = [];
      lines.push("<span class='tk-y'>" + y + "-" + ("0" + mo).slice(-2) + "</span>");
      lines.push("Su Mo Tu We Th Fr Sa");
      var row = "";
      for (var i = 0; i < lead; i++) row += "   ";
      for (var d = 1; d <= daysInMonth; d++) {
        var cell = (" " + d).slice(-2);
        row += (d === today ? "<span class='tk-y'>" + cell + "</span>" : cell) + " ";
        if ((lead + d) % 7 === 0) { lines.push(row); row = ""; }
      }
      if (row.trim()) lines.push(row);
      lines.push("<span class='tk-g'>today highlighted · Beijing time</span>");
      tline("", lines.join("\n"));
    },
    say: function (args) {
      var text = args.join(" ").trim() || "喵。";
      var width = 30;
      var out = [];
      var cur = "";
      Array.prototype.forEach.call(text, function (ch) {
        var w = ch.charCodeAt(0) > 255 ? 2 : 1;
        var curW = 0;
        for (var k = 0; k < cur.length; k++) curW += cur.charCodeAt(k) > 255 ? 2 : 1;
        if (curW + w > width && cur) { out.push(cur); cur = ch; }
        else cur += ch;
      });
      if (cur) out.push(cur);
      var border = "─".repeat(width + 2);
      var lines = ["╭" + border + "╮"];
      out.forEach(function (l) {
        var lw = 0;
        for (var k = 0; k < l.length; k++) lw += l.charCodeAt(k) > 255 ? 2 : 1;
        lines.push("│ " + l + " ".repeat(width - lw) + " │");
      });
      lines.push("╰" + border + "╯");
      lines.push("");
      lines.push("  /\\_/\\");
      lines.push(" ( o.o )  < " + termEscape(out[0] || "") + "…");
      lines.push("  > ^ <");
      tline("", lines.join("\n"));
    },
    fortune: function () {
      var quotes = [
        "The best way to predict the future is to ship it.",
        "Kotlin 不会报错，它只是给你更多报错。",
        "It compiles on my machine — and only there.",
        "2 AM rule: if it works at 2 AM, it ships at 2 AM.",
        "Bugs are not features… unless you name them features.",
        "删库跑路之前，先 git push。",
        "The cloud is just someone else's Windows Server 2016.",
        "My code has no bugs — it just develops unexpected features.",
        "Just for fun. — Linus",
        "猫娘三定律：不油腻、不掉线、不写 bug（第三条很难）。",
        "A PR a day keeps the reviewer away.",
        "If it ain't broken, git blame it anyway.",
        "Testing is when you hold your breath and press build.",
        "There are only two hard problems: caching, naming, and off-by-one.",
      ];
      tline("", "<span class='tk-g'>" + termEscape(quotes[Math.floor(Math.random() * quotes.length)]) + "</span>");
    },
    forget: function () {
      aiHistClear();
      tline("", "Empty-X forgot everything — fresh start 喵");
    },
    clear: function () { stopSay(); termBody.innerHTML = ""; },
    exit: function () { closeTerm(); },
    sudo: function () { tline("t-err", "nice try. — no frameworks were harmed."); },
    rand: function (args) {
      var len = Math.min(parseInt(args[0], 10) || 16, 128);
      var bytes = new Uint8Array(Math.ceil(len / 2));
      crypto.getRandomValues(bytes);
      var hex = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      tline("", hex.slice(0, len));
    },
    uuid: function () {
      if (crypto.randomUUID) { tline("", crypto.randomUUID()); return; }
      var b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      tline("", h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20));
    },
    pass: function (args) {
      var len = Math.min(parseInt(args[0], 10) || 20, 64);
      var sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];
      var all = sets.join("");
      var out = [];
      function pick(s) { return s[Math.floor(Math.random() * s.length)]; }
      sets.forEach(function (s) { out.push(pick(s)); });
      for (var i = out.length; i < len; i++) out.push(pick(all));
      for (var j = out.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = out[j]; out[j] = out[k]; out[k] = t;
      }
      tline("", out.join(""));
    },
    json: function (args) {
      var isMin = args[0] === "min";
      var text = args.slice(isMin ? 1 : 0).join(" ");
      if (!text) { tline("t-err", "usage: json &lt;data&gt; (or 'json min &lt;data&gt;')"); return; }
      try {
        var parsed = JSON.parse(text);
        tline("", JSON.stringify(parsed, null, isMin ? 0 : 2));
      } catch (err) {
        tline("t-err", "invalid JSON — " + err.message);
      }
    },
    ping: function (args) {
      var targets = {
        api: "https://api.github.com",
        meteo: "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m",
      };
      var name = (args[0] || "").toLowerCase();
      var url = targets[name];
      if (!url) { tline("t-err", "targets: api · meteo"); return; }
      var t0 = performance.now();
      fetch(url).then(function (r) {
        var ms = Math.round(performance.now() - t0);
        tline("", "ping " + termEscape(name) + " → <span class='tk-y'>" + ms + "ms</span> (http " + r.status + ")");
      }, function () {
        var ms = Math.round(performance.now() - t0);
        tline("t-err", "ping " + termEscape(name) + " → unreachable (" + ms + "ms)");
      });
    },
    url: function (args) {
      var mode = (args[0] || "").toLowerCase();
      var text = args.slice(1).join(" ");
      if (mode === "e") tline("", encodeURIComponent(text));
      else if (mode === "d") { try { tline("", decodeURIComponent(text)); } catch (err) { tline("t-err", "invalid percent-encoding"); } }
      else tline("t-err", "usage: url e|d &lt;text&gt;");
    },
    search: function (args) {
      var engine = (args[0] || "").toLowerCase();
      var q = args.slice(1).join(" ");
      if (!q) { tline("t-err", "usage: search github|web &lt;query&gt;"); return; }
      if (engine === "github") window.open("https://github.com/search?q=" + encodeURIComponent(q) + "&type=repositories", "_blank");
      else if (engine === "web") window.open("https://www.bing.com/search?q=" + encodeURIComponent(q), "_blank");
      else { tline("t-err", "engines: github · web"); return; }
      tline("", "searching <span class='tk-y'>" + termEscape(engine) + "</span> for " + termEscape(q));
    },
    alias: function (args) {
      if (!args.length) {
        var keys = Object.keys(aliasMap);
        if (!keys.length) { tline("", "no aliases — define one: <span class='tk-y'>alias gh=open github</span>"); return; }
        tline("", keys.map(function (k) { return "<span class='tk-y'>" + termEscape(k) + "</span> → " + termEscape(aliasMap[k]); }).join("\n"));
        return;
      }
      var a = args.join(" ");
      if (a.indexOf("=") === -1 && args[0] === "-d") {
        var del = args[1];
        if (!del || !aliasMap[del]) { tline("t-err", "no such alias: " + termEscape(del || "")); return; }
        delete aliasMap[del];
        saveAlias();
        tline("", "alias removed: " + termEscape(del));
        return;
      }
      var eq = a.indexOf("=");
      if (eq === -1) { tline("t-err", "usage: alias name=command | alias -d name"); return; }
      var name = a.slice(0, eq).trim();
      var val = a.slice(eq + 1).trim();
      if (!name || !val) { tline("t-err", "usage: alias name=command"); return; }
      aliasMap[name] = val;
      saveAlias();
      tline("", "alias set: <span class='tk-y'>" + termEscape(name) + "</span> → " + termEscape(val));
    },
  };
  function expandAlias(parts) {
    var guard = 0;
    var p = parts.slice();
    while (p.length && aliasMap[p[0]] && guard++ < 3) {
      p = (aliasMap[p[0]] + " " + p.slice(1).join(" ")).trim().split(/\s+/);
    }
    return p;
  }
  termForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = termInput.value.trim();
    var parts = expandAlias(raw.split(/\s+/));
    var cmd = (parts[0] || "").toLowerCase();
    tline("", "<span class='t-prompt'>verlintas@web:~$</span> " + termEscape(raw));
    if (raw && termHist[termHist.length - 1] !== raw) {
      termHist.push(raw);
      saveHist();
    }
    termHistIdx = termHist.length;
    if (!cmd) { termInput.value = ""; return; }
    if (cmd === "sudo" && parts[1] === "rm" && parts[2] === "-rf") { TCMD.sudo(); }
    else if (TCMD[cmd]) TCMD[cmd](parts.slice(1));
    else tline("t-err", "command not found: " + termEscape(cmd) + " — type 'help'");
    termInput.value = "";
    termBody.scrollTop = termBody.scrollHeight;
  });
  function allNames() {
    var names = Object.keys(TCMD).concat(Object.keys(aliasMap));
    names.push("help");
    return names;
  }
  termInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (termHistIdx > 0) { termHistIdx--; termInput.value = termHist[termHistIdx]; }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (termHistIdx < termHist.length - 1) { termHistIdx++; termInput.value = termHist[termHistIdx]; }
      else { termHistIdx = termHist.length; termInput.value = ""; }
    } else if (e.key === "Tab") {
      e.preventDefault();
      var token = termInput.value.split(/\s+/).pop() || "";
      var matches = allNames().filter(function (n) { return n.indexOf(token.toLowerCase()) === 0; });
      if (matches.length === 1) {
        termInput.value = termInput.value.slice(0, termInput.value.length - token.length) + matches[0] + " ";
      } else if (matches.length > 1) {
        tline("", "<span class='tk-g'>" + matches.sort().join("  ") + "</span>");
        termBody.scrollTop = termBody.scrollHeight;
      }
    }
  });
  termClose.addEventListener("click", closeTerm);
  document.getElementById("termToggle").addEventListener("click", function () {
    if (term.hidden) openTerm(); else closeTerm();
  });
  term.addEventListener("click", function () { termInput.focus(); });
  document.addEventListener("keydown", function (e) {
    var isBackquote = e.key === "`" || e.key === "~" || e.keyCode === 192;
    if (isBackquote && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (term.hidden) openTerm(); else closeTerm();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "`" || e.keyCode === 192)) {
      e.preventDefault();
      if (term.hidden) openTerm(); else closeTerm();
    }
    if (e.key === "Escape" && !term.hidden) closeTerm();
  });

  /* reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* 3D tilt + red tint on project cards */
  var cards = document.querySelectorAll(".proj-card");
  cards.forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        "perspective(900px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg) translateY(-2px)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });

  /* stack chips: brand-color glow on hover (linked only) */
  var stackItems = document.querySelectorAll(".stack-item");
  stackItems.forEach(function (item) {
    if (item.classList.contains("stack-no")) return;
    var color = item.dataset.c || "#ff0000";
    item.addEventListener("mouseenter", function () {
      item.style.borderColor = color;
      item.style.color = "#fff";
      item.style.boxShadow = "0 0 22px -4px " + color + "88";
    });
    item.addEventListener("mouseleave", function () {
      item.style.borderColor = "";
      item.style.color = "";
      item.style.boxShadow = "";
    });
  });

  /* smooth-scroll offset for fixed nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
      try { history.replaceState(null, "", a.getAttribute("href")); } catch (err) {}
    });
  });

  /* git clone — click to copy */
  var cloneEls = document.querySelectorAll(".clone-line");
  cloneEls.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var url = "https://github.com/" + el.dataset.repo + ".git";
      function done() {
        el.classList.add("copied");
        el.textContent = "copied — git clone " + url;
        setTimeout(function () {
          el.classList.remove("copied");
          el.textContent = "$ git clone https://github.com/" + el.dataset.repo + ".git";
        }, 1600);
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText("git clone " + url).then(done, function () {});
      }
    });
  });

  /* j/k section navigation (vim style) */
  var NAV_IDS = ["about", "history", "projects", "stack", "live", "contact"];
  function currentSectionIdx() {
    var y = window.scrollY + window.innerHeight / 2;
    var best = 0, bestGap = Infinity;
    NAV_IDS.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      var gap = Math.abs(el.getBoundingClientRect().top + window.scrollY - 64 - y);
      if (gap < bestGap) { bestGap = gap; best = i; }
    });
    return best;
  }
  function gotoIdx(i) {
    if (i < 0 || i >= NAV_IDS.length) return;
    var el = document.getElementById(NAV_IDS[i]);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
    try { history.replaceState(null, "", "#" + NAV_IDS[i]); } catch (err) {}
  }
  document.addEventListener("keydown", function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== "j" && e.key !== "J" && e.key !== "k" && e.key !== "K") return;
    var idx = currentSectionIdx();
    if (e.key === "j" || e.key === "J") gotoIdx(idx + 1);
    else gotoIdx(idx - 1);
  });

  /* nav dims on scroll + progress bar + to-top */
  var nav = document.querySelector(".nav");
  var progress = document.getElementById("scrollProgress");
  var toTop = document.getElementById("toTop");
  var ticking = false;
  function onScroll() {
    nav.style.background =
      window.scrollY > 40
        ? "rgba(5,5,5,0.9)"
        : "linear-gradient(to bottom, rgba(5,5,5,0.85), transparent)";
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    if (window.scrollY > 480) toTop.classList.add("show");
    else toTop.classList.remove("show");
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ═══ Beijing live clock ═══ */
  var fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });
  var timeEl = document.getElementById("clockTime");
  var dateEl = document.getElementById("clockDate");
  function tick() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var h = (map.hour === "24" ? "00" : map.hour);
    timeEl.innerHTML =
      "<span>" + h + "</span><span class='clock-dot'>:</span><span>" +
      map.minute + "</span><span class='clock-dot'>:</span><span class='secs'>" +
      map.second + "</span>";
    dateEl.textContent = fmt.format(new Date()) + " · Beijing";
  }
  tick();
  setInterval(tick, 1000);
  check2am();
  setInterval(check2am, 30000);

  /* ═══ GitHub live activity feed ═══ */
  var feedList = document.getElementById("feedList");
  var feedEmpty = document.getElementById("feedEmpty");
  var repoBase = "https://github.com/";
  function relTime(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(s) || s < 0) return "—";
    s = Math.max(0, s);
    if (s < 120) return Math.floor(s) + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function describe(ev) {
    var repo = (ev.repo && ev.repo.name) || "";
    var short = repo.replace(/^Verlintas\//, "");
    var rlink = "<a href='" + repoBase + repo + "' target='_blank' rel='noopener'>" + short + "</a>";
    var ico;
    switch (ev.type) {
      case "PushEvent":
        var n = (ev.payload && ev.payload.size) || 1;
        var branch = ev.payload && ev.payload.ref ? ev.payload.ref.replace("refs/heads/", "") : "";
        ico = "PUSH";
        return { ico: ico, repo: repo, msg: "pushed <b>" + n + "</b> commit" + (n > 1 ? "s" : "") + " to " + rlink + (branch ? " <span>(" + branch + ")</span>" : ""), url: repoBase + repo + "/commits" };
      case "CreateEvent":
        ico = "NEW";
        return { ico: ico, repo: repo, msg: "created " + (ev.payload.ref_type || "ref") + (ev.payload.ref ? " <b>" + ev.payload.ref + "</b>" : "") + " in " + rlink };
      case "WatchEvent":
        ico = "STAR";
        return { ico: ico, repo: repo, msg: "starred " + rlink };
      case "ForkEvent":
        ico = "FORK";
        return { ico: ico, repo: repo, msg: "forked " + rlink };
      case "IssueEvent":
        ico = "ISSUE";
        return { ico: ico, repo: repo, msg: (ev.payload.action || "acted") + " issue in " + rlink };
      case "PullRequestEvent":
        ico = "PR";
        return { ico: ico, repo: repo, msg: (ev.payload.action || "acted") + " PR in " + rlink };
      case "ReleaseEvent":
        ico = "REL";
        return { ico: ico, repo: repo, msg: "released " + rlink };
      case "PublicEvent":
        ico = "NEW";
        return { ico: ico, repo: repo, msg: "open-sourced <b>" + repo + "</b>" };
      default:
        ico = ev.type ? ev.type.toUpperCase().slice(0, 4) : "EV";
        return { ico: ico, repo: repo, msg: (ev.type || "activity").toLowerCase().replace("event", "") + " on " + rlink };
    }
  }
  function renderActivity(events) {
    if (!events) return false;
    feedList.querySelectorAll(".feed-item").forEach(function (li) { li.remove(); });
    feedEmpty.style.display = "none";
    var items = [];
    events.forEach(function (ev) {
      var d = describe(ev);
      if (!d) items.push(null);
      else items.push({ d: d, at: ev.created_at });
    });
    items.sort(function (a, b) {
      if (!a) return 1;
      if (!b) return -1;
      return new Date(b.at) - new Date(a.at);
    });
    var merged = [];
    items.forEach(function (it, i) {
      if (!it) return;
      var prev = merged[merged.length - 1];
      if (prev && prev.d.repo && it.d.repo && prev.d.repo === it.d.repo && prev.d.ico === "PUSH" && it.d.ico === "PUSH") {
        var pb = prev.d.msg.match(/pushed <b>(\d+)<\/b>/);
        var cb = it.d.msg.match(/pushed <b>(\d+)<\/b>/);
        var total = (pb ? +pb[1] : 1) + (cb ? +cb[1] : 1);
        prev.d.msg = prev.d.msg.replace(/pushed <b>\d+<\/b> commit(s)?/, "pushed <b>" + total + "</b> commits");
      } else {
        merged.push({ d: it.d, at: it.at });
      }
    });
    if (!merged.length) {
      feedEmpty.textContent = "no public activity yet";
      feedEmpty.style.display = "list-item";
      return true;
    }
    merged.slice(0, 9).forEach(function (item) {
      var li = document.createElement("li");
      li.className = "feed-item";
      li.title = new Date(item.at).toLocaleString();
      var ico = document.createElement("span");
      ico.className = "feed-ico";
      ico.textContent = item.d.ico;
      var msg = document.createElement("span");
      msg.className = "feed-msg";
      msg.innerHTML = item.d.msg;
      var when = document.createElement("span");
      when.className = "feed-when";
      when.textContent = relTime(item.at);
      li.appendChild(ico); li.appendChild(msg); li.appendChild(when);
      feedList.appendChild(li);
    });
    return true;
  }

  var feedBackoffUntil = 0;
  function loadFeed() {
    if (Date.now() < feedBackoffUntil) return;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    fetch("https://api.github.com/users/Verlintas/events/public?per_page=100&_=" + Date.now(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(function (events) {
        if (renderActivity(events)) feedBackoffUntil = 0;
      })
      .catch(function () {
        /* fallback: read the activity snapshot bundled in status.json */
        feedBackoffUntil = Date.now() + 5 * 60 * 1000;
        fetch("status.json?_=" + Date.now())
          .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function (st) {
            var hasOld = !!feedList.querySelector(".feed-item");
            if (!st.activity || !renderActivity(st.activity)) {
              if (!hasOld) {
                feedEmpty.textContent = "activity unavailable — will retry";
                feedEmpty.style.display = "list-item";
              }
            }
          })
          .catch(function () {
            if (!feedList.querySelector(".feed-item")) {
              feedEmpty.textContent = "activity unavailable — will retry";
              feedEmpty.style.display = "list-item";
            }
          });
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  /* ═══ service status (from status.json, generated by GitHub Actions) ═══ */
  var statusList = document.getElementById("statusList");
  var statusEmpty = document.getElementById("statusEmpty");
  var aliveNum = document.getElementById("aliveNum");
  var aliveSub = document.getElementById("aliveSub");
  function statusRow(cls, nameHtml, stateHtml) {
    var li = document.createElement("li");
    li.className = "status-item";
    var dot = document.createElement("span");
    dot.className = "s-dot " + cls;
    var name = document.createElement("span");
    name.className = "s-name";
    name.innerHTML = nameHtml;
    var state = document.createElement("span");
    state.className = "s-state";
    state.textContent = stateHtml;
    li.appendChild(dot); li.appendChild(name); li.appendChild(state);
    return li;
  }
  function loadStatus() {
    fetch("status.json?_=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (st) {
        statusList.querySelectorAll(".status-item:not(#statusEmpty)").forEach(function (li) { li.remove(); });
        statusEmpty.style.display = "none";
        if (st.alive && st.alive.score != null) {
          aliveNum.textContent = st.alive.score;
          var bits = [];
          if (st.alive.last_push) bits.push("push " + relTime(st.alive.last_push));
          if (st.alive.last_x_post) bits.push("post " + relTime(st.alive.last_x_post));
          aliveSub.textContent = bits.length ? bits.join(" · ") : "no recent signals";
          aliveNum.style.color = st.alive.score > 0 ? "" : "#ff3b3b";
        }
        (st.sites || []).forEach(function (s) {
          var cls = s.up ? "s-up" : "s-down";
          var state = s.up ? (s.ms != null ? "up · " + s.ms + "ms" : "up") : "down";
          statusList.appendChild(statusRow(cls, "<a href='" + s.url + "' target='_blank' rel='noopener'>" + s.name + "</a>", state));
        });
        if (st.x) {
          if (st.x.ok) {
            var xState = st.x.last_post
              ? "post " + relTime(st.x.last_post)
              : (st.x.followers != null ? st.x.followers + " followers" : "up");
            statusList.appendChild(statusRow("s-up", "X / @Verlintas", xState));
          } else {
            statusList.appendChild(statusRow("s-unknown", "X / @Verlintas", "profile unreachable"));
          }
        }
        if (Date.now() < feedBackoffUntil && st.activity && renderActivity(st.activity)) {
          /* during backoff, keep the feed fresh from the bundled snapshot */
        }
      })
      .catch(function () {
        if (!statusList.querySelector(".status-item:not(#statusEmpty)")) {
          statusEmpty.textContent = "status unavailable — auto-retrying";
          statusEmpty.style.display = "list-item";
        }
      });
  }
  loadFeed();
  loadStatus();
  setInterval(function () {
    if (!document.hidden) loadFeed();
  }, 120000);
  setInterval(function () {
    if (!document.hidden) loadStatus();
  }, 60000);
  window.addEventListener("focus", function () { loadFeed(); loadStatus(); });

  /* ═══ click diamond particle burst + name-triggered diamond rain ═══ */
  var canvas = document.getElementById("fx");
  var ctx = canvas.getContext("2d");
  var parts = [];
  var drawing = false;
  var rainUntil = 0;
  function sizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  function spawn(x, y, vx, vy, size, vr, decay, color) {
    parts.push({
      x: x, y: y, vx: vx, vy: vy,
      size: size, rot: Math.random() * Math.PI, vr: vr,
      life: 1, decay: decay, color: color,
    });
  }
  function burst(x, y) {
    var n = 10 + Math.floor(Math.random() * 8);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1.5 + Math.random() * 4.5;
      var reds = ["255,0,0", "255,60,60", "255,255,255", "255,120,120"];
      spawn(
        x, y,
        Math.cos(a) * v, Math.sin(a) * v - 1.2,
        3 + Math.random() * 5,
        (Math.random() - 0.5) * 0.35,
        0.018 + Math.random() * 0.02,
        reds[Math.floor(Math.random() * reds.length)]
      );
    }
    if (!drawing) { drawing = true; requestAnimationFrame(drawParts); }
  }
  function rainTick() {
    for (var i = 0; i < 2; i++) {
      var reds = ["255,0,0", "255,40,40", "255,255,255"];
      spawn(
        Math.random() * canvas.width, -18 - Math.random() * 40,
        (Math.random() - 0.5) * 1.4, 2.4 + Math.random() * 3.4,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 0.4,
        0.0035 + Math.random() * 0.004,
        reds[Math.floor(Math.random() * reds.length)]
      );
    }
  }
  function drawParts() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Date.now() < rainUntil) rainTick();
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= p.decay;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = "rgba(" + p.color + ")";
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    if (parts.length || Date.now() < rainUntil) {
      requestAnimationFrame(drawParts);
    } else {
      drawing = false;
    }
  }
  document.addEventListener("pointerdown", function (e) {
    burst(e.clientX, e.clientY);
  });
  var nameEl = document.getElementById("heroName");
  var nameClicks = 0;
  var lastNameClick = 0;
  var heroRaf = false;
  window.addEventListener("pointermove", function (e) {
    if (heroRaf || !nameEl || !window.matchMedia("(pointer: fine)").matches) return;
    heroRaf = true;
    requestAnimationFrame(function () {
      heroRaf = false;
      var dx = (e.clientX / window.innerWidth - 0.5);
      var dy = (e.clientY / window.innerHeight - 0.5);
      nameEl.style.transform = "translate(" + (dx * 5).toFixed(2) + "px, " + (dy * 4).toFixed(2) + "px)";
    });
  });
  var origTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.title = "come back 喵~";
    else document.title = origTitle;
  });
  if (nameEl) {
    nameEl.addEventListener("click", function () {
      var now = Date.now();
      nameClicks = (now - lastNameClick < 550) ? nameClicks + 1 : 1;
      lastNameClick = now;
      if (nameClicks >= 3) {
        nameClicks = 0;
        rainUntil = now + 3000;
        nameEl.style.textShadow = "0 0 40px rgba(255,0,0,0.95), 0 0 120px rgba(255,0,0,0.6)";
        setTimeout(function () { nameEl.style.textShadow = ""; }, 3100);
        if (!drawing) { drawing = true; requestAnimationFrame(drawParts); }
      }
    });
  }

  /* AI availability for the nlu-lib continuation layer */
  window.__emptyxAI = {
    hasLocal: function () { return !!aiEnd(); },
    hasKey: function () { return !!aiKey(); },
  };
})();
