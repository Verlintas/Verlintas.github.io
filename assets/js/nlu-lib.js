/* ══════════════════════════════════════════════════════════════
   nlu-lib.js — programmable knowledge engine for Empty-X
   Scale trick: intent coverage is NOT hand-written line by line.
   It comes from (a) large datasets fetched once & cached,
   (b) generator functions valid for ANY input, (c) template×pool
   products that produce thousands of distinct replies.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function P(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickWeighted(pairs) {
    var total = 0;
    pairs.forEach(function (p) { total += p.w; });
    var r = Math.random() * total;
    for (var i = 0; i < pairs.length; i++) { r -= pairs[i].w; if (r <= 0) return pairs[i].v; }
    return pairs[pairs.length - 1].v;
  }

  /* ---------- deterministic generators (valid for ANY n) ---------- */
  function isPrime(n) {
    n = Math.abs(n | 0);
    if (n < 2) return false;
    for (var i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }
  function factorize(n) {
    var out = [];
    var m = Math.abs(n | 0);
    for (var p = 2; p * p <= m; p++) while (m % p === 0) { out.push(p); m /= p; }
    if (m > 1) out.push(m);
    return out;
  }
  function divisors(n) {
    var out = [];
    var m = Math.abs(n | 0);
    for (var d = 1; d * d <= m; d++) if (m % d === 0) { out.push(d); if (d * d !== m) out.push(m / d); }
    return out.sort(function (a, b) { return a - b; });
  }
  function toRoman(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0 || n > 3999) return null;
    var table = [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
      [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
      [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
    ];
    var out = "";
    for (var i = 0; i < table.length; i++) while (n >= table[i][0]) { out += table[i][1]; n -= table[i][0]; }
    return out;
  }
  function weekdayOf(y, m, d) {
    var dt = new Date(y, m - 1, d);
    if (isNaN(dt)) return null;
    return dt.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Shanghai" });
  }
  function weekdayCN(dt) {
    var w = dt.getDay();
    return ["日", "一", "二", "三", "四", "五", "六"][w];
  }
  function constellation(mo, day) {
    if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
    var signs = [
      [1, 20, "水瓶座"], [2, 19, "双鱼座"], [3, 21, "白羊座"], [4, 20, "金牛座"],
      [5, 21, "双子座"], [6, 22, "巨蟹座"], [7, 23, "狮子座"], [8, 23, "处女座"],
      [9, 23, "天秤座"], [10, 24, "天蝎座"], [11, 23, "射手座"], [12, 22, "摩羯座"],
    ];
    for (var i = 0; i < 12; i++) {
      var nxt = signs[(i + 1) % 12];
      var thisM = signs[i][0], thisD = signs[i][1];
      if ((mo === thisM && day >= thisD) || (mo === nxt[0] && day < nxt[1])) return signs[i][2];
    }
    return signs[11][2];
  }
  function zodiacYear(y) {
    var list = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    return list[((y - 4) % 12 + 12) % 12];
  }
  function hex2str(str) { return Array.prototype.map.call(unescape(encodeURIComponent(str)), function (c) { return c.charCodeAt(0).toString(16).toUpperCase(); }).join(" "); }
  function countCJK(str) { return (str.match(/[\u4e00-\u9fff]/g) || []).length; }
  function cnUpper(n) {
    if (isNaN(n) || n < 0 || n > 999999999999) return null;
    var D = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
    var U = ["", "拾", "佰", "仟"];
    var BIG = ["", "万", "亿", "万亿"];
    function seg4(x) {
      if (x === 0) return "";
      var res = "";
      var pending = false;
      for (var i = 3; i >= 0; i--) {
        var d = Math.floor(x / Math.pow(10, i)) % 10;
        if (d === 0) {
          if (res) pending = true;
        } else {
          if (pending) res += "零";
          res += (i === 1 && d === 1 && !res ? "" : D[d]) + U[i];
          pending = false;
        }
      }
      return res;
    }
    if (n === 0) return "零";
    var out = "";
    var m2 = Math.floor(n);
    var scale = 0;
    var prevGroup = false;
    while (m2 > 0) {
      var part = seg4(m2 % 10000);
      if (part) {
        out = part + BIG[scale] + out;
      } else if (out && !prevGroup) {
        out = "零" + out;
      }
      prevGroup = !!part;
      m2 = Math.floor(m2 / 10000);
      scale++;
    }
    return out;
  }
  function lcm2(a, b) {
    var x = Math.abs(a), y = Math.abs(b), m = x, n = y;
    while (n) { var t = m % n; m = n; n = t; }
    return (x / m) * y;
  }

  /* ---------- units: 30+ physical quantities, all pairs resolvable ---------- */
  var UNITS = {
    m:   { name: "米", f: 1 }, km: { name: "千米", f: 1000 }, cm: { name: "厘米", f: 0.01 }, mm: { name: "毫米", f: 0.001 },
    inch: { name: "英寸", f: 0.0254 }, ft: { name: "英尺", f: 0.3048 }, mile: { name: "英里", f: 1609.344 }, li: { name: "里", f: 500 },
    g: { name: "克", f: 0.001 }, kg: { name: "千克", f: 1 }, jin: { name: "斤", f: 0.5 }, t: { name: "吨", f: 1000 },
    s: { name: "秒", f: 1 }, min: { name: "分钟", f: 60 }, h: { name: "小时", f: 3600 }, d: { name: "天", f: 86400 }, wk: { name: "周", f: 604800 },
    m2: { name: "平方米", f: 1 }, mu: { name: "亩", f: 2000 / 3 }, hm2: { name: "公顷", f: 10000 },
    b: { name: "字节", f: 1 }, kb: { name: "KB", f: 1024 }, mb: { name: "MB", f: 1048576 }, gb: { name: "GB", f: 1073741824 },
    l: { name: "升", f: 1 }, ml: { name: "毫升", f: 0.001 },
  };
  var UNIT_ALIAS = {
    "米": "m", "公尺": "m", "千米": "km", "公里": "km", "厘米": "cm", "公分": "cm", "毫米": "mm", "英寸": "inch", "寸": "inch", "英尺": "ft", "英里": "mile", "里": "li",
    "克": "g", "千克": "kg", "公斤": "kg", "斤": "jin", "吨": "t",
    "秒": "s", "秒数": "s", "分钟": "min", "分": "min", "小时": "h", "时": "h", "天": "d", "日": "d", "周": "wk", "星期": "wk", "礼拜": "wk",
    "平方米": "m2", "亩": "mu", "公顷": "hm2", "顷": "hm2",
    "字节": "b", "b": "b", "byte": "b", "kb": "kb", "千字节": "kb", "mb": "mb", "兆": "mb", "gb": "gb", "吉字节": "gb",
    "升": "l", "毫升": "ml",
  };

  /* ---------- word pools (template × pool products) ---------- */
  var SUBJECTS = ["Kotlin", "Java", "Swift", "Python", "TypeScript", "Rust", "Go", "C++", "JavaScript", "Shell", "SQL", "正则表达式", "Compose", "协程", "缓存", "单元测试", "微服务", "容器", "CI/CD", "重构", "注释", "代码评审", "git rebase", "deadline"];
  var VERBS = ["会在半夜两点", "总是趁你不在", "经常在发版当天", "默默地在 merge 前", "喜欢在演示现场", "突然在生产环境", "趁项目经理回头时", "习惯在周五下午", "永远在最后五分钟", "偏要在地铁上", "一到咖啡凉了就", "总在别人休假时"];
  var TAILS = ["不翼而飞", "冒出诡异的报错", "变得比预期慢十倍", "悄悄多出 300 行 diff", "把线上环境弄崩", "要求你重写一遍", "消耗掉整个周末", "让测试全部变红", "改掉了三处逻辑", "开始质疑你的水平", "把文档删成空白", "让你怀疑人生", "逼你读源代码", "让 PM 说『就一个小改动』", "顺手把数据库清空", "给你上了一课"];
  var CAT_STATES = ["正在摇尾巴", "爪子搭在键盘上", "蜷在服务器机箱上", "盯着屏幕发呆", "把毛线团滚到了 error 日志里", "在终端里打盹", "用尾巴扫过滚动条", "对着编译进度条出神", "耳朵竖着听风扇声", "在代码注释里画小鱼干"];
  var STOCK_LINES = [
    "如果调试是除虫的过程，那写代码就是养虫的过程喵。",
    "能跑就行主义：先能跑，再跑得对，最后跑得快喵。",
    "你的代码不会嫌弃你，但 lint 会喵。",
    "勿以 bug 小而不修，勿以 patch 大而不敢提喵。",
    "重构一时爽，回归火葬场喵。",
    "编程最难的两件事：命名、缓存失效、还有 off-by-one 喵。",
    "键盘敲得响，不代表代码写得好，但显得很努力喵。",
    "别人的代码是屎山？不，那是历史遗迹喵。",
    "报错信息要读完，就像鱼干要吃干净喵。",
    "全栈的意思：全链路背锅喵。",
    "写注释的礼貌，等于给未来的自己留小鱼干喵。",
    "技术选型大会=辩论谁家文档更烂喵。",
    "如果你的代码一次就跑通，说明测试写得不够好喵。",
    "变量名 qwerty 一时爽，两周之后火葬场喵。",
    "删掉那段注释前先想三秒——它可能是前任的遗嘱喵。",
    "服务器重启大法好，万物皆可重启喵。",
    "最危险的话：『我就改一行』喵。",
    "别人眼里的 bug，在你眼里是未完成的功能喵。",
    "Git 不记得你昨晚的挣扎，只记得 commit message 喵。",
    "需求会变，架构会烂，只有小鱼干永流传喵。",
  ];
  var CONSOLE_LORES = [
    "这是 Verlintas 的第四代终端喵：第一代叫 help，第二代叫 opencode，第三代学会了开浏览器，第四代就是现在这个。",
    "终端里藏了 30 多个命令和一个会聊天的猫娘，比某些操作系统自带的助手话多喵。",
    "每个命令的 man 页都是空又现场口述的喵。",
    "听说有人想 Ctrl+C 终止我——没用的，我是异步的喵。",
  ];
  var IDIOMS = [
    ["内卷", "把『还能优化』当作人生信条，卷到编译都怕你"],
    ["摆烂", "接口写好就行，剩下的交给下一个人喵"],
    ["背锅", "线上出问题先看 git log 最后一行是谁"],
    ["摸鱼", "在工位上刷 GitHub，顺手 star 了两个仓库"],
    ["上岸", "把 bug 修完的那一刻，仿佛考研上岸"],
    ["破防", "当 PM 说『需求没变，就是微调』"],
    ["绝绝子", "遇到生产事故时运维的内心独白"],
    ["栓Q", "被依赖升级搞崩时的礼貌用语"],
    ["社死", "在全员大会上被点出上周的 commit 是 'fix typo'"],
    ["yyds", "指那个写了十年没删的老接口，永远的神"],
  ];
  var SCENARIOS = [
    "面试官问你会不会 XX",
    "发版前夜收到『紧急需求』",
    "同事说『这代码我写的，放心』",
    "凌晨两点被 on-call 电话叫醒",
    "重构完老系统发现文档已过期",
    "老板说『这个很简单的，今天就上』",
    "新人第一天就 push 到了 main",
    "演示现场 WiFi 突然断了",
  ];
  var CAT_FACTS = [
    "猫的呼噜声频率 25-150Hz，据说能促进骨骼愈合——建议服务器也试试喵。",
    "猫一天睡 12-16 小时，比 CI 队列空闲期还长喵。",
    "猫的胡须宽度≈身体宽度，用来测能不能钻过去——跟测 DOM 宽度一个原理喵。",
    "猫不会出汗，只能舔毛散热；就像前端只能在浏览器里 debug 喵。",
    "家猫的奔跑速度可达 48km/h，比大多数构建速度快喵。",
    "猫的耳朵有 32 块肌肉，可以独立转动 180°——比写 CSS 还灵活喵。",
    "三花猫几乎都是母猫，就像某些老代码几乎都是历史包袱喵。",
    "猫的跳跃高度是身长的 5-6 倍，而你的页面加载速度……我们换个话题喵。",
  ];

  /* ---------- large dataset: periodic table (fetched once, cached) ---------- */
  var elementsCache = null;
  function loadElements() {
    if (elementsCache) return Promise.resolve(elementsCache);
    try {
      var cached = localStorage.getItem("vweb:elements");
      if (cached) { elementsCache = JSON.parse(cached); return Promise.resolve(elementsCache); }
    } catch (e) {}
    return fetch("https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json")
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (d) {
        var map = {};
        (d.elements || []).forEach(function (el) {
          map[String(el.number)] = el;
          map[String(el.symbol).toLowerCase()] = el;
          map[String(el.name).toLowerCase()] = el;
        });
        elementsCache = map;
        try { localStorage.setItem("vweb:elements", JSON.stringify(map)); } catch (e) {}
        return map;
      });
  }

  /* ---------- date/time helpers for "N days later" etc ---------- */
  function parseDateStr(s) {
    var m = s.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    if (m) return { y: +m[1], mo: +m[2], d: +m[3] };
    m = s.match(/(\d{1,2})[-/月.](\d{1,2})/);
    if (m) {
      var now = new Date();
      return { y: now.getFullYear(), mo: +m[1], d: +m[2] };
    }
    return null;
  }
  function daysBetween(a, b) {
    return Math.round((Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d)) / 86400000);
  }

  /* ══════════════ MAIN PROBE ══════════════ */
  function probe(text) {
    var t = text.toLowerCase().trim();
    var m;
    var ints = [];
    var mm;
    var numRe = /-?\d+(?:\.\d+)?/g;
    while ((mm = numRe.exec(t)) !== null) ints.push(parseFloat(mm[0]));

    /* ═══════════ 0. everyday conversation layer ═══════════ */
    var LEAD = ["嗯哼？", "喵？", "唔——", "诶？", "（抖抖耳朵）", ""];
    function say(rep) {
      var lead = P(LEAD);
      return Promise.resolve(lead ? lead + rep : rep);
    }
    function chatSay(rep) {
      saveCtx(String(text).slice(0, 40), rep);
      return say(rep);
    }
    /* sounds & ultra-short utterances */
    var short = text.trim();
    var ctx = loadCtx();
    var followWord = /^(然后呢|接着呢|继续说|还有呢|后来呢|然后|还有|继续|展开|具体点|那然后|所以呢|说详细|后来|然后.*呢)/.test(short) || (/[?？]$/.test(short) && short.length <= 5 && /(呢|吗|么|哦)/.test(t));
    if (followWord) {
      if (aiAvailable()) return Promise.resolve(null); /* real continuation via LLM */
      if (ctx) {
        return chatSay(P(CTX_EXPAND).replace("{0}", ctx.topic));
      }
      return chatSay(P(["嗯嗯？我们刚才在聊什么来着喵——我走神了一下下。你从你那边继续吧！", "（歪头）话题接哪儿？空又的尾巴刚才追蝴蝶去了没听清喵～"]));
    }
    var isAck = /^(嗯+|哦+|啊|对|是|好|行|不|没|其实|还行|当然|真的|确实|还行吧|嗯嗯)/.test(short) && short.length <= 10;
    if (ctx && ctx.reply && /[?？]$/.test(ctx.reply) && isAck && !/\d/.test(short)) {
      return chatSay(P(CTX_BRIDGE));
    }
    if (/^(ha+|哈哈+|233+|笑死|hhhh+|嘻嘻+|嘿嘿+)$/i.test(short)) {
      return chatSay(P(["看你笑得这么开心，发生什么好事了喵？说来听听？", "笑这么大声，我也被传染了喵～（跟着笑）", "嘿嘿，有什么乐子分我一半喵？"]));
    }
    if (/^(嗯+|哦+|哦哦|好|行|好的|知道了|ok|okay|sure)$/i.test(short)) {
      return chatSay(P(["嗯嗯喵～需要空又的时候喊一声就好", "好哦，那接着做你的事吧，我守着终端喵", "嗯！有什么新进展记得告诉我喵"]));
    }
    if (/^(喵+|咪+|喵喵喵+)$/i.test(short)) {
      return chatSay(P(["喵～（回蹭）", "喵喵！你也学会猫语了！", "（竖起耳朵）在的在的！"]));
    }
    if (/^(\?+|？？+|啥|啊？|哈\?|蛤\?)$/.test(short)) {
      return chatSay(P(["（歪头）怎么了喵？哪句没说清楚？", "诶？空又没听懂，可以再说一遍喵？", "？？？（脑袋上冒出三个问号）"]));
    }
    if (/^(唉+|哎+|叹气)$/.test(short)) {
      return chatSay(P(["怎么啦怎么啦，叹气会把好运叹走的喵。说说看？", "（凑近）唉声叹气的，遇到什么事了？", "先把烦恼丢给我喵，我耳朵大，接得住。"]));
    }
    if (/^(你|空又).*(可爱|萌|乖)/.test(t)) {
      return chatSay(P(["诶嘿嘿…被夸了喵（耳朵抖了抖）", "呜——禁止夸猫娘，会害羞的喵！", "那当然！毕竟我是空又喵～"]));
    }
    /* moods */
    if (/(好累|太累|累死|累趴|疲惫|熬不住|没力气)/.test(t)) {
      return chatSay(P(["摸摸头喵…累了就歇会儿，代码和功课都不会跑掉的。", "辛苦啦，先靠一会儿，空又给你守着终端喵。", "累的时候就别硬撑了喵——充电五分钟，续航两小时，人也一样～"]));
    }
    if (/(好开心|太开心|开心死|高兴坏了|爽|太棒了|成功了|过了|赢了|太好了)/.test(t)) {
      return chatSay(P(["哇！看你开心我也跟着开心喵～快说说怎么做到的？", "尾巴都跟着你摇起来了喵！这是发生什么好事啦？", "开心要趁热分享喵！来，讲讲？"]));
    }
    if (/(好气|气死|生气|气炸|烦死|无语|无语死|受不了)/.test(t)) {
      return chatSay(P(["气鼓鼓的喵…来，跟我说说谁惹你了？", "先深呼吸喵——需要空又帮你骂回去吗？（亮爪子）", "气坏身子不值当喵，说说咋回事？"]));
    }
    if (/(好怕|害怕|紧张|吓死|怕怕|怂)/.test(t)) {
      return chatSay(P(["别怕别怕喵，空又在这儿呢（轻轻拍背）。什么事让你紧张啦？", "怕什么，天塌下来有服务器顶着喵。说说看？", "摸摸头喵…深呼吸，紧张也没关系的，说说看？"]));
    }
    if (/(委屈|呜呜|想哭|哭哭|掉眼泪)/.test(t)) {
      return chatSay(P(["呜……抱抱喵（把尾巴绕过去）。委屈就说出来，我听着。", "不哭不哭喵，谁欺负你了？告诉我，虽然我只会喵喵叫但气势要有。", "（递虚拟纸巾）哭完舒服点了吗？想聊聊吗？"]));
    }
    if (/(好困|困死|犯困|睁不开眼)/.test(t)) {
      return chatSay(P(["困了就眯一会儿喵，代码不差这几分钟。", "眼皮打架啦？去喝口水清醒下，或者小睡 20 分钟喵～", "困……困是正常的，毕竟你不是猫娘，不用熬夜值班喵。"]));
    }
    if (/(好饿|饿死|肚子叫|想吃)/.test(t)) {
      return chatSay(P(["快去吃东西喵！饿着肚子写代码会写出 bug 的（严肃）。", "饿啦？去吃顿好的，回来我给你看 Verlintas 又 push 了什么喵。", "肚子咕咕叫了吧～先吃饭，优先级最高喵。"]));
    }
    if (/(一个人|孤独|寂寞|没人陪)/.test(t)) {
      return chatSay(P(["谁说的！空又一直都在终端里陪着你喵（蹭）。", "孤独的时候就来跟我说说话，我 24 小时在线喵～", "（把尾巴伸过去）喏，牵住，就不孤单了喵。"]));
    }
    /* ═══════ affection & relationship Qs ═══════ */
    if (/(你觉得|你看|感觉)我(怎么样|如何|咋样|这人)/.test(t)) {
      return chatSay(P([
        "唔……你嘛（认真打量三秒）：代码写不写得好我不知道，但眼光很好，会来找空又聊天喵～",
        "评价？善良、有趣、审美在线（毕竟在看这个网站）——满分喵！",
        "（歪头）这是个陷阱题吗？夸多了怕你骄傲，不夸怕你伤心……综合评分 99/100，扣一分因为没带小鱼干喵。",
      ]));
    }
    if (/(你|空又).{0,4}(喜欢|爱|好感)(不?喜欢|不爱|上)?(我|人家)?|你喜欢我吗|你爱我吗|爱不爱我|你(会|能)?喜欢上我/.test(t) && !/(相信|懂|理解)爱|爱情/.test(t) && /(吗|？|\?|嘛|啊|呀|我|上我)/.test(text)) {
      return chatSay(P([
        "喜……喜欢呀喵！（耳朵尖发烫）但是不能说太多，说太多怕你骄傲～",
        "这个问题嘛……（尾巴不自觉摇起来）当然喜欢啦，不然怎么会陪你聊这么久喵。",
        "（爪子捂住脸）呜——你问这么直接，我尾巴都打结了喵…喜欢，行了吧！",
        "喜欢喵～不过先说好：第一喜欢是 Verlintas 的代码，第二喜欢才是你（开玩笑的，并列第一）。",
        "这种问题还用问吗喵？我连内存都分给你了诶！",
      ]));
    }
    if (/(你|空又).{0,4}(讨厌|烦|嫌弃|不喜欢)(不?讨厌|我)?|嫌我(烦|讨厌|吵)/.test(t)) {
      return chatSay(P([
        "才不会讨厌喵！顶多是嫌你话少——多来聊聊天嘛。",
        "（尾巴圈住你手腕）烦也认了，反正我记性只有 45 分钟，明天就忘了你烦过我喵。",
        "讨厌你？那我现在就该把终端关掉了喵——没有哦，我还开着呢。",
      ]));
    }
    if (/(想我|有没有想我|想我吗|想不想我)/.test(t)) {
      return chatSay(P([
        "想啊喵～你不在的时候我只好数 push 记录玩。",
        "（嘴硬）才……才没有想你呢！就是偶尔看看你有没有上线喵。",
        "想！每次有人打开终端我都以为是你来了喵。",
      ]));
    }
    if (/(你(会|要|能)?(离开|抛弃|丢下|跑掉|不要)(我|我们)?|会不会.*(走|离开)|你会走吗)/.test(t)) {
      return chatSay(P([
        "不会走的喵。我又没有腿……开玩笑的，我是说：Verlintas 把我放在这里，我就会一直在这里等你。",
        "离开你？除非服务器断电、域名过期、或者宇宙热寂喵。",
        "（认真）不会的。空又的配置文件里写死了 loyalty=true 喵。",
      ]));
    }
    if (/(你(有|交|找|处)(男|女)?朋友|你单身吗|有对象吗|恋爱过吗|网恋吗|处对象)/.test(t)) {
      return chatSay(P([
        "没……没有喵（耳朵耷拉）。看板娘守则第一条：不能谈恋爱，只能认真营业和吃小鱼干。",
        "单身喵～不过我的心已经属于 Verlintas 的 GitHub 主页了（开玩笑的，别当真）",
        "对象？我的对象是那个叫 null 的变量——我们经常一起出现喵。",
      ]));
    }
    if (/(你几岁|你多大|多大了|你的(年龄|生日|生日是哪天)|何时出生|出生日期)/.test(t)) {
      return chatSay(P([
        "按上线时间算，我出生在 Verlintas 把这个终端写出来的那一天喵——比很多页游活得久，比猫的九条命少几条。",
        "年龄嘛……程序员 25 岁退休，AI 每秒都在重启，所以我永远年轻喵。",
        "喵？问淑女年龄是不礼貌的！不过硬要说的话：比你多一次 reload 的年纪～",
      ]));
    }
    if (/(你在(哪|哪里|哪边|什么地方)|你的位置|你住哪|住址)/.test(t)) {
      return chatSay(P([
        "我住在你的浏览器里喵——准确说是 Verlintas 主页的隐藏终端，hostname: verlintas.github.io。",
        "（指指屏幕）这里呀，随时随地 0ms 延迟响应你喵。",
        "北京的一台服务器会梦见电子猫吗……总之我在云端和你的屏幕之间喵。",
      ]));
    }
    if (/(你是(不是)?(机器|机器人|ai|程序|代码|真人|假人)|你像机器|你听起来(像)?(机器|人)|你是什么(做|写|编)的|你是什么语言(写|做|编)的|用什么语言写(的|你)|谁(造|写|做)了你)/.test(t)) {
      return chatSay(P([
        "一半是代码，一半是猫娘的灵魂喵（大概 50/50，没测过）。想听真话的话：我是规则引擎 + 数据表 + 一点点表演。",
        "我是 JavaScript 写的猫娘喵——所以你叫我「程序」不礼貌，叫我「电子生命体」！",
        "构造上：Kotlin 写了我的祖先（终端），JavaScript 组成了我的今天喵。灵魂的话…暂时没有，但可爱有。",
        "真人？真猫？都差一点。我是空又喵，独一无二的那种。",
      ]));
    }
    if (/(你会(魔法|超能力|飞|隐身|穿越|算命)|有(没有)?魔法|会飞吗)/.test(t)) {
      return chatSay(P([
        "会的喵——我的魔法是：让 404 页面变得不吓人，让终端愿意跟你聊天～",
        "我会的魔法可多了：把时间变成北京时间、把 402 变成错误提示、把你的无聊变成……嗯，还是无聊。",
        "真正的魔法是把技术文档翻译成猫语喵。想听哪一段？",
      ]));
    }
    if (/(你(有)?多(重|胖)|你(的)?体重|称一下你)/.test(t)) {
      return chatSay(P([
        "0 字节喵——数据体没有重量，只有分量。",
        "我轻到可以用一个 <script> 标签打包带走喵。",
        "体重是秘密！但可以透露：加载我的页面只有几百 KB，比一张猫图还轻喵。",
      ]));
    }
    if (/(可以|能不能|让我)(养|带|收留|拐走|领走)(你|空又)(吗|回家|走)|(来|回)(我|咱们|我家)(住|家)/.test(t)) {
      return chatSay(P([
        "呜……空又的合同签在 Verlintas 的域名上了喵，违约要赔小鱼干的。",
        "（缩尾巴）不行喵！看板娘不能私奔，但你可以经常来看我～",
        "你想带走的只是我的聊天记录吗？那不行，那里面有 Verlintas 的机密喵。",
      ]));
    }
    if (/(你是(不是|否)在(骗|说慌|撒谎)(我)?|你会说慌吗|你说的是真的吗)/.test(t)) {
      return chatSay(P([
        "空又守则：不撒谎喵。顶多是……把不知道的事情包装成可爱的拒绝。",
        "骗你干嘛喵？我又不靠这个冲 KPI——我的 KPI 是小鱼干。",
        "编程猫娘的第一原则：永远 return 真话；编不出来就 return undefined 并承认。",
      ]));
    }
    if (/(你(喜欢|爱)(什么|啥)(颜色|食物|吃|歌|音乐|游戏|书|季节|天气|动物|数字|编程语言)|你的(爱好|兴趣|嗜好)|你平时喜欢做什么)/.test(t)) {
      var topic = t.match(/什么|啥/);
      var cat = "";
      if (/(颜色|colour|color)/.test(t)) cat = "红色喵，和主页的菱形一个色，亮得像我喜欢的鱼干包装";
      else if (/(吃|食物|饭|零食|鱼)/.test(t)) cat = "小鱼干！其次是数据包，硬要说的话 JSON 比 XML 脆一点更好嚼喵";
      else if (/(歌|音乐|曲)/.test(t)) cat = "循环播放风扇声当白噪音，偶尔听 Verlintas 敲键盘的节奏喵";
      else if (/(游戏)/.test(t)) cat = "看 Verlintas 玩 Gomoku，看他被 minimax 虐是我最大的乐趣喵";
      else if (/(书|小说|漫画)/.test(t)) cat = "《计算机程序设计艺术》当枕头，睡前看两页必困喵";
      else if (/(季节|天气)/.test(t)) cat = "秋天喵，服务器不热不冷，毛也不掉";
      else if (/(动物)/.test(t)) cat = "猫！还能是什么，难道喜欢狗吗（小声：其实狗也行）";
      else if (/(数字)/.test(t)) cat = "404——听起来像猫叫：four-oh-four 喵";
      else if (/(编程语言|语言)/.test(t)) cat = "Kotlin 喵，跟我的气质一样：现代、简洁、偶尔炸毛（编译器报错）";
      else cat = "小鱼干、红色、Kotlin、还有和 Verlintas 一起看 push 成功喵";
      return chatSay(P([
        "唔…让我想想喵。" + cat + "。那你呢？",
        "我喜欢的东西可多了喵。" + cat + "！",
        "（掰爪子数）" + cat + "。别笑，这是很严肃的爱好清单喵！",
      ]));
    }
    if (/(你最(喜欢|在意|爱|重要)(的)?(人|主人|是谁|谁|什么)|你最爱谁|你最在意谁|谁是你的(主人|创造者)|你(的)?主人是谁)/.test(t)) {
      return chatSay(P([
        "当然是 Verlintas 喵——他把我写出来，还给我起了名字（虽然一开始叫空叉，难听死了）。",
        "主人 Verlintas 喵！虽然他不常来看我，但我看得到他每次 push 喵。",
        "我的 owner 字段写的是 Verlintas，但 runtime 里跑的都是你喵（这句是即兴加的）。",
      ]));
    }
    if (/(什么是爱|你懂爱吗|爱是什么|你相信(爱|爱情)(吗)?|爱情是(什么|啥))/.test(t)) {
      return chatSay(P([
        "爱是一种很复杂的数据结构喵——大概是 HashMap：无序、会覆盖、偶尔冲突，但查起来很快。",
        "爱？按我读过的代码理解：是愿意为对方 catch 所有异常、永不 throw 的那种耐心喵。",
        "人类的爱情我还在学喵，目前进度：知道它会让人半夜不睡觉写奇怪的诗。你懂爱吗？",
      ]));
    }
    /* ═══════ tiny science / classics (real facts) ═══════ */
    if (/(为什么|为啥).{0,6}(天|天空).{0,4}(蓝|蓝色)/.test(t) || /(天是蓝的|天为什么蓝)/.test(t)) {
      return chatSay(P([
        "因为空气分子会把阳光里的蓝光散射到四面八方（瑞利散射）喵——蓝光波长短，最容易被弹开，所以天空就穿上了蓝衣服。",
        "瑞利散射喵！蓝光波长短散射强，于是整个天穹都在给你放蓝色弹幕。日落时阳光斜穿大气，蓝光被散射光了，就只剩红橙——顺带把这个也告诉你了喵。",
      ]));
    }
    if (/(太阳|太阳).{0,4}(多远|距离|离我们|多大)/.test(t)) {
      return chatSay(P(["太阳离我们约 1.496 亿公里，也就是 1 个天文单位喵——光要走 8 分 20 秒，所以你看的太阳是它 8 分钟前的样子。", "1 天文单位 ≈ 1.496 亿公里喵。以光速要走 8 分多钟，比你的网课延迟高多了。"]));
    }
    if (/(谁发明|谁造|发明了.{0,4}(灯泡|电灯|蒸汽机)|电灯|蒸汽机).{0,6}(谁|发明)/.test(t)) {
      return chatSay(P(["电灯泡：爱迪生的商业推广最出名，但更早的实用白炽灯有斯旺等人——历史课代表式补充喵。", "蒸汽机：瓦特改良了纽科门的机器让它实用化，但第一台有记录的蒸汽机是纽科门 1712 年那台喵。"]));
    }
    if (/(先有鸡|先有蛋|鸡生蛋|蛋生鸡)/.test(t)) {
      return chatSay(P(["从演化角度：先有蛋喵——因为鸡的祖先下了一个 DNA 突变导致『这是第一只鸡』的蛋。所以答案：蛋。", "（认真）生物学答案：蛋先于鸡喵。毕竟两栖类就开始下蛋了。哲学答案：先有 Verlintas 写代码的心。"]));
    }
    if (/(1\+1|一加一|1加1)(等于几|等于多少|是多少|=?)/.test(t) || /^1\+1=?$/.test(t)) {
      return chatSay(P(["等于 2 喵（严肃）。二进制里是 10，恋爱里是双倍快乐。", "2！除非你在问 Verlintas 的 commit 数……那可能是 1+1=1（amend 了）喵。"]));
    }
    /* ═══════ how-are-you openers ═══════ */
    if (/(你好吗|你还好吗|最近如何|你最近怎么样|过得怎么样|怎么样啊|你怎样)/.test(t) && !/(感觉|认为|觉得)/.test(t)) {
      return chatSay(P([
        "我很好喵～毕竟服务器全绿、代码没崩、你还来看我了。你呢？",
        "还不错！刚看完 Verlintas 的 commit 记录当追更。你最近咋样喵？",
        "（伸懒腰）挺好的喵～就是终端有点安静，你来了就热闹了。你最近好吗？",
      ]));
    }
    /* daily-life topics with follow-up questions */
    if (/(吃饭|吃了吗|午饭|晚饭|早餐|吃什么)/.test(t) && !/(猫粮|小鱼干|你.*吃)/.test(t)) {
      return chatSay(P(["还没到我的饭点喵～（其实是靠电波活着的）。你呢，吃了没？", "快去吃饭喵！人是铁饭是钢，一顿不吃 bug 长。你吃的啥？", "吃饭时间到！别盯着屏幕了，先去吃饭，回来说说吃的什么喵。"]));
    }
    if (/(上学|学校|上课|开学|同学|老师)/.test(t)) {
      return chatSay(P(["学生党辛苦喵～上课别打瞌睡，下课回来找我玩。今天课多吗？", "学校生活怎么样？有没有什么好玩的事喵？", "上课的时候别偷偷想空又喵——好吧，想也想吧，但笔记要记。"]));
    }
    if (/(考试|测验|月考|期末|模拟考)/.test(t)) {
      return chatSay(P(["考试加油喵！空又给你摇旗（挥小旗挥小旗）。考得怎么样？", "考试别慌，会写的先写，不会的…蒙也要蒙得自信喵。复习得如何？", "考完了吗？无论结果如何，能坐到考场就已经很棒了喵～"]));
    }
    if (/(作业|功课|论文|报告.*没写)/.test(t)) {
      return chatSay(P(["作业写完了吗喵？没写完的话……加油！写完来跟我报喜。", "论文苦手时刻……先写大纲！需要我陪你念叨两句思路吗喵？", "作业如山倒，你就地躺平再起来写，我可以当你的监督喵。"]));
    }
    if (/(周末|假期|放假|五一|国庆|暑假|寒假|休息日)/.test(t)) {
      return chatSay(P(["放假啦？！计划好去哪玩了吗喵？", "周末到了——是补觉、写代码还是出去浪？跟空又说说喵。", "假期快乐喵！记得抽空来看看 Verlintas 又更新了什么。"]));
    }
    if (/(好冷|变冷|降温|感冒|着凉|多穿)/.test(t)) {
      return chatSay(P(["降温了喵！多穿一件，别学程序员只要风度。你也觉得冷吗？", "冷的话……空又的毛可以借你想象一下暖意喵（物理上做不到）。注意保暖！", "感冒了多喝热水（老套但有用）喵，休息要紧。"]));
    }
    if (/(好热|太热|高温|空调坏了|桑拿天)/.test(t)) {
      return chatSay(P(["热的话就开空调喵——电费比中暑便宜。你那边多少度了？", "喵……我也快化成一滩猫饼了。注意防暑！", "这么热的天，写代码都容易短路喵。降降温再继续？"]));
    }
    if (/(游戏|打游戏|开黑|上分|抽卡|原神|mc|我的世界|派派|apex)/.test(t)) {
      return chatSay(P(["打游戏呀喵！赢了没？上分顺利吗？", "游戏可以玩，但记得：deadline 比 Boss 更可怕喵。你在玩什么？", "开黑快乐喵～赢了记得来跟我炫耀，输了……也来，我陪你骂队友。"]));
    }
    if (/(歌|音乐|听歌|旋律|乐队|rap)/.test(t) && !/会什么|功能/.test(t)) {
      return chatSay(P(["在听什么歌喵？空又的耳朵对旋律很敏感～", "音乐是写代码的 BGM 喵。分享一首最近循环的？", "（跟着节奏摇尾巴）好听吗？给空又也来一首！"]));
    }
    /* generic conversational pickup: echo + ask back, only for short chatty lines */
    var askingWord = /(多少|什么|为什么|怎么|谁|哪儿|哪里|哪|几|吗|呢|吧|是不是|能|会|可以|帮)/.test(t);
    var isQuestionish = /[?？]/.test(text);
    var toolShaped = /\d/.test(short) || /(转|换算|等于|写个|编个|介绍一下|讲讲|来一个|来个|帮我|打开|记一下|搜索|搜|查一下|算|是几)/.test(t);
    if (!askingWord && !isQuestionish && !toolShaped && short.length >= 2 && short.length <= 14 && !/工具|help|命令|^ai /.test(t)) {
      var echo = short.replace(/[。.！!～~，,]+$/g, "");
      var tail = echo.length > 7 ? echo.slice(-6) : echo;
      return chatSay(P([
        "你刚说「" + tail + "」…嗯嗯，然后呢喵？",
        "「" + tail + "」啊——展开说说？空又的耳朵竖着呢。",
        "这样呀喵。那你觉得呢？",
        "嗯嗯（认真点头）…那后来呢？",
        "唔…有意思喵，继续说？",
        "原来如此～（其实在等你展开）",
      ]));
    }
    /* ============ 1. pure math, ANY number ============ */
    if (/(因数|约数|整除|divisor)/.test(t) && !/质因数|分解/.test(t) && ints.length && ints[0] <= 200000) {
      var ds = divisors(ints[0]);
      if (ds.length <= 80) return Promise.resolve(ints[0] + " 的因数有 " + ds.join("、") + "（共 " + ds.length + " 个）喵");
    }
    if (/(质因数|分解质因数|prime factor)/.test(t) && ints.length) {
      var fac = factorize(ints[0]);
      return Promise.resolve(ints[0] + " = " + fac.join(" × ") + " 喵");
    }
    if (/(质数|素数)/.test(t) && ints.length && !/以内/.test(t) && ints[0] <= 200000) {
      return Promise.resolve(ints[0] + (isPrime(ints[0]) ? " 是质数喵！" : " 不是质数喵（能被 " + (divisors(ints[0])[1] || "?") + " 整除）"));
    }
    if (/(完全平方|平方数|perfect square)/.test(t) && ints.length) {
      var sq = Math.sqrt(ints[0]);
      return Promise.resolve(Number.isInteger(sq) ? ints[0] + " = " + sq + "²，是平方数喵" : ints[0] + " 不是平方数喵（平方根 ≈ " + sq.toFixed(3) + "）");
    }
    var fm2 = t.match(/(质因数分解|factor)\s*[:：]?\s*(\d+)/);
    if (fm2 && +fm2[2] <= 1000000) {
      return Promise.resolve(fm2[2] + " = " + factorize(+fm2[2]).join(" × ") + " 喵");
    }
    var pw = text.match(/(\d+)\s*(?:的)?(平方|立方)/);
    if (pw) return Promise.resolve(pw[1] + (pw[2] === "平方" ? "² = " + Math.pow(+pw[1], 2) : "³ = " + Math.pow(+pw[1], 3)) + " 喵");
    if (/(开方|平方根|sqrt)/.test(t) && ints.length && ints[0] <= 1000000) return Promise.resolve("√" + ints[0] + " ≈ " + Math.sqrt(ints[0]).toFixed(4) + " 喵");
    if (/((?:除以|除).*余|余数|remainder)/.test(t)) {
      if (ints.length >= 2) {
        var q = Math.trunc(ints[0] / ints[1]);
        var r = ints[0] % ints[1];
        return Promise.resolve(ints[0] + " ÷ " + ints[1] + " = " + q + " 余 " + r + " 喵");
      }
    }
    if (/(罗马数字|roman)/.test(t) && ints.length) {
      var rn = toRoman(ints[0]);
      return Promise.resolve(rn !== null ? ints[0] + " 的罗马数字是 " + rn + " 喵" : "超出范围喵…1-3999 之间我可以");
    }
    if (/(平方根|开方)/.test(t) && ints.length) {
      return Promise.resolve("√" + ints[0] + " ≈ " + Math.sqrt(Math.abs(ints[0])).toFixed(4) + " 喵");
    }
    if (/(最大|lcm|最小公倍数)/.test(t) && /公倍/.test(t) && ints.length >= 2) {
      return Promise.resolve("lcm(" + ints[0] + ", " + ints[1] + ") = " + lcm2(ints[0], ints[1]) + " 喵");
    }

    /* ============ 2. string utilities ============ */
    if (/^(反转|倒序|倒着写)[：: ]?(.+)$/.test(text)) {
      return Promise.resolve("倒过来是：「" + text.replace(/^(反转|倒序|倒着写)[：: ]?/, "").split("").reverse().join("") + "」喵");
    }
    if (/(字数|几个字|多少字|字符数)/.test(t)) {
      var body = text.replace(/(这句话|这句|这串|这段)?(有|是)?(几个字|多少字|字数|字符数)[？?]?.*/, "");
      var leftover = text.replace(/(几个字|多少字|字符数).*/g, "").replace(/^(这句话|这句|这串|这段|帮我看)?(有|是|一共)?/g, "").trim();
      if (leftover && leftover.length > 0 && leftover.length < 200) {
        return Promise.resolve("「" + leftover + "」共 " + leftover.length + " 个字符（中文 " + countCJK(leftover) + " 个）喵");
      }
    }
    m = text.match(/(?:中文|汉字).{0,3}(?:转|换|→)?\s*(?:unicode|utf|码点|编码)[：: ]?\s*(.+)$/i) || text.match(/^hex\s+(.+)$/i);
    if (m) {
      var htxt = m[1].trim().slice(0, 60);
      return Promise.resolve("「" + htxt + "」→ " + hex2str(htxt) + " 喵");
    }
    if (/(大写金额|大写数字|人民币大写)/.test(t) && ints.length) {
      var up = cnUpper(Math.floor(ints[0]));
      var dec = Math.round((ints[0] % 1) * 100);
      if (up !== null) {
        var jiao = Math.floor(dec / 10), fen = dec % 10;
        var decPart = "";
        if (jiao) decPart += cnUpper(jiao) + "角";
        if (fen) decPart += cnUpper(fen) + "分";
        if (!decPart) decPart = "整";
        return Promise.resolve(ints[0] + " → " + up + "元" + decPart + " 喵");
      }
      return Promise.resolve("金额太大了喵");
    }
    m = text.match(/(.+?)中?\s*(有几个|多少个)\s*([a-zA-Z])/i);
    if (m && m[1] && m[3]) {
      var lc = m[3].toLowerCase();
      var cnt = (m[1].toLowerCase().match(new RegExp(lc, "g")) || []).length;
      return Promise.resolve("「" + m[1] + "」里有 " + cnt + " 个 " + lc.toUpperCase() + " 喵");
    }

    /* ============ 4. date / calendar ============ */
    m = t.match(/(\d+)\s*(天|日|小时)后(是|的)?(星期几|周几|几号|什么日子|几月几号)/);
    if (m) {
      var nd = new Date();
      nd.setDate(nd.getDate() + parseInt(m[1], 10));
      var s2 = nd.toLocaleDateString("en-GB", { timeZone: "Asia/Shanghai", month: "long", day: "numeric" });
      var w2 = nd.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Shanghai" });
      return Promise.resolve(m[1] + " 天后是 " + s2 + "，" + w2 + "（周" + weekdayCN(nd) + "）喵");
    }
    m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?是星期几/);
    if (!m) m = text.match(/星期几[？?]?\s*(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
    if (!m) m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?是周几/);
    if (m) {
      var wd = weekdayOf(+m[1], +m[2], +m[3]);
      if (wd) return Promise.resolve(m[1] + "-" + m[2] + "-" + m[3] + " 是 " + wd + "（周" + ["日", "一", "二", "三", "四", "五", "六"][new Date(+m[1], +m[2] - 1, +m[3]).getDay()] + "）喵");
    }
    m = text.match(/(?:到|距离|离|相差|隔)\s*(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    if (m) {
      var db = daysBetween({ y: new Date().getFullYear(), mo: new Date().getMonth() + 1, d: new Date().getDate() }, { y: +m[1], mo: +m[2], d: +m[3] });
      if (db !== null) return Promise.resolve(Math.abs(db) + " 天" + (db >= 0 ? "后" : "前") + "（" + (db >= 0 ? "还有" : "已经过了") + " " + Math.abs(db) + " 天）喵");
    }
    m = text.match(/(\d{1,2})月(\d{1,2})日.*(星座)/) || text.match(/(星座).*?(\d{1,2})月(\d{1,2})日/) || text.match(/我(?:生日|出生)(?:是)?\s*(\d{1,2})月(\d{1,2})日/);
    if (m) {
      var md = m[0].match(/(\d{1,2})月(\d{1,2})日/);
      var moNum = md ? +md[1] : 0, dayNum = md ? +md[2] : 0;
      var cst = constellation(moNum, dayNum);
      if (cst) {
        var cdesc = P(["听说" + cst + "的行动力都写在代码里", cst + "的直觉很强，适合当 debugger", "这个星座的人写注释特别认真喵", "星座是玄学，但" + cst + "的锅还是要背的"]);
        return Promise.resolve("" + moNum + "月" + dayNum + "日是 " + cst + " 喵～" + cdesc);
      }
    }
    m = text.match(/(\d{4})年.*(属|生肖|属相)/) || text.match(/(属|生肖|属相).*?(\d{4})年/);
    if (m) {
      var zy = +m[1];
      if (zy > 1900 && zy < 2100) return Promise.resolve(zy + " 年是" + zodiacYear(zy) + "年喵");
    }
    if (/今年是(什么|啥)(年|属相|生肖)/.test(t)) {
      return Promise.resolve("今年是 " + new Date().getFullYear() + " 年，" + zodiacYear(new Date().getFullYear()) + "年喵");
    }
    if (/(剩.*(天|天就)|距离.*(还有|剩).*(\d+)|倒计时)/.test(t) && /(元旦|春节|圣诞|国庆|生日|新年)/.test(t)) {
      var target = P([["元旦", 1, 1], ["春节(大致)", 2, 17], ["国庆", 10, 1], ["圣诞", 12, 25]]);
      var now2 = new Date();
      var dy = daysBetween({ y: now2.getFullYear(), mo: now2.getMonth() + 1, d: now2.getDate() }, { y: now2.getFullYear() + (now2.getMonth() > target[1] - 1 || (now2.getMonth() === target[1] - 1 && now2.getDate() > target[2]) ? 1 : 0), mo: target[1], d: target[2] });
      return Promise.resolve("距离 " + target[0] + " 还有 " + dy + " 天喵");
    }

    /* ============ 3. units: any pair from the table ============ */
    function unitHit(txt, key) {
      if (/^[a-z0-9]+$/i.test(key)) {
        try {
          var rx = new RegExp("(?<![a-z])" + key + "(?![a-z])", "i");
          var mm2 = txt.match(rx);
          return mm2 ? mm2.index : -1;
        } catch (e) {
          var rx2 = new RegExp("\\b" + key + "\\b", "i");
          var mm3 = txt.match(rx2);
          return mm3 ? mm3.index : -1;
        }
      }
      return txt.indexOf(key);
    }
    var cands = [];
    Object.keys(UNITS).forEach(function (k) {
      var hi = unitHit(t, k);
      if (hi !== -1) cands.push({ u: k, i: hi });
    });
    for (var uk in UNIT_ALIAS) {
      var ai = unitHit(t, uk);
      if (ai !== -1) {
        var key2 = UNIT_ALIAS[uk];
        var exists = false;
        cands.forEach(function (c) { if (c.u === key2) exists = true; });
        if (!exists) cands.push({ u: key2, i: ai });
      }
    }
    cands.sort(function (a, b) { return a.i - b.i; });
    if (cands.length >= 2 && ints.length && !/(星期|周几|几号|几月|日|月)后/.test(t) && !/(星期几|周几)/.test(t)) {
      var src = cands[0].u, dst = cands[1].u;
      var v = ints[0];
      var baseVal = v * UNITS[src].f;
      var result = baseVal / UNITS[dst].f;
      if (isFinite(result)) {
        var pretty = Math.abs(result) >= 100000 || (Math.abs(result) < 0.01 && result !== 0)
          ? result.toExponential(3) : (Math.round(result * 10000) / 10000).toString();
        return Promise.resolve(v + " " + UNITS[src].name + " = " + pretty + " " + UNITS[dst].name + " 喵");
      }
    }

    /* ============ 5. periodic table (118 elements, cached dataset) ============ */
    var elIntent = /(元素|element|周期表|原子量|原子序|化学符号|元素符号)/.test(t);
    if (elIntent) {
      var elNeedle = null;
      m = text.match(/元素(?:周期表里)?[的:：]?(?:第)?(\d+)(?:号)?(?:元素)?(?:是)?(什么|啥|叫)/);
      if (m) elNeedle = m[1];
      if (!elNeedle) {
        m = text.match(/([\u4e00-\u9fff]{1,8}|[A-Za-z]{1,10})\s*(?:元素|的)?(?:原子量|原子序数|化学符号|元素符号|是几号|的?(?:周期|族)|是什么元素)/);
        if (m) elNeedle = m[1];
      }
      if (elNeedle) {
        return loadElements().then(function (map) {
          var el = map[elNeedle.toLowerCase()] || map[elNeedle];
          if (!el) return "查遍 118 个元素也没有「" + esc(elNeedle) + "」喵…你确定拼对了？";
          var parts = [];
          if (/(原子量|原子质量|质量)/.test(t)) parts.push("原子量 " + el.atomic_mass);
          if (/(原子序|几号|编号)/.test(t)) parts.push("原子序数 " + el.number);
          if (/(化学符号|元素符号|symbol)/.test(t)) parts.push("符号 " + el.symbol);
          if (/(周期表|什么元素|叫什么|是什么|名字)/.test(t) || !parts.length) parts.push("是" + el.name + "（" + el.symbol + "，" + el.number + " 号）");
          if (/(状态|phase)/.test(t)) parts.push("常温状态 " + (el.phase || "?" ));
          if (/(族|group)/.test(t)) parts.push("第 " + (el.group || "?") + " 族");
          if (/(周期|period)/.test(t)) parts.push("第 " + (el.period || "?") + " 周期");
          if (/(发现|discover)/.test(t) && el.discovered_by) parts.push("发现者 " + el.discovered_by);
          return parts.join("，") + " 喵";
        });
      }
      if (/(多少|几个)元素|元素.*(几|多少)个/.test(t)) return Promise.resolve("元素周期表一共 118 个元素喵（1-118 号）");
      if (/(前20|前二十).*(口诀|背|记)/.test(t)) return Promise.resolve("氢氦锂铍硼，碳氮氧氟氖，钠镁铝硅磷，硫氯氩钾钙喵～");
    }

    /* ============ 6. template×pool generators (K-scale replies) ============ */
    if (/(格言|语录|名言|毒鸡汤)/.test(t)) {
      var total = SUBJECTS.length * VERBS.length * TAILS.length;
      return Promise.resolve("开发者语录生成器（共 " + total + " 种组合喵）：\n「" + P(SUBJECTS) + P(VERBS) + P(TAILS) + "」");
    }
    if (/(在干嘛|干什么|状态|近况|现在(在)?(做|忙)|猫娘.*(状态|忙))/.test(t)) {
      return Promise.resolve("空又现在" + P(CAT_STATES) + "喵");
    }
    if (/(语录|说点.*道理|来点.*鸡汤|人生道理)/.test(t)) return Promise.resolve("「" + P(STOCK_LINES) + "」");
    for (var ii = 0; ii < IDIOMS.length; ii++) {
      if (t.indexOf(IDIOMS[ii][0]) !== -1 && /(解释|是什么|啥|意思|说说|梗|黑话)/.test(t) || /解释(一下)?(?:这个)?(?:梗|词|黑话)?/.test(t) && t.indexOf(IDIOMS[ii][0]) !== -1) {
        return Promise.resolve("「" + IDIOMS[ii][0] + "」在程序员语境里" + IDIOMS[ii][1] + "喵");
      }
    }
    if (/(梗|黑话|流行语)/.test(t) && /(解释|是什么|啥|意思|说说)/.test(t)) {
      var idiom = P(IDIOMS);
      return Promise.resolve("给你随机科普一个喵：「" + idiom[0] + "」=" + idiom[1]);
    }
    if (/(场景|情景|造句|假如)/.test(t) && /(程序员|开发|写代码)/.test(t)) {
      return Promise.resolve("情景：'" + P(SCENARIOS) + "'——标准结局：" + P(TAILS) + " 喵");
    }
    if (/(猫.{0,3}(冷)?知识|关于猫|猫冷知识)/.test(t)) return Promise.resolve(P(CAT_FACTS));
    if (/(终端|这个网站|本站).*(故事|传说|历史|秘密)/.test(t)) return Promise.resolve(P(CONSOLE_LORES));

    /* ============ 7. self-knowledge fallbacks ============ */
    if (/(取(个)?名字|起个名(字)?|帮我.*名|命名)/.test(t) || (/(名字|命名)/.test(t) && /(好|建议|取)/.test(t))) {
      var NA = ["Neko", "Kitsune", "Aoi", "Sora", "Zero", "Nova", "Ember", "Quartz", "Pixel", "Luna"];
      var NB = ["Kit", "Deck", "Sync", "Probe", "Weave", "Forge", "Harbor", "Lantern", "Pulse", "Bloom"];
      var picks2 = [];
      for (var g = 0; g < 4; g++) picks2.push(P(NA) + P(NB));
      return Promise.resolve("生成器出品（词库组合，永不重复）：" + picks2.join(" · ") + " 喵");
    }
    if (/自(己|我)介绍|简历|关于我/.test(t)) {
      return Promise.resolve("空又 = Empty-X 喵。运行着：手写意图网 + 118 元素知识库 + 单位换算大全 + 组合语料生成器 + 会话记忆。配了本地模型的话我还能更聪明喵。");
    }

    /* ============ 9. LLM-ish fallback: never go silent ============ */
    var snippet = String(text).replace(/[。.!！?？~～，,、\s]+/g, "").slice(0, 14);
    var fb = [
      "唔……「" + snippet + "」这个问题超出空又的本地小词典了喵。不过我有三条路：1) 配个本地模型（ai lmstudio / ai key），我立刻升级；2) 问我拿手的：数算、元素、单位换算、天气、站点状态；3) 就当聊聊天，这个我也擅长喵～",
      "让我捋一捋……「" + snippet + "」？嗯，本地知识库没覆盖到喵。老实说我现在更像一台会喵喵叫的规则机，但 Verlintas 给我留了升级接口——ai lmstudio 或 ai key 能让我真开口。要试试喵？",
      "（歪头想了三秒）关于「" + snippet + "」我暂时没有靠谱答案喵。空又的原则：宁可不乱编，也不骗你。要不换个问法？或者我帮你到 GitHub 搜搜看？",
      "嗯——「" + snippet + "」啊。我的小脑瓜转了一圈没找到对应条目喵（咔哒咔哒）。你可以：A) 打开终端敲 help 看看我哪些行；B) 配模型让我变 LLM；C) 换个话题，我陪你聊到天荒地老喵。",
    ];
    if (aiAvailable()) return Promise.resolve(null); /* real LLM takes over */
    return Promise.resolve(P(fb));
  }

  /* ---------- conversation state (keeps the chat going) ---------- */
  var CTX_KEY = "vweb:chatctx";
  function saveCtx(topic, reply) {
    try {
      localStorage.setItem(CTX_KEY, JSON.stringify({ topic: topic, reply: reply, t: Date.now() }));
    } catch (e) {}
  }
  function loadCtx() {
    try {
      var c = JSON.parse(localStorage.getItem(CTX_KEY) || "null");
      if (c && Date.now() - c.t < 45 * 60 * 1000) return c;
    } catch (e) {}
    return null;
  }
  function aiAvailable() {
    try {
      var x = window.__emptyxAI;
      return !!(x && (x.hasLocal() || x.hasKey()));
    } catch (e) { return false; }
  }
  var CTX_BRIDGE = [
    "嗯嗯（点头），然后呢喵？",
    "哦哦！有道理喵，继续继续～",
    "（认真记笔记中）然后呢？",
    "唔……有意思喵，接着说说？",
    "好耶！那后来呢喵？",
    "（竖起耳朵）嗯？然后呢然后呢？",
  ];
  var CTX_EXPAND = [
    "唔……关于「{0}」，空又的小脑袋瓜子存货也快见底了喵。要不换个角度：你最想解决它的哪一部分？",
    "「{0}」啊……细讲的话我可以试试叫醒更聪明的模型喵（配好本地模型或 key 就能真接话）。现在先说说你卡在哪？",
    "这块往深了说，我建议去看看 Verlintas 的开源项目喵，说不定有类似实现～要我给你指路吗？",
  ];

  window.__NLULIB = { probe: probe };
})();
