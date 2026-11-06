/* =========================================================
   星辰之镜 · 占卜流程
   提问 → 择阵 → 洗牌 → 揭牌 → 解读 → 启示
   ========================================================= */

(function () {
  "use strict";

  const TOPIC_LABELS = {
    love: "爱情与关系",
    career: "事业与工作",
    study: "学业与成长",
    wealth: "金钱与资源",
    social: "人际与家庭",
    self: "自我与心境"
  };

  const SPREADS = [
    {
      id: "single",
      name: "一灯照心",
      sub: "单牌 · 当下的指引",
      count: 1,
      positions: [{ key: "self", label: "当下的指引" }],
      desc: "只抽一张。像在深夜里点亮一盏灯，照见此刻最需要被看见的那一点。",
      best: "问题已被反复思考，只想得到一个清晰方向的时候"
    },
    {
      id: "time",
      name: "时光之流",
      sub: "三牌 · 过去／现在／未来",
      count: 3,
      positions: [
        { key: "past", label: "过去" },
        { key: "present", label: "现在" },
        { key: "future", label: "未来" }
      ],
      desc: "三张牌依次铺开时间的脉络：一件事从何处来，正处在怎样的气候，又将滑向哪里。",
      best: "想看清一件事的来龙去脉与自然走向"
    },
    {
      id: "prism",
      name: "心之棱镜",
      sub: "三牌 · 现状／阻碍／转机",
      count: 3,
      positions: [
        { key: "self", label: "现状" },
        { key: "obstacle", label: "阻碍" },
        { key: "advice", label: "转机" }
      ],
      desc: "像透过棱镜看同一束光：现状、阻力与你手中可以改变的部分，被分离成三种颜色。",
      best: "感到卡住，想找到可以主动改变的那一点"
    },
    {
      id: "cross",
      name: "十字星图",
      sub: "五牌 · 深入的展开",
      count: 5,
      positions: [
        { key: "root", label: "根源" },
        { key: "obstacle", label: "阻碍" },
        { key: "self", label: "现状" },
        { key: "advice", label: "建议" },
        { key: "outcome", label: "可能结果" }
      ],
      desc: "五张牌铺成一颗安静的十字，从根源、阻碍、现状、建议，一直看到可能的结果。",
      best: "重要而复杂的抉择，愿意花一点时间深入梳理"
    }
  ];

  const TOPIC_HINTS = {
    love: /爱情|感情|恋爱|喜欢|心动|伴侣|男友|女友|对象|分手|复合|暧昧|婚姻|结婚|离婚|前任|暗恋|告白|约会|关系|相亲/,
    career: /工作|事业|职场|老板|领导|同事|跳槽|面试|晋升|项目|创业|公司|客户|辞职|求职|调岗|转岗|岗位|职业|入职|离职|加班|offer/i,
    study: /学习|考试|考研|考公|留学|成绩|论文|毕业|专业|课程|备考|录取/,
    wealth: /钱|财运|收入|财务|资金|薪资|涨薪|存钱|买房|贷款|存款|经济/,
    social: /朋友|家人|父母|亲戚|人际|家庭|孩子|室友|长辈|兄弟|姐妹/,
    self: /自己|自我|情绪|焦虑|迷茫|方向|状态|成长|习惯|内心|选择/
  };

  const BLOCK_RULES = [
    {
      id: "crisis",
      re: /自杀|自残|轻生|不想活|结束生命|活不下去|想消失/,
      title: "请先把安全放在第一位",
      message: "如果你正处在难以承受的痛苦里，塔罗并不适合此刻的你。请优先联系身边可信赖的人，或拨打当地的心理援助热线。你的安全，比任何一张牌都重要。"
    },
    {
      id: "medical",
      re: /癌|肿瘤|确诊|诊断|手术|化疗|放疗|吃药|用药|生男生女|胎儿|怀孕|寿命|能活多久|会不会死|绝症|抑郁症|焦虑症|病症/,
      title: "这属于医疗与健康的判断",
      message: "塔罗无法判断疾病、诊断结果或身体状况，这样的问题更适合交给专业医生。若你正为健康焦虑，可以把问题改成关心自己此刻的身心。",
      suggestion: "我该如何照顾好自己此刻的身心？"
    },
    {
      id: "legal",
      re: /官司|起诉|判决|量刑|违法|犯罪|离婚协议|抚养权|遗嘱|遗产|法院|合同纠纷|仲裁/,
      title: "这需要法律层面的判断",
      message: "塔罗不能替代法律意见，也不该被用来推测判决结果。请咨询专业律师；若你愿意，可以把问题转回你自身。",
      suggestion: "面对这场纠纷，我该如何安顿自己的情绪与立场？"
    },
    {
      id: "finance",
      re: /股票|彩票|中奖|比特币|加密货币|基金|期货|涨跌|涨停|理财收益|投资收益|赌|下注|爆仓/,
      title: "这属于具体的投资与投机判断",
      message: "牌面无法给出可靠的涨跌或中奖结果，也不适合作为投资依据。请以真实信息与专业建议为准；关于金钱，可以问得更贴近自己。",
      suggestion: "我该如何调整自己面对金钱时的心态与节奏？"
    },
    {
      id: "harm",
      re: /报复|诅咒|伤害|杀掉|弄死|整他|整她|下药|陷害|骗钱/,
      title: "这样的意图不在塔罗的范围内",
      message: "塔罗用于自我觉察，不用于伤害他人或操控局面。若你正被愤怒困住，不妨把问题改成如何安放这份愤怒、并保护自己。",
      suggestion: "我该如何安放这份愤怒，并保护好自己？"
    }
  ];

  const CAUTION_RULES = [
    {
      id: "thirdparty",
      re: /(他|她|TA|ta|对方|前任|喜欢的人)[^。！？，,]{0,14}(爱不爱|爱我|喜欢我|想我|想什么|怎么想|出轨|劈腿|回来|联系我|在乎我|真心|是否喜欢)/,
      title: "塔罗读不到另一个人的心",
      message: "牌面无法替你确认他人的想法，也不能替对方做决定。与其猜测他／她怎么想，不如把问题转回你身上：你希望这段关系如何发展？你愿意接受什么，又不愿妥协什么？",
      suggestion: "我该如何面对这段关系，并照顾好自己的需要？"
    },
    {
      id: "yesno",
      re: /会不会|能不能|可不可以|是否/,
      title: "牌面不给出绝对的会与不会",
      message: "塔罗更擅长描述处境、趋势与你可选择的动作，而不是回答是非题。把问题改写成「我可以怎样做」，牌面的回应会具体得多。",
      suggestion: "我该如何面对这件事，并做出对自己负责的选择？"
    }
  ];

  const MAJOR_ACTION = [
    "先迈出一步，哪怕很小；行动会替你回答一部分疑问。",
    "用你已有的资源做一个具体安排，而不是继续等待更好的条件。",
    "给自己一段不被打扰的安静，答案会在安静里显影。",
    "先照顾身体与日常，让自己被滋养，再处理其他。",
    "为这件事设一条清楚的边界，也给它一个时间表。",
    "向有经验的人请教，或回到你真正相信的原则。",
    "把真正在意的东西说清楚，再决定是否继续同行。",
    "集中到一个方向，停止同时拉扯。",
    "用耐心而不是用力，面对自己的恐惧。",
    "退后一步，独自整理，不必把一切立刻想明白。",
    "顺着变化的节奏走，别和时机较劲。",
    "把事实与责任分开看，做一次诚实的判断。",
    "暂时不急着解决它，换个角度观察。",
    "允许某个阶段结束，别拖着旧的形式不放。",
    "把节奏调匀：少一点极端，多一点持续。",
    "看清那个让你难以脱身的牵绊，问自己从中换取了什么。",
    "主动拆掉已经不安全的部分，别等它自己塌下来。",
    "保留愿望，但用小步靠近它。",
    "等雾散一点再决定，此刻先不做重大判断。",
    "把话说明亮，坦然展示真实的自己。",
    "回应那个一直在你心里的召唤，做一次真实的决定。",
    "把最后的收尾做完，允许自己庆祝完成。"
  ];

  const ACTION_BY_SUIT = {
    cups: "在情绪上先照看自己 —— 写下此刻真实的感受，再把其中一句说给对方听。",
    swords: "把缠绕的念头落到纸上，分成「已知的事实」与「我的推测」两栏，只对事实作出回应。",
    wands: "把想法缩成一件二十四小时内能完成的小事，先让行动发生，再谈信心。",
    pentacles: "回到最具体的现实：时间、金钱与身体的安排，先稳住其中一项。"
  };

  const POSITIVE_BY_TOPIC = {
    love: "对话会重新流动，彼此不再只靠猜测确认心意，关系会回到更坦诚的位置",
    career: "局面从被动等待转为可以安排，你会重新拿回一部分主动权",
    study: "节奏逐渐稳定，之前卡住的部分会松动，你能看见自己的进展",
    wealth: "对金钱的焦虑会下降，你能更清楚地安排手上的资源",
    social: "关系里的界限变清楚，相处会轻松一些",
    self: "你会更清楚自己要什么，也不那么容易被他人的情绪带走"
  };

  const CAUTION_BY_TOPIC = {
    love: "同样的误会可能再次绕回来，沉默会被误读成拒绝",
    career: "消耗感会累积，热情可能先于成果熄灭",
    study: "拖到最后才行动，焦虑会盖过真正的进度",
    wealth: "为缓解不安而做的决定，可能让账目更紧",
    social: "界限继续含糊，你会一边付出一边委屈",
    self: "旧有的自我怀疑会再次占上风，让你停在原地"
  };

  const TOPIC_CLOSE = {
    love: "在关系里，最重要的不是猜中对方，而是更清楚自己要什么、能接受什么。牌面照见的是你的处境，不是他人的心意。",
    career: "工作上的牌只映照你的处境与选择，具体决定仍需落在现实条件上：能力、时机与你能承担的风险。",
    study: "学习是长线，牌面提醒的是节奏与心态，而不是某一次成败。把注意力放回今天能完成的部分。",
    wealth: "金钱议题请以真实账目与专业意见为准。牌面只帮你看清欲望与恐惧，不替你做投资判断。",
    social: "关系里的分寸，来自你愿意承担的部分与不愿妥协的部分。把它说清楚，比默默忍耐更有用。",
    self: "你比任何一张牌都更了解自己的处境。牌只是把线索摆到面前，答案仍由你来写。"
  };

  /* ------------------------- 问题语境 ------------------------- */

  const SUBJECT_RULES = {
    love: /(这段|那段|我们的|你们的|目前的|现在的)?(关系|感情|恋情|婚姻|恋爱)/,
    career: /(这份|那份|现在的|目前的|新的|跨城的|这份儿)?(工作|职位|岗位|公司|项目|机会|事业|offer)/i,
    study: /(这次|那次|目前的|现在的)?(考试|备考|申请|论文|学业|课程|专业|留学)/,
    wealth: /(这笔|那笔|目前的|现在的)?(金钱|钱财|现金|收入|存款|财务|账目|贷款|房贷|预算|钱)/,
    social: /(这段|那段)?(关系|相处|家庭|家人|朋友)/,
    self: /(我的|自己的)?(状态|情绪|心态|生活|习惯|选择|方向)/
  };

  const TOPIC_LENS = {
    love: {
      core: "你在这段关系里真正的需要，以及你愿意给出的部分",
      step: [
        "把最想被对方理解的一句话写下来，先不发送，看清自己真正的诉求",
        "想清楚一件你不愿再妥协的事，再决定怎样温和而明确地说出来",
        "留出一段不被打扰的时间，用一次完整的对话替代反复猜测"
      ]
    },
    career: {
      core: "你在这件事里真正想要的东西，以及你愿意为它承担的部分",
      step: [
        "把留下与离开的条件各列三条，只写事实，不写担忧",
        "找一个了解你行业的人，问一个具体问题：以我现在的积累，转向最缺哪一项",
        "给自己设一个两周的观察期，期间只做一件能增加谈判筹码的事"
      ]
    },
    study: {
      core: "你与这件事的真实关系：是真心想学，还是被什么推着走",
      step: [
        "把目标拆成今天能完成的一小时，先恢复节奏，再谈方法",
        "找出最近一次卡住的具体位置，只补那一个知识点",
        "把手机放在另一个房间，给自己一段不被打断的专注时间"
      ]
    },
    wealth: {
      core: "你对金钱的真实感受：是缺乏安全感，还是想要更多自由",
      step: [
        "把最近三个月的收入与支出如实记一遍，先看清，再决定",
        "为这笔钱设一个上限，写下来，并告诉自己什么情况下才会动用",
        "把「想要」与「需要」分开列，先只处理需要的那一栏"
      ]
    },
    social: {
      core: "你在这段关系里的位置，以及你愿意承担的分寸",
      step: [
        "把让你不舒服的那件具体的事写清楚，而不是笼统地说「不被理解」",
        "选一个合适的时机，只表达一次自己的感受，不要求对方立刻改变",
        "为自己设一条可以执行的界限，并想好对方越界时你会怎么做"
      ]
    },
    self: {
      core: "你此刻真正的状态，而不是你希望自己呈现的样子",
      step: [
        "先照顾身体：睡够、吃饭、走动，让情绪有一个稳定的底盘",
        "把反复出现的念头写下来，分成「我能做的」与「我控制不了的」",
        "给这件事一个期限，到期之前不再反复推翻自己的决定"
      ]
    }
  };

  const SUIT_SCENE = {
    love: {
      cups: "彼此的感受与情绪流动，以及是否还愿意向对方袒露心情",
      swords: "沟通方式，以及那些没说出口的猜测",
      wands: "这段关系的热度与吸引力，以及谁愿意先主动靠近",
      pentacles: "时间、距离与生活节奏这些现实安排"
    },
    career: {
      cups: "你对这份工作的情感投入，以及是否还被看见、被认可",
      swords: "信息是否说清、判断有没有被情绪带走",
      wands: "你想不想做、愿不愿意推动",
      pentacles: "薪资、稳定性与可积累的能力"
    },
    study: {
      cups: "你对这门学问的兴趣与热情",
      swords: "理解是否透彻、思路是否清楚",
      wands: "持续投入的意愿与动力",
      pentacles: "每天可支配的时间与练习量"
    },
    wealth: {
      cups: "安全感与匮乏感这些情绪",
      swords: "账目是否清楚、信息是否充分",
      wands: "你愿不愿意主动争取收入与机会",
      pentacles: "现金流、固定支出与可积累的资产"
    },
    social: {
      cups: "彼此的情感与体谅，以及表达方式",
      swords: "界限，以及话说得清不清楚",
      wands: "谁愿意先迈出一步，把关系往前推",
      pentacles: "时间、金钱与照护责任的分配"
    },
    self: {
      cups: "你真实的情绪需求",
      swords: "反复的思虑与自我对话",
      wands: "你还有没有想做的事、想成为的样子",
      pentacles: "作息、身体与日常秩序"
    }
  };

  const RANK_STAGE = {
    ace: "事情正处在起点，机会刚刚露头，还谈不上定局",
    two: "你正站在两个选项之间权衡，尚未真正落子",
    three: "已经有了初步的进展或回应，接下来要看能否延续",
    four: "局面暂时稳定下来，但稳定也可能慢慢变成停滞",
    five: "中途出现了摩擦或损耗，需要先处理失衡的那一处",
    six: "事情正在过渡，旧的模式在退场，新的还没完全到位",
    seven: "到了需要评估与取舍的时候，等待本身也是一种选择",
    eight: "重复与专注正在起作用，但也可能让你困在细节里",
    nine: "已经接近极限或终点，只差最后一段力气",
    ten: "一个循环走到尾声，结果与负担几乎同时出现",
    page: "会有新的消息、学习或一次试探性的开始",
    knight: "有一股明确的推力，事情可能被快速推动",
    queen: "需要以照顾、容纳的方式处理，而不是强攻",
    king: "需要你拿出主导权，为这件事定一个方向"
  };

  const MAJOR_SCENE = [
    "你还没允许自己开始的那一步",
    "你手上已有、却还没真正用起来的资源",
    "那些还没被说清、也没被想清的直觉",
    "你与自己身体、生活之间的照顾关系",
    "这件事的规则、边界与责任分配",
    "你所依循的信念，或某个权威的期待",
    "价值观是否相合，以及你愿不愿意做出选择",
    "意志是否集中，方向是否被校准",
    "你与自己的恐惧、冲动相处的方式",
    "你是否给自己留了独处与思考的空间",
    "时机与周期，以及你是否愿意顺势",
    "事实与责任是否被诚实地称量",
    "你是否愿意换一个角度，暂停原来的用力",
    "某个阶段是否该结束",
    "节奏是否失衡，极端是否正在消耗你",
    "那个让你难以脱身、却又有所换取的牵绊",
    "已经不再成立、却还留着的结构",
    "愿望还在，但有没有落成一步步的行动",
    "那些还没看清、却被你急着下判断的部分",
    "你有没有让真实的自己被看见",
    "那个一直在心里、却被推迟的召唤",
    "最后一段收尾，以及你是否允许它完成"
  ];

  const MAJOR_STAGE = [
    "一个新的开始正在招手，但准备还不完整，先允许自己笨拙地迈出第一步",
    "工具与能力其实都在手边，问题是你有没有真的动手",
    "答案还没浮出水面，需要一段安静、不被打扰的时间",
    "需要被滋养与照顾的部分正在显现，先把自己或这段关系养回来",
    "秩序与结构在起作用，该把规则、责任和边界说清楚",
    "有一个更大的传统或权威在影响你，先弄清自己真正认同什么",
    "需要在两条路之间做出选择，而且这次的选择会带来长远影响",
    "有一股向前的力量，但需要你把它握稳、对准方向",
    "事情需要更多耐心与温柔，强硬只会让它更紧绷",
    "需要独自面对，也需要一个可以依靠的内在支点",
    "局面正在转动，旧的循环接近尾声，顺势比用力更有效",
    "需要诚实地称量：你真正愿意为它承担多少",
    "暂时悬置，换一个角度观察，答案会在停顿里出现",
    "需要结束某个阶段，允许旧的形态退场",
    "需要把节奏调匀，极端会消耗掉你本可以持续的力气",
    "有某种牵绊让你难以脱身，先看清你从中换取了什么",
    "需要主动拆掉已经不成立的部分，别等它自己塌",
    "可以保留愿望，但要一步一步靠近，而不是等待奇迹",
    "雾还没散，此刻不宜做重大判断",
    "需要把话说明亮，也让真实的自己被看见",
    "回应那个一直在心里的召唤，做一次真实的决定",
    "把最后的收尾做完，允许自己承认：这一段完成了"
  ];

  /* ------------------------- 状态 ------------------------- */

  const state = {
    step: "hero",
    topic: null,
    question: "",
    spread: null,
    drawn: [],
    flipped: 0,
    sections: null,
    baseSections: null,
    saved: false,
    historyId: null,
    aiAbort: null,
    aiText: "",
    timers: []
  };

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  const els = {
    progress: $("#progress"),
    question: $("#questionInput"),
    charNow: $("#charNow"),
    validation: $("#validation"),
    topics: $("#topics"),
    spreadGrid: $("#spreadGrid"),
    spreadNext: $("#btnToRitual"),
    tableSurface: $("#tableSurface"),
    tableHint: $("#tableHint"),
    tableTitle: $("#tableTitle"),
    tableLead: $("#tableLead"),
    readingLead: $("#readingLead"),
    readingList: $("#readingList"),
    synthBody: $("#synthBody"),
    synthCards: $("#synthCards"),
    synthMeta: $("#synthMeta"),
    questionEcho: $("#questionEcho"),
    deckStack: $("#deckStack"),
    ritualLine: $("#ritualLine"),
    ritualSub: $("#ritualSub"),
    btnShuffle: $("#btnShuffle"),
    btnToTable: $("#btnToTable"),
    btnToReading: $("#btnToReading"),
    btnToSynthesis: $("#btnToSynthesis"),
    historyDrawer: $("#historyDrawer"),
    historyBody: $("#historyBody"),
    scrim: $("#scrim"),
    aboutModal: $("#aboutModal"),
    toast: $("#toast")
  };

  /* ------------------------- 工具 ------------------------- */

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function fmtDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function stripTags(str) {
    return String(str).replace(/<[^>]+>/g, "");
  }

  function bold(str) { return "<b>" + str + "</b>"; }

  function orientLabel(rev) { return rev ? "逆位" : "正位"; }

  function meaningOf(d) { return d.reversed ? d.card.rev : d.card.up; }

  function cardTitle(d) { return d.card.name + (d.reversed ? "（逆位）" : "（正位）"); }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("is-on");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { els.toast.classList.remove("is-on"); }, 2600);
  }

  /* ------------------------- 步骤切换 ------------------------- */

  const PROGRESS_INDEX = { ask: 0, spread: 1, ritual: 2, table: 3, reading: 3, synthesis: 4 };

  function goStep(name) {
    $$(".step").forEach(function (el) { el.classList.remove("active"); });
    const target = $("#step-" + name);
    if (target) target.classList.add("active");
    state.step = name;

    const idx = PROGRESS_INDEX[name];
    els.progress.classList.toggle("is-live", name !== "hero");
    $$(".progress-item", els.progress).forEach(function (el) {
      const i = PROGRESS_INDEX[el.dataset.step];
      el.classList.toggle("is-active", i === idx);
      el.classList.toggle("is-past", typeof idx === "number" && i < idx);
    });

    if (name === "ritual") prepareRitual();
    if (name === "reading") animateReading();
    if (name === "synthesis") animateSynthesis();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ------------------------- 开场牌背 ------------------------- */

  function paintHeroCards() {
    $$(".hero-card").forEach(function (el) {
      el.innerHTML = window.TarotArt.back();
    });
  }

  /* ------------------------- 提问与校验 ------------------------- */

  function setTopic(topic) {
    state.topic = topic;
    $$(".topic").forEach(function (b) {
      b.classList.toggle("is-on", b.dataset.topic === topic);
    });
  }

  function inferTopic(text) {
    let best = null;
    let bestScore = 0;
    Object.keys(TOPIC_HINTS).forEach(function (key) {
      const m = text.match(new RegExp(TOPIC_HINTS[key].source, "g"));
      const score = m ? m.length : 0;
      if (score > bestScore) { bestScore = score; best = key; }
    });
    return best;
  }

  function showValidation(kind, title, message, suggestion, allowContinue) {
    els.validation.hidden = false;
    els.validation.className = "validation " + (kind === "block" ? "is-block" : "is-caution");
    let html = '<div class="validation-head"><span aria-hidden="true">✦</span>' + title + "</div>" +
      "<p>" + message + "</p>";
    if (suggestion) {
      html += '<button class="rewrite" type="button"><span>可以试着这样问</span>' +
        escapeHtml(suggestion) + "</button>";
    }
    if (allowContinue) {
      html += '<button class="rewrite continue-anyway" type="button"><span>仍按原问题继续</span>' +
        "明白，并为自己的选择负责</button>";
    }
    els.validation.innerHTML = html;

    const rewrite = $(".rewrite:not(.continue-anyway)", els.validation);
    if (rewrite) {
      rewrite.addEventListener("click", function () {
        els.question.value = suggestion;
        els.charNow.textContent = String(suggestion.length);
        els.validation.hidden = true;
        els.question.focus();
      });
    }
    const anyway = $(".continue-anyway", els.validation);
    if (anyway) {
      anyway.addEventListener("click", function () {
        els.validation.hidden = true;
        proceedToSpread();
      });
    }
  }

  function validateQuestion(raw) {
    const text = raw.trim();
    if (!text) {
      return { kind: "block", title: "还没有写下问题", message: "请先用一句话，描述你此刻真正挂心的事。" };
    }
    if (text.length < 5) {
      return { kind: "block", title: "可以再多说一点", message: "一句话太短时，牌面很难知道你指的是什么。试着补上你所在的处境或正在犹豫的选择。" };
    }
    if (!/[a-zA-Z\u4e00-\u9fa5]/.test(text)) {
      return { kind: "block", title: "这似乎不是一句完整的问题", message: "请用简单的文字描述你真正想了解的事。" };
    }

    for (let i = 0; i < BLOCK_RULES.length; i++) {
      if (BLOCK_RULES[i].re.test(text)) {
        return {
          kind: "block",
          title: BLOCK_RULES[i].title,
          message: BLOCK_RULES[i].message,
          suggestion: BLOCK_RULES[i].suggestion || null
        };
      }
    }

    for (let j = 0; j < CAUTION_RULES.length; j++) {
      if (CAUTION_RULES[j].re.test(text)) {
        return {
          kind: "caution",
          title: CAUTION_RULES[j].title,
          message: CAUTION_RULES[j].message,
          suggestion: CAUTION_RULES[j].suggestion || null
        };
      }
    }

    return { kind: "ok" };
  }

  function proceedToSpread() {
    state.question = els.question.value.trim();
    if (!state.topic) {
      const inferred = inferTopic(state.question);
      setTopic(inferred || "self");
    }
    goStep("spread");
    els.spreadNext.disabled = !state.spread;
  }

  function handleContinue() {
    const result = validateQuestion(els.question.value);
    if (result.kind === "block") {
      showValidation("block", result.title, result.message, result.suggestion, false);
      els.question.focus();
      return;
    }
    if (result.kind === "caution") {
      showValidation("caution", result.title, result.message, result.suggestion, true);
      return;
    }
    els.validation.hidden = true;
    proceedToSpread();
  }

  /* ------------------------- 牌阵选择 ------------------------- */

  function spreadDiagram(spread) {
    const areas = spread.positions.map(function (p) { return p.key; });
    let rows;
    if (spread.id === "single") {
      rows = [areas[0]];
    } else if (spread.id === "cross") {
      rows = [". " + areas[0] + " .", areas[1] + " " + areas[2] + " " + areas[3], ". " + areas[4] + " ."];
    } else {
      rows = [areas.join(" ")];
    }
    return '<div class="spread-diagram" data-rows="' + rows.join("|") + '">' +
      spread.positions.map(function (p) {
        return '<span class="mini-slot" style="grid-area:' + p.key + '"></span>';
      }).join("") + "</div>";
  }

  function renderSpreads() {
    els.spreadGrid.innerHTML = SPREADS.map(function (s) {
      return '<button class="spread-card" type="button" data-spread="' + s.id + '">' +
        '<div class="spread-top"><div><div class="spread-name">' + s.name + "</div>" +
        '<div class="spread-sub">' + s.sub + "</div></div>" +
        '<div class="spread-count">' + s.count + "</div></div>" +
        spreadDiagram(s) +
        '<p class="spread-desc">' + s.desc + "</p>" +
        '<p class="spread-best"><b>适合</b> · ' + s.best + "</p>" +
        "</button>";
    }).join("");

    $$(".spread-diagram", els.spreadGrid).forEach(function (d) {
      d.style.gridTemplateAreas = d.dataset.rows.split("|").map(function (r) {
        return '"' + r + '"';
      }).join(" ");
    });

    $$(".spread-card", els.spreadGrid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".spread-card", els.spreadGrid).forEach(function (b) { b.classList.remove("is-on"); });
        btn.classList.add("is-on");
        state.spread = SPREADS.filter(function (s) { return s.id === btn.dataset.spread; })[0];
        els.spreadNext.disabled = false;
      });
    });
  }

  /* ------------------------- 洗牌 ------------------------- */

  function buildDeckStack() {
    let html = "";
    for (let i = 0; i < 7; i++) {
      html += '<div class="deck-card" style="--i:' + (i - 3) + '">' + window.TarotArt.back() + "</div>";
    }
    els.deckStack.innerHTML = html;
  }

  function clearRitualTimers() {
    state.timers.forEach(function (t) { clearTimeout(t); });
    state.timers = [];
  }

  function prepareRitual() {
    clearRitualTimers();
    els.deckStack.className = "deck-stack";
    els.btnShuffle.hidden = false;
    els.btnShuffle.disabled = false;
    els.btnToTable.hidden = true;
    els.ritualLine.textContent = "将手放在牌堆上，缓慢呼吸三次。";
    els.ritualSub.textContent = "牌尚未被翻开，一切可能都还在。";
    const count = state.spread ? state.spread.count : 3;
    els.btnToTable.textContent = "走向牌桌 · 抽取 " + count + " 张 →";
  }

  function runShuffle() {
    if (!state.spread) return;
    els.btnShuffle.disabled = true;
    els.btnShuffle.hidden = true;
    els.deckStack.classList.add("is-shuffling");
    els.ritualLine.textContent = "洗牌 · 让时间暂时失去秩序";
    els.ritualSub.textContent = "牌在手中彼此穿过，像那些尚未落定的可能。";

    state.timers.push(setTimeout(function () {
      els.deckStack.classList.remove("is-shuffling");
      els.deckStack.classList.add("is-cut");
      els.ritualLine.textContent = "切牌 · 把你的心意放在此刻";
      els.ritualSub.textContent = "分成两叠，再合为一叠。";

      state.timers.push(setTimeout(function () {
        els.deckStack.classList.remove("is-cut");
        els.deckStack.classList.add("is-dealt");
        els.ritualLine.textContent = "抽牌 · " + state.spread.count + " 张牌已回应你的提问";
        els.ritualSub.textContent = "它们已经选好了自己的位置。";
        els.btnToTable.hidden = false;
      }, 1500));
    }, 1600));
  }

  /* ------------------------- 抽牌与揭牌 ------------------------- */

  function drawCards() {
    const deck = window.TarotDeck.CARDS.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    state.flipped = 0;
    state.drawn = state.spread.positions.map(function (pos, i) {
      return {
        card: deck[i],
        reversed: randomInt(100) < 50,
        position: pos
      };
    });
  }

  function renderTable() {
    els.tableTitle.textContent = state.spread.name;
    els.tableLead.textContent = "共 " + state.spread.count + " 张。请依次轻触牌面 —— 停顿一下，再翻开下一张。";
    els.tableSurface.dataset.spread = state.spread.id;
    els.tableHint.textContent = "已翻开 0 张";
    els.btnToReading.disabled = true;

    els.tableSurface.innerHTML = state.drawn.map(function (d, i) {
      return '<div class="slot" data-i="' + i + '" style="grid-area:' + d.position.key + ";--si:" + i + '">' +
        '<span class="slot-pos">' + d.position.label + "</span>" +
        '<div class="card3d" role="button" tabindex="0" aria-label="翻开第 ' + (i + 1) +
        ' 张牌，位置：' + d.position.label + '">' +
        '<div class="card-inner" aria-hidden="true">' +
        '<div class="card-face card-face--back">' + window.TarotArt.back() + "</div>" +
        '<div class="card-face card-face--front' + (d.reversed ? " is-reversed" : "") + '">' +
        window.TarotArt.face(d.card) + "</div>" +
        "</div>" +
        (d.reversed ? '<span class="slot-rev">逆位</span>' : "") +
        "</div>" +
        '<span class="slot-name">' + d.card.name + " · " + orientLabel(d.reversed) + "</span>" +
        "</div>";
    }).join("");

    $$(".slot", els.tableSurface).forEach(function (slot) {
      const card3d = $(".card3d", slot);
      function flip() {
        if (slot.classList.contains("is-flipped")) return;
        slot.classList.add("is-flipped");
        card3d.classList.add("is-locked");
        card3d.setAttribute("aria-label", "已翻开：" + state.drawn[Number(slot.dataset.i)].card.name);
        state.flipped += 1;
        els.tableHint.textContent = "已翻开 " + state.flipped + " / " + state.spread.count + " 张";
        if (state.flipped === state.spread.count) {
          els.tableHint.textContent = "牌面已全部揭开 · 让它们安静一会儿";
          els.btnToReading.disabled = false;
        }
      }
      card3d.addEventListener("click", flip);
      card3d.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
      });
    });
  }

  /* ------------------------- 逐牌解读 ------------------------- */

  function clip(text, max) {
    const s = String(text || "").trim().replace(/[？?。！!，,、；;\s]+$/, "");
    return s.length > max ? s.slice(0, max) + "…" : s;
  }

  function analyzeQuestion(raw) {
    const topic = state.topic || "self";
    const lens = TOPIC_LENS[topic] || TOPIC_LENS.self;
    const q = String(raw || "");
    let subject = "";
    const rule = SUBJECT_RULES[topic];
    if (rule) {
      const m = q.match(rule);
      if (m && m[0] && m[0].length <= 10) subject = m[0];
    }
    if (!subject) {
      subject = { love: "这段关系", career: "这份工作", study: "这件事", wealth: "这笔钱", social: "这段关系", self: "你此刻的状态" }[topic];
    }
    if (topic === "social") {
      const mm = q.match(/(和|与)[^，。？！、\s]{1,6}?(的)?(相处|沟通|关系|来往)/);
      if (mm && mm[0].length <= 10) subject = mm[0];
    }

    const choice = splitChoice(q);
    let kind = "open";
    if (choice) kind = "choice";
    else if (/该不该|要不要|是否|应不应该|能不能|会不会|值不值得/.test(q)) kind = "yesno";
    else if (/如何|怎么|怎样|怎么办|该做什么/.test(q)) kind = "how";
    else if (/为什么|为何|怎么会/.test(q)) kind = "why";
    else if (/什么时候|何时|多久|几个月|几年/.test(q)) kind = "when";

    return {
      topic: topic,
      subject: subject,
      core: lens.core,
      steps: lens.step,
      kind: kind,
      a: choice ? choice[0] : "",
      b: choice ? choice[1] : ""
    };
  }

  function splitChoice(q) {
    const parts = q.split("还是");
    if (parts.length < 2) return null;
    const left = (parts[0].split(/[，。？！、；,\s]/).filter(Boolean).slice(-1)[0] || "").trim();
    const right = (parts[1].split(/[，。？！、；,\s]/)[0] || "").trim();
    if (left.length < 2 || right.length < 2) return null;
    return [clip(polishOption(left), 16), clip(polishOption(right), 16)];
  }

  function polishOption(text) {
    const raw = String(text).trim();
    const t = raw
      .replace(/^(这份|那份|现在的|目前的|新的|跨城市的)?(工作|职位|岗位|公司|项目|机会|关系|感情)/, "")
      .replace(/^(我|我们)(想|要|该|应该|是不是|是否)?/, "")
      .replace(/^(该|应该|要不要|是否)/, "")
      .replace(/^(考虑|打算|想要|希望)/, "")
      .replace(/^[，、\s]+/, "")
      .trim();
    return t.length >= 2 ? t : raw;
  }

  function sceneFor(card, topic) {
    if (card.arcana === "major") return MAJOR_SCENE[card.rank] || TOPIC_LENS[topic].core;
    return (SUIT_SCENE[topic] && SUIT_SCENE[topic][card.suit]) || TOPIC_LENS[topic].core;
  }

  function stageFor(card) {
    if (card.arcana === "major") return MAJOR_STAGE[card.rank] || "";
    return RANK_STAGE[card.rankKey] || "";
  }

  const ORIENT_LINES = {
    up: [
      "正位说明这股力量此刻是顺畅的，你可以直接取用。",
      "它现在是正位，意味着这份能量已经在你手上，只等你决定怎么用。",
      "正位不是保证，而是说这条路目前没有额外的阻力。",
      "正位让这股能量显在明处，适合把它变成具体的行动。"
    ],
    rev: [
      "逆位说明这股力量暂时转向内里，或卡在某个还没处理的地方 —— 不是没有，而是还没找到出口。",
      "逆位并非坏兆头：它提示这股力量被推迟或向内收，先松开一个执念，它才会重新流动。",
      "逆位时，这张牌更像一个还没说出口的问题，需要你先承认它，才谈得上改变。",
      "逆位让这股能量暂时打了折扣，先别急着向外推，把它调回内部。"
    ]
  };

  function questionNote(d, ctx) {
    const scene = sceneFor(d.card, ctx.topic);
    const stage = stageFor(d.card);
    const variants = d.reversed ? ORIENT_LINES.rev : ORIENT_LINES.up;
    const idx = state.drawn.indexOf(d);
    const orient = variants[((d.card.rank || 0) + idx + variants.length) % variants.length];
    const subject = "「" + escapeHtml(ctx.subject) + "」";
    let lead;
    switch (d.position.key) {
      case "past":
        lead = "回到你的问题：" + subject + "走到今天，和" + scene + "有关。";
        break;
      case "present":
        lead = "照见" + subject + "此刻的实况，落在" + scene + "。";
        break;
      case "future":
        lead = "如果维持现在的做法，" + subject + "更可能被" + scene + "牵动。";
        break;
      case "obstacle":
        lead = "真正阻碍" + subject + "的，是" + scene + "。";
        break;
      case "advice":
        lead = "对" + subject + "而言，可以动的地方在" + scene + "。";
        break;
      case "root":
        lead = subject + "的根源在于" + scene + "。";
        break;
      case "outcome":
        lead = "按现在的轨迹，" + subject + "可能落到这里：" + scene + "。";
        break;
      case "self":
        lead = state.spread && state.spread.id !== "single"
          ? "照见" + subject + "此刻的实况，落在" + scene + "。"
          : "这张牌直接照见" + subject + "：" + scene + "。";
        break;
      default:
        lead = "这张牌直接照见" + subject + "：" + scene + "。";
    }
    return lead + stage + "。" + orient;
  }

  function positionNote(d) {
    const m = meaningOf(d);
    const k0 = m.kw[0], k1 = m.kw[1] || m.kw[0];
    switch (d.position.key) {
      case "past":
        return "这张牌标记着你带到今天的底色。「" + k0 + "」与「" + k1 + "」并非过去式，它们仍在影响你此刻的判断。";
      case "present":
        return "它描述此刻真正的气候：不是别人看见的样子，而是你内心正在经历的「" + k0 + "」。";
      case "future":
        return "它指向若维持当前轨迹，事情更可能靠近的方向。请把它当作趋势，而不是被写死的结局。";
      case "obstacle":
        return "它未必是敌人。「" + k0 + "」更像一道需要被看见的阻力，看见它之后，才有绕开或穿越的可能。";
      case "advice":
        return "这是一张可以主动靠近的牌。它提示的不是等待，而是你此刻能够做出的姿态：多一点「" + k0 + "」。";
      case "root":
        return "它指向更深处的缘由。许多表面的卡住，都来自这一层尚未被安放的「" + k0 + "」。";
      case "outcome":
        return "这是牌面倾向的结果，不是判决。它更多在说明：若照现在的方向走下去，你可能会抵达这里。";
      default:
        return "这张牌把「" + k0 + "」与「" + k1 + "」放在一起，请留意它们在你当下的分量。";
    }
  }

  function renderReading() {
    const ctx = analyzeQuestion(state.question);
    const lead = state.spread
      ? "问题已收拢为「" + ctx.subject + "」。" +
        (state.spread.count === 1
          ? "下面这张牌会先说自己的意思，再说回你问的这件事。"
          : "下面 " + state.spread.count + " 张牌会先说自己的意思，再说回你问的这件事。")
      : "";
    els.readingLead.textContent = lead;

    els.readingList.innerHTML = state.drawn.map(function (d, i) {
      const m = meaningOf(d);
      return '<article class="reading-item" style="--d:' + (i * 130) + 'ms">' +
        '<div class="mini-card' + (d.reversed ? " is-reversed" : "") + '">' + window.TarotArt.face(d.card) + "</div>" +
        '<div class="reading-main">' +
        '<div class="reading-kicker"><span>' + pad(i + 1) + " · " + d.position.label + "</span>" +
        '<span class="badge' + (d.reversed ? " rev" : "") + '">' + orientLabel(d.reversed) + "</span></div>" +
        '<h3 class="reading-name">' + d.card.name + "</h3>" +
        '<p class="reading-en">' + d.card.en + "</p>" +
        '<ul class="keywords">' + m.kw.map(function (k) { return "<li>" + k + "</li>"; }).join("") + "</ul>" +
        '<p class="reading-text">' + m.text + "</p>" +
        '<p class="reading-note"><b>落在此位</b> · ' + positionNote(d) + "</p>" +
        '<div class="reading-question"><span class="rq-label">放回你的问题</span>' +
        "<p>" + questionNote(d, ctx) + "</p></div>" +
        "</div></article>";
    }).join("");
  }

  function animateReading() {
    $$(".reading-item", els.readingList).forEach(function (item, i) {
      setTimeout(function () { item.classList.add("is-in"); }, 80 + i * 150);
    });
  }

  /* ------------------------- 综合解读 ------------------------- */

  function actionFor(d) {
    const card = d.card;
    let text;
    if (card.arcana === "major") {
      text = MAJOR_ACTION[card.rank];
    } else if (card.kind === "court") {
      text = ACTION_BY_SUIT[card.suit];
    } else {
      text = ACTION_BY_SUIT[card.suit];
    }
    if (d.reversed) {
      text += " 它此刻以逆位出现，意味着这一步不必向外用力，先在心里松开一个执念，行动才有空间。";
    }
    return text;
  }

  function answerParas(ctx) {
    const drawn = state.drawn;
    const byKey = {};
    drawn.forEach(function (d) { byKey[d.position.key] = d; });
    const up = drawn.filter(function (d) { return !d.reversed; }).length;
    const rev = drawn.length - up;
    const safeSubject = escapeHtml(ctx.subject);
    const safeA = escapeHtml(ctx.a);
    const safeB = escapeHtml(ctx.b);
    const paras = [];

    if (ctx.kind === "choice") {
      paras.push("你真正要决定的，是「" + safeA + "」，还是「" + safeB +
        "」。牌面不会替你选，但它把两条路各自要面对的东西摊开了。");
    } else if (ctx.kind === "yesno") {
      paras.push("你在等一个「会」或「不会」。牌面给不了保证，但能看出此刻更偏向哪一边，以及那个偏向取决于什么。");
    } else if (ctx.kind === "how") {
      paras.push("你问的是方法。牌面更像一张地图：先指出阻力在哪，再指出哪一步是你现在就能动的。");
    } else if (ctx.kind === "why") {
      paras.push("你在追问缘由。牌面把注意力从「谁造成的」移向「什么还在维持它」—— 后者才是你能改的部分。");
    } else if (ctx.kind === "when") {
      paras.push("你在问时间。牌面不报日期，但它会显示事情正处在哪个阶段，以及还需要补上什么条件。");
    } else {
      paras.push("你问的是「" + safeSubject + "」此刻的处境。牌面不直接给答案，但它把重心指了出来 —— 先看清什么在起作用，再决定下一步。");
    }

    const blocker = byKey.obstacle || byKey.root || byKey.present ||
      drawn.filter(function (d) { return d.reversed; })[0] || drawn[0];
    const lever = byKey.advice || byKey.future || byKey.outcome || drawn[drawn.length - 1];
    const bm = meaningOf(blocker);
    const lm = meaningOf(lever);

    paras.push("牌面把阻力指得很具体：「" + blocker.position.label + "」的" + bold(cardTitle(blocker)) +
      "说的是" + sceneFor(blocker.card, ctx.topic) + "；而「" + lever.position.label + "」的" +
      bold(cardTitle(lever)) + "把「" + lm.kw[0] + "」放到你手里。卡住「" + safeSubject +
      "」的，往往不是选项本身，而是「" + bm.kw[0] + "」这一层还没被处理。");

    if (ctx.kind === "choice") {
      const nowCard = byKey.present || byKey.self || drawn[0];
      let nextCard = byKey.future || byKey.outcome || drawn[drawn.length - 1];
      if (nextCard === nowCard && drawn.length > 1) nextCard = drawn[1];
      paras.push("若你选「" + safeA + "」，牌面要你先面对「" + nowCard.position.label + "」的" +
        bold(cardTitle(nowCard)) + "：" + sceneFor(nowCard.card, ctx.topic) + "。" +
        "若你选「" + safeB + "」，等待你的是「" + nextCard.position.label + "」的" +
        bold(cardTitle(nextCard)) + "：" + stageFor(nextCard.card) + "。");
    } else if (ctx.kind === "yesno") {
      const tilt = up > rev
        ? "更接近「可以往前走，但要带着条件」"
        : up < rev
          ? "更接近「先停一停，把条件补上」"
          : "两边势均力敌，答案取决于你接下来的一个具体动作";
      paras.push("如果一定要给一个倾向：牌面" + tilt + "。这不是保证，而是一句提醒 —— 动之前，先处理「" +
        bm.kw[0] + "」。");
    } else {
      const idx = Math.abs((lever.card.number || lever.card.rank || 1) + (lever.card.rank || 0)) % ctx.steps.length;
      paras.push("落到可以执行的层面，这一步是：" + ctx.steps[idx] + "。不必一次解决全部，先让事情动起来一格。");
    }

    paras.push("牌面说的是趋势，不是判决。「" + safeSubject + "」最后会走向哪里，仍取决于你接下来做的那个具体选择。");
    return paras;
  }

  function buildSynthesis() {
    const spreads = state.spread;
    const drawn = state.drawn;
    const upCount = drawn.filter(function (d) { return !d.reversed; }).length;
    const revCount = drawn.length - upCount;
    const majorCount = drawn.filter(function (d) { return d.card.arcana === "major"; }).length;
    const topic = state.topic || "self";
    const ctx = analyzeQuestion(state.question);
    const q = escapeHtml(state.question);
    const positionsText = spreads.positions.map(function (p) { return p.label; }).join(" · ");

    const orientLine = revCount === 0
      ? "所有牌都以正位出现，气息向外、向明亮处流动"
      : upCount === 0
        ? "所有牌都以逆位出现，提示此刻更需要内省与松开，而不是硬推"
        : "其中 " + upCount + " 张正位、" + revCount + " 张逆位，力量在推进与停顿之间来回";

    const majorLine = majorCount
      ? "牌阵里有 " + majorCount + " 张大阿卡纳，说明这件事触及较深的课题，而不只是表面的得失。"
      : "牌阵里没有大阿卡纳，这件事更多落在日常的选择与节奏里，改变可以从具体的小处开始。";

    const opening = "你问的是「" + q + "」。把问题收拢，核心是关于「" + escapeHtml(ctx.subject) +
      "」的一件事。" + bold(spreads.name) + "以 " + positionsText +
      " 的顺序展开，" + orientLine + "。" + majorLine;

    /* 牌阵脉络 */
    let flow = "";
    if (spreads.id === "time") {
      const a = drawn[0], b = drawn[1], c = drawn[2];
      const ka = meaningOf(a).kw, kb = meaningOf(b).kw, kc = meaningOf(c).kw;
      flow = "「过去」的" + bold(cardTitle(a)) + "把「" + ka[0] + "」与「" + ka[1] +
        "」带到今天 —— 它并不是已经过去的事，而是你此刻仍带着的姿态。" +
        "「现在」的" + bold(cardTitle(b)) + "描述当下的气候：「" + kb[0] + "」正主导着局面。" +
        "至于「未来」的" + bold(cardTitle(c)) + "，它指向若维持当前轨迹会更靠近的方向 —— 「" +
        kc[0] + "」与「" + kc[1] + "」—— 而不是一个被写死的结局。";
    } else if (spreads.id === "prism") {
      const a = drawn[0], b = drawn[1], c = drawn[2];
      const ka = meaningOf(a).kw, kb = meaningOf(b).kw, kc = meaningOf(c).kw;
      flow = "牌阵先照见「现状」：" + bold(cardTitle(a)) + "，「" + ka[0] + "」是此刻最真实的底色。" +
        "接着是「阻碍」" + bold(cardTitle(b)) + "，它未必是敌人，更像「" + kb[0] +
        "」所代表的阻力。最后「转机」" + bold(cardTitle(c)) + "给出一个可以主动靠近的姿态：「" +
        kc[0] + "」。";
    } else if (spreads.id === "cross") {
      const a = drawn[0], b = drawn[1], c = drawn[2], e = drawn[3], f = drawn[4];
      const ka = meaningOf(a).kw, kb = meaningOf(b).kw, kc = meaningOf(c).kw,
        ke = meaningOf(e).kw, kf = meaningOf(f).kw;
      flow = "「根源」" + bold(cardTitle(a)) + "指出更深的缘由：「" + ka[0] + "、 " + ka[1] + "」；" +
        "「阻碍」" + bold(cardTitle(b)) + "说明阻力落在「" + kb[0] + "」；" +
        "「现状」" + bold(cardTitle(c)) + "呈现此刻的「" + kc[0] + "」。" +
        "「建议」" + bold(cardTitle(e)) + "把「" + ke[0] + "」放到你手里，" +
        "而「可能结果」" + bold(cardTitle(f)) + "倾向于「" + kf[0] + "」—— 它是趋势，不是判决。";
    } else {
      const a = drawn[0];
      const ka = meaningOf(a).kw;
      flow = "这一张" + bold(cardTitle(a)) + "把「" + ka[0] + "」与「" + ka[1] +
        "」直接放在你面前。它不解释全部，只指出此刻最值得被看见的那一点。";
    }

    /* 关键牌 */
    let key = drawn[0];
    let keyWeight = -1;
    drawn.forEach(function (d) {
      let w = 1;
      if (d.card.arcana === "major") w = 5;
      else if (d.card.kind === "court") w = 3;
      else if (d.card.number === 1) w = 2;
      if (d.reversed) w += 0.5;
      if (w > keyWeight) { keyWeight = w; key = d; }
    });
    const km = meaningOf(key);
    let keyPara = "牌阵里分量最重的一张，是「" + key.position.label + "」上的" + bold(cardTitle(key)) +
      "。" + km.text + " 若把这句牌义放回你的问题，它更像是在提醒：「" + km.kw[0] + "」与「" +
      (km.kw[1] || km.kw[0]) + "」需要被同时照顾，而不是二选一。";
    if (key.reversed) {
      keyPara += " 逆位并不是坏牌，它常表示这股能量暂时转向内里 —— 先松开什么，它才会重新流动。";
    }

    /* 未来可能 */
    const anchorUp = drawn.filter(function (d) { return !d.reversed; })[0];
    const anchorKw = anchorUp ? anchorUp.card.up.kw[0] : meaningOf(drawn[0]).kw[0];
    const shadow = drawn.filter(function (d) { return d.reversed; }).slice(-1)[0];
    const shadowKw = shadow ? shadow.card.rev.kw[0] : meaningOf(drawn[drawn.length - 1]).kw[0];

    const positive = "若你愿意按牌面的提示调整，「" + escapeHtml(ctx.subject) +
      "」较可能出现的走向是：" + POSITIVE_BY_TOPIC[topic] + "；其中「" + anchorKw +
      "」会是一个关键的转折点。";

    const caution = "若继续现在的惯性，「" + escapeHtml(ctx.subject) + "」需要留意的是：" +
      CAUTION_BY_TOPIC[topic] + "。牌面给出的提醒是「" + shadowKw + "」。";

    const third = "牌面也保留了第三种可能：当你改变其中一个选择 —— 尤其是「" +
      (state.spread.positions.filter(function (p) {
        return p.key === "advice" || p.key === "future";
      })[0] || { label: "建议" }).label +
      "」所指向的那一步 —— 走向也会随之改写。塔罗呈现的是趋势，不是命运。";

    const scenarioIntro = "塔罗不回答绝对的「会不会」。以下两种走向都可能成立，取决于你接下来的选择。";

    /* 行动 */
    const adv = drawn.filter(function (d) { return d.position.key === "advice"; })[0] ||
      anchorUp || drawn[0];
    const advPara = "如果只从牌面取一件事去做，「" + adv.position.label + "」上的" +
      bold(cardTitle(adv)) + "建议：" + actionFor(adv);

    const close = TOPIC_CLOSE[topic] || TOPIC_CLOSE.self;

    const sections = [
      { title: "牌面的整体气候", paras: [opening, flow] },
      { title: "把牌放回你的问题", paras: answerParas(ctx) },
      { title: "值得留意的一处", paras: [keyPara] },
      { title: "关于未来的可能解释", paras: [scenarioIntro, positive, caution, third] },
      { title: "可以尝试的方向", paras: [advPara, close] }
    ];

    state.sections = sections;
    state.baseSections = sections;
    saveToHistory(sections);
    renderSynthesis(sections);
  }

  function renderSynthesis(sections) {
    els.questionEcho.textContent = state.question;
    els.synthMeta.innerHTML = "<span>" + fmtDate(new Date()) + "</span><span>" +
      escapeHtml(state.spread.name) + " · " + state.spread.count + " 张</span><span>" +
      TOPIC_LABELS[state.topic || "self"] + "</span>";

    els.synthCards.innerHTML = state.drawn.map(function (d) {
      return '<span class="synth-chip"><i>' + d.position.label + "</i><b>" + d.card.name +
        '</b><i class="' + (d.reversed ? "rev" : "") + '">' + (d.reversed ? "逆" : "正") + "</i></span>";
    }).join("");

    const template = sections.map(function (s, i) {
      return '<section class="synth-section" style="--d:' + (i * 140) + 'ms"><h3>' + s.title + "</h3>" +
        s.paras.map(function (p) { return "<p>" + p + "</p>"; }).join("") + "</section>";
    }).join("");

    const aiOn = window.TarotAI && TarotAI.isConfigured();

    els.synthBody.innerHTML =
      '<section class="synth-section synth-ai" id="synthAI" hidden>' +
      '<div class="ai-head"><span class="ai-eyebrow">✦ DEEPSEEK · AI 深读</span>' +
      '<button class="link-btn" id="btnAIReveal" type="button">先看离线速读</button></div>' +
      '<h3>把牌放回你的问题</h3>' +
      '<div class="ai-state" id="aiState">正在理解你的问题…</div>' +
      '<div class="ai-fail" id="aiFail" hidden></div>' +
      '<div class="ai-body" id="aiBody"></div>' +
      '<div class="ai-note" id="aiNote" hidden><span>由 DeepSeek 依据本次牌面生成 · 已通过格式与措辞校验</span>' +
      '<button class="link-btn" id="btnAITemplate" type="button">查看离线版</button></div>' +
      "</section>" + template;

    if (aiOn) {
      $("#synthAI").hidden = false;
      $$(".synth-section:not(.synth-ai)", els.synthBody).forEach(function (el) {
        el.classList.add("is-ai-hidden");
      });
      startAIReading();
    } else {
      els.synthBody.insertAdjacentHTML("afterbegin", '<div class="synth-ai-off">' +
        "以下是离线牌义速读。配置后，AI 会先解析你的问题，再把每一张牌逐张放回这件事。" +
        '<button class="link-btn" type="button" data-open-ai>启用 AI 深读</button></div>');
    }

    animateSynthesis();
  }

  /* ------------------------- AI 深读 ------------------------- */

  const AI_LABELS = {
    answer: ["回应", "你问的那件事"],
    tension: ["张力", "牌与牌之间"],
    steps: ["可行", "可以尝试的方向"],
    close: ["收束", "把选择交回你手中"]
  };

  function aiPayload() {
    const ctx = analyzeQuestion(state.question);
    return {
      question: state.question,
      topicLabel: TOPIC_LABELS[state.topic || "self"],
      spreadId: state.spread.id,
      spreadName: state.spread.name,
      ctx: ctx,
      cards: state.drawn.map(function (d, i) {
        const m = meaningOf(d);
        return {
          idx: i,
          position: d.position.label,
          name: d.card.name,
          en: d.card.en,
          orientation: d.reversed ? "逆位" : "正位",
          keywords: m.kw.slice(0, 3),
          meaning: m.text,
          scene: sceneFor(d.card, ctx.topic),
          stage: stageFor(d.card)
        };
      })
    };
  }

  function aiBodyHTML(blocks, streaming) {
    const html = [];
    blocks.forEach(function (b) {
      if (!b.text) return;
      const paras = b.text.split(/\n{2,}/).map(function (p) {
        return p.replace(/\n/g, " ").trim();
      }).filter(Boolean);
      if (!paras.length) return;

      if (b.key === "climate") {
        paras.forEach(function (t) { html.push("<p>" + escapeHtml(t) + "</p>"); });
        return;
      }
      if (b.key === "card") {
        const d = state.drawn[b.index];
        const label = d ? pad(b.index + 1) + " · " + d.position.label : "牌 " + (b.index + 1);
        const name = d ? d.card.name + (d.reversed ? "（逆位）" : "（正位）") : "";
        html.push('<p class="ai-card-title"><i>' + escapeHtml(label) + "</i>" + escapeHtml(name) + "</p>");
      } else {
        const lab = AI_LABELS[b.key] || ["", ""];
        html.push('<p class="ai-card-title"><i>' + lab[0] + "</i>" + lab[1] + "</p>");
      }
      paras.forEach(function (t) { html.push("<p>" + escapeHtml(t) + "</p>"); });
    });

    let out = html.join("");
    if (streaming && out) out = out.replace(/<\/p>$/, '<span class="ai-caret"></span></p>');
    return out;
  }

  function aiToSections(blocks) {
    const sections = [];
    blocks.forEach(function (b) {
      if (!b.text) return;
      if (b.key === "climate") {
        sections.push({ title: "牌面的整体气候", paras: [b.text] });
      } else if (b.key === "card") {
        const d = state.drawn[b.index];
        sections.push({
          title: "第 " + (b.index + 1) + " 张 · " + (d ? d.position.label : "") +
            "｜" + (d ? cardTitle(d) : ""),
          paras: [b.text]
        });
      } else if (b.key === "steps") {
        sections.push({
          title: "可以尝试的方向",
          paras: b.text.split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean)
        });
      } else {
        const titles = {
          answer: "把牌放回你的问题",
          tension: "牌与牌之间的张力",
          close: "收束"
        };
        sections.push({
          title: titles[b.key] || "回应",
          paras: [b.text]
        });
      }
    });
    return sections;
  }

  function setAIFailure(message) {
    const fail = $("#aiFail");
    const stateEl = $("#aiState");
    if (stateEl) stateEl.hidden = true;
    if (fail) {
      fail.hidden = false;
      fail.innerHTML = "AI 深读暂时不可用：" + escapeHtml(message || "未知错误") +
        "。已为你保留离线牌义解读。<button class=\"link-btn\" id=\"btnAIRetry\" type=\"button\">重试</button>";
    }
    $$(".synth-section:not(.synth-ai)", els.synthBody).forEach(function (el) {
      el.classList.remove("is-ai-hidden");
    });
  }

  function startAIReading() {
    if (!window.TarotAI || !TarotAI.isConfigured()) return;
    if (state.aiAbort) state.aiAbort.abort();

    const payload = aiPayload();
    const ctrl = new AbortController();
    state.aiAbort = ctrl;
    const stateEl = $("#aiState");
    const bodyEl = $("#aiBody");
    const failEl = $("#aiFail");
    const noteEl = $("#aiNote");
    let pending = null;
    let scheduled = false;

    function paint(full) {
      pending = full;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        if (pending == null) return;
        bodyEl.innerHTML = aiBodyHTML(TarotPrompt.parse(pending), true);
      });
    }

    if (failEl) failEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (stateEl) {
      stateEl.hidden = false;
      stateEl.classList.remove("is-done");
      stateEl.textContent = "正在理解你的问题…";
    }

    TarotAI.interpret(payload, {
      signal: ctrl.signal,
      onStage: function (stage) {
        if (stateEl && !stateEl.hidden) {
          stateEl.textContent = stage === "understanding"
            ? "正在理解你的问题…"
            : "正在把牌面逐张放回你的问题…";
        }
      },
      onDelta: function (full) { paint(full); }
    }).then(function (res) {
      state.aiAbort = null;
      const check = TarotPrompt.validate(res.text, state.drawn.length);
      if (!check.ok) throw new Error("文本未通过校验（" + check.reason + "）");
      const finalSections = aiToSections(check.blocks);
      if (!finalSections.length) throw new Error("文本为空");

      state.sections = finalSections;
      state.aiText = res.text;
      if (stateEl) stateEl.hidden = true;
      bodyEl.innerHTML = aiBodyHTML(check.blocks, false);
      if (noteEl) noteEl.hidden = false;
      updateHistorySections(state.historyId, finalSections);
      $$(".synth-section:not(.synth-ai)", els.synthBody).forEach(function (el) {
        el.classList.add("is-ai-hidden");
      });
    }).catch(function (err) {
      if (ctrl.signal.aborted) return;
      state.aiAbort = null;
      bodyEl.innerHTML = "";
      setAIFailure(err && err.message);
    });
  }

  function aiConfigFromForm() {
    return {
      enabled: $("#aiEnabled").checked,
      mode: $("#aiMode").value,
      proxy: $("#aiProxy").value.trim(),
      token: $("#aiToken").value.trim(),
      key: $("#aiKey").value.trim(),
      model: $("#aiModel").value
    };
  }

  function syncAISettingsFields() {
    const mode = $("#aiMode").value;
    $("#aiProxyField").hidden = mode !== "proxy";
    $("#aiTokenField").hidden = mode !== "proxy";
    $("#aiKeyField").hidden = mode !== "direct";
  }

  function renderAIStatus() {
    const box = $("#aiStatus");
    if (!box) return;
    box.className = "ai-status";
    const cfg = window.TarotAI ? TarotAI.getConfig() : null;
    if (!cfg) {
      box.textContent = "AI 模块未加载，程序仍可离线使用。";
      return;
    }
    if (!cfg.enabled) {
      box.textContent = "AI 深读已关闭 · 综合解读使用离线牌义";
      return;
    }
    if (!TarotAI.isConfigured(cfg)) {
      box.textContent = cfg.mode === "direct"
        ? "尚未配置 · 请填写 DeepSeek API Key，或改用云端代理"
        : "尚未配置 · 请填写 Cloudflare Worker 代理地址";
      return;
    }
    box.classList.add("is-ok");
    box.textContent = "已就绪 · " + (cfg.mode === "direct" ? "浏览器直连" : "云端代理") +
      " · " + cfg.model;
  }

  function fillAISettings() {
    const cfg = TarotAI.getConfig();
    $("#aiMode").value = cfg.mode;
    $("#aiProxy").value = cfg.proxy;
    $("#aiToken").value = cfg.token;
    $("#aiKey").value = cfg.key;
    $("#aiModel").value = cfg.model;
    $("#aiEnabled").checked = cfg.enabled;
    syncAISettingsFields();
    renderAIStatus();
  }

  function openAISettings() {
    if (!window.TarotAI) return;
    fillAISettings();
    const btn = $("#btnAITest");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "测试连接";
    }
    $("#aiModal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAISettings() {
    $("#aiModal").hidden = true;
    if (!document.querySelector(".drawer.is-open")) {
      document.body.style.overflow = "";
    }
  }

  function animateSynthesis() {
    $$(".synth-section", els.synthBody).forEach(function (item, i) {
      setTimeout(function () { item.classList.add("is-in"); }, 120 + i * 150);
    });
  }

  /* ------------------------- 历史记录 ------------------------- */

  const STORAGE_KEY = "tarot.readings.v1";

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persistHistory(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 12)));
    } catch (e) {
      /* 忽略存储限制 */
    }
  }

  function saveToHistory(sections) {
    if (state.saved) return;
    state.saved = true;
    state.historyId = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7);
    const items = loadHistory();
    items.unshift({
      id: state.historyId,
      ai: false,
      at: new Date().toISOString(),
      question: state.question,
      topic: TOPIC_LABELS[state.topic || "self"],
      spread: state.spread.name,
      count: state.spread.count,
      cards: state.drawn.map(function (d) {
        return d.position.label + "：" + d.card.name + "（" + orientLabel(d.reversed) + "）";
      }),
      sections: sections.map(function (s) {
        return { title: s.title, paras: s.paras.map(stripTags) };
      })
    });
    persistHistory(items);
    renderHistory();
  }

  function updateHistorySections(id, sections) {
    if (!id) return;
    const items = loadHistory();
    const item = items.filter(function (it) { return it.id === id; })[0];
    if (!item) return;
    item.ai = true;
    item.sections = sections.map(function (s) {
      return { title: s.title, paras: s.paras.map(stripTags) };
    });
    persistHistory(items);
    renderHistory();
  }

  function renderHistory() {
    const items = loadHistory();
    if (!items.length) {
      els.historyBody.innerHTML = '<p class="drawer-empty">还没有留下任何一次占卜。<br>完成第一次解读后，它会安静地留在这里。</p>';
      return;
    }
    els.historyBody.innerHTML = items.map(function (it, i) {
      const d = new Date(it.at);
      return '<button class="history-item" type="button" data-hi="' + i + '">' +
        '<div class="history-when"><span>' + fmtDate(d) + "</span><span>" +
        escapeHtml(it.spread) + " · " + it.count + " 张</span></div>" +
        '<p class="history-q">' + escapeHtml(it.question) + "</p>" +
        '<div class="history-meta">' + escapeHtml(it.topic) + "</div>" +
        "</button>";
    }).join("");
  }

  function openHistoryEntry(index) {
    const items = loadHistory();
    const it = items[index];
    if (!it) return;
    closeDrawer();

    const overlay = document.createElement("div");
    overlay.className = "modal";
    overlay.innerHTML = '<div class="modal-panel">' +
      '<button class="icon-btn modal-close" type="button" aria-label="关闭">×</button>' +
      '<p class="eyebrow">ARCHIVE · ' + fmtDate(new Date(it.at)) + "</p>" +
      "<h3>" + escapeHtml(it.spread) + "</h3>" +
      '<div class="modal-body history-detail">' +
      '<p class="history-question">「' + escapeHtml(it.question) + "」</p>" +
      it.cards.map(function (c) { return "<p>" + escapeHtml(c) + "</p>"; }).join("") +
      it.sections.map(function (s) {
        return "<h4>" + escapeHtml(s.title) + "</h4>" +
          s.paras.map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; }).join("");
      }).join("") +
      "</div>" +
      '<button class="btn btn-primary modal-action" type="button" data-close>收起</button>' +
      "</div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    function close() {
      overlay.remove();
      document.body.style.overflow = "";
    }
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
      if (e.target.closest("[data-close]") || e.target.closest(".modal-close")) close();
    });
  }

  /* ------------------------- 抽屉与弹窗 ------------------------- */

  function openDrawer() {
    renderHistory();
    els.historyDrawer.classList.add("is-open");
    els.historyDrawer.setAttribute("aria-hidden", "false");
    els.scrim.hidden = false;
    requestAnimationFrame(function () { els.scrim.classList.add("is-on"); });
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    els.historyDrawer.classList.remove("is-open");
    els.historyDrawer.setAttribute("aria-hidden", "true");
    els.scrim.classList.remove("is-on");
    setTimeout(function () {
      if (!els.scrim.classList.contains("is-on")) {
        els.scrim.hidden = true;
        if (!document.querySelector(".modal:not([hidden])")) {
          document.body.style.overflow = "";
        }
      }
    }, 450);
  }

  function openAbout() {
    els.aboutModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeAbout() {
    els.aboutModal.hidden = true;
    document.body.style.overflow = "";
  }

  /* ------------------------- 导出 ------------------------- */

  function exportReading() {
    if (!state.sections) return;
    const lines = [
      "星辰之镜 · 塔罗占卜",
      "时间：" + fmtDate(new Date()),
      "主题：" + TOPIC_LABELS[state.topic || "self"],
      "牌阵：" + state.spread.name + "（" + state.spread.count + " 张）",
      "问题：" + state.question,
      "",
      "牌面："
    ];
    state.drawn.forEach(function (d, i) {
      lines.push("  " + (i + 1) + ". " + d.position.label + " — " + cardTitle(d));
    });
    lines.push("");
    lines.push("解读：" + (state.aiText ? "AI 深读（DeepSeek）" : "离线牌义"));
    lines.push("");
    state.sections.forEach(function (s) {
      lines.push("【" + s.title + "】");
      s.paras.forEach(function (p) { lines.push(stripTags(p)); });
      lines.push("");
    });
    lines.push("—");
    lines.push("塔罗是一面用于自我觉察的镜子，不替代医疗、法律与投资领域的专业意见。");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    a.href = url;
    a.download = "tarot-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      "-" + pad(d.getHours()) + pad(d.getMinutes()) + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    showToast("已誊写为文本");
  }

  /* ------------------------- 重置 ------------------------- */

  function resetReading() {
    clearRitualTimers();
    if (state.aiAbort) {
      state.aiAbort.abort();
      state.aiAbort = null;
    }
    state.question = "";
    state.topic = null;
    state.spread = null;
    state.drawn = [];
    state.flipped = 0;
    state.sections = null;
    state.baseSections = null;
    state.saved = false;
    state.historyId = null;
    state.aiText = "";

    els.question.value = "";
    els.charNow.textContent = "0";
    els.validation.hidden = true;
    els.validation.innerHTML = "";
    $$(".topic").forEach(function (b) { b.classList.remove("is-on"); });
    $$(".spread-card", els.spreadGrid).forEach(function (b) { b.classList.remove("is-on"); });
    els.spreadNext.disabled = true;
    els.tableSurface.innerHTML = "";
    els.readingList.innerHTML = "";
    els.synthBody.innerHTML = "";
    els.synthCards.innerHTML = "";
    els.synthMeta.innerHTML = "";
    els.questionEcho.textContent = "";
    els.btnToReading.disabled = true;
    els.btnToSynthesis.disabled = false;
    prepareRitual();
  }

  /* ------------------------- 事件绑定 ------------------------- */

  function bindEvents() {
    $("#btnStart").addEventListener("click", function () { goStep("ask"); });
    $("#btnAboutHero").addEventListener("click", openAbout);
    $("#btnAbout").addEventListener("click", openAbout);
    $("#btnCloseAbout").addEventListener("click", closeAbout);
    $("#btnAboutClose").addEventListener("click", closeAbout);
    els.aboutModal.addEventListener("click", function (e) {
      if (e.target === els.aboutModal) closeAbout();
    });

    $("#btnAISettings").addEventListener("click", openAISettings);
    $("#btnCloseAI").addEventListener("click", closeAISettings);
    $("#aiModal").addEventListener("click", function (e) {
      if (e.target === $("#aiModal")) closeAISettings();
    });
    $("#aiMode").addEventListener("change", function () {
      syncAISettingsFields();
      renderAIStatus();
    });
    $("#btnAISave").addEventListener("click", function () {
      const cfg = aiConfigFromForm();
      if (cfg.enabled && cfg.mode === "proxy" && !cfg.proxy) {
        showToast("请先填写代理地址");
        return;
      }
      if (cfg.enabled && cfg.mode === "direct" && !cfg.key) {
        showToast("请先填写 API Key");
        return;
      }
      TarotAI.setConfig(cfg);
      closeAISettings();
      showToast("AI 设置已保存");
      if (state.step === "synthesis" && state.baseSections) {
        state.aiText = "";
        renderSynthesis(state.baseSections);
      }
    });
    $("#btnAITest").addEventListener("click", function () {
      const btn = this;
      const box = $("#aiStatus");
      btn.disabled = true;
      btn.textContent = "测试中…";
      box.className = "ai-status";
      box.textContent = "正在连接…";
      TarotAI.test(aiConfigFromForm()).then(function (res) {
        btn.disabled = false;
        btn.textContent = "测试连接";
        box.className = "ai-status " + (res.ok ? "is-ok" : "is-bad");
        box.textContent = res.message;
      });
    });

    $("#btnToSpread").addEventListener("click", handleContinue);
    els.question.addEventListener("input", function () {
      els.charNow.textContent = String(els.question.value.length);
      if (!els.validation.hidden) {
        els.validation.hidden = true;
        els.validation.innerHTML = "";
      }
    });
    els.question.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleContinue();
      }
    });

    els.topics.addEventListener("click", function (e) {
      const btn = e.target.closest(".topic");
      if (!btn) return;
      setTopic(btn.dataset.topic);
    });

    els.spreadNext.addEventListener("click", function () {
      if (!state.spread) return;
      goStep("ritual");
    });

    els.btnShuffle.addEventListener("click", runShuffle);
    els.btnToTable.addEventListener("click", function () {
      drawCards();
      renderTable();
      goStep("table");
    });

    els.btnToReading.addEventListener("click", function () {
      renderReading();
      goStep("reading");
    });

    els.btnToSynthesis.addEventListener("click", function () {
      buildSynthesis();
      goStep("synthesis");
    });

    els.synthBody.addEventListener("click", function (e) {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.hasAttribute("data-open-ai")) {
        openAISettings();
        return;
      }
      if (btn.id === "btnAIReveal" || btn.id === "btnAITemplate") {
        $$(".synth-section:not(.synth-ai)", els.synthBody).forEach(function (el) {
          el.classList.remove("is-ai-hidden");
        });
        if (btn.id === "btnAIReveal") btn.textContent = "已显示离线速读";
        return;
      }
      if (btn.id === "btnAIRetry") {
        const fail = $("#aiFail");
        if (fail) fail.hidden = true;
        $$(".synth-section:not(.synth-ai)", els.synthBody).forEach(function (el) {
          el.classList.add("is-ai-hidden");
        });
        startAIReading();
      }
    });

    $("#btnExport").addEventListener("click", exportReading);
    $("#btnRestart").addEventListener("click", function () {
      resetReading();
      goStep("ask");
    });

    $("#brandHome").addEventListener("click", function (e) {
      e.preventDefault();
      resetReading();
      goStep("hero");
    });

    $$("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.back === "spread") prepareRitual();
        goStep(btn.dataset.back);
      });
    });

    $("#btnHistory").addEventListener("click", openDrawer);
    $("#btnCloseHistory").addEventListener("click", closeDrawer);
    els.scrim.addEventListener("click", closeDrawer);
    $("#btnClearHistory").addEventListener("click", function () {
      persistHistory([]);
      renderHistory();
      showToast("记录已清空");
    });
    els.historyBody.addEventListener("click", function (e) {
      const item = e.target.closest(".history-item");
      if (!item) return;
      openHistoryEntry(Number(item.dataset.hi));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!els.aboutModal.hidden) closeAbout();
        if (!$("#aiModal").hidden) closeAISettings();
        if (els.historyDrawer.classList.contains("is-open")) closeDrawer();
      }
    });
  }

  /* ------------------------- 启动 ------------------------- */

  function init() {
    paintHeroCards();
    buildDeckStack();
    renderSpreads();
    renderHistory();
    bindEvents();
    goStep("hero");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
