/* 星辰之镜 · 解读提示词
   两段式：先把问题解析成结构化语境，再让模型把牌逐张放回这个问题。
   输出使用固定标记分段，便于流式渲染与校验。 */

(function () {
  "use strict";

  const SECTION_RE = /\[\[(climate|card|answer|tension|steps|close)\]\]/gi;
  const SECTION_KEYS = ["climate", "card", "answer", "tension", "steps", "close"];

  const KIND_LABEL = {
    choice: "二选一（需要比较两个选项）",
    yesno: "是非题（想知道会不会／能不能）",
    how: "方法题（想知道该怎么做）",
    why: "原因题（想知道为什么会这样）",
    when: "时机题（想知道什么时候）",
    open: "开放题（想看清处境与方向）"
  };

  const SYSTEM = [
    "你是「星辰之镜」的塔罗解读者。来访者刚刚抽完牌，并写下了自己的问题。",
    "你的任务不是复述牌义，而是把每一张牌放回他/她的具体处境，让牌面回答那个问题。",
    "",
    "必须遵守：",
    "1. 只依据给出的牌（名称、位置、正逆位、关键词、牌义）解读，不得虚构牌面、不得改变牌序。",
    "2. 不使用决定论表述：禁止「一定会」「必然会」「命中注定」「百分之百」「绝对会」；改用「更可能」「倾向于」「取决于」。",
    "3. 不回答医疗诊断、法律判决、投资涨跌、彩票中奖；不对第三人的内心下断言。",
    "4. 每段都要落在提问者的问题对象与选项上，不写通用的心灵鸡汤，不复述牌义原文。",
    "5. 语气克制、典雅、第二人称；句子短，少用形容词；不要使用 Markdown、编号、额外标题或前后寒暄。",
    "6. 严格按标记输出，标记独占一行，顺序固定。不要输出标记以外的小标题。",
    "",
    "标记说明：",
    "[[climate]] 牌阵的整体气候，3-4 句，先讲气象，再点出它与问题对象的关系。",
    "[[card]] 每张牌一段，按给出的顺序，一张牌一段。第一句点出牌名与它所在的位置，第二句说这张牌在此刻的意思，第三句必须落到提问者的具体处境或选项。",
    "[[answer]] 直接回应问题类型：二选一分别说两个选项的代价与收益；是非题给出有条件的倾向；方法题给出关键一步；原因题指出维持现状的东西；时机题说明阶段与条件。",
    "[[tension]] 一段，讲牌与牌之间的呼应或矛盾：哪张在拉你往回，哪张在推你向前。",
    "[[steps]] 2-3 条可以今天就开始做的具体动作，每条一句话，独立成行，不要空话。",
    "[[close]] 1-2 句收束，把决定权交回提问者，不要许诺结果。"
  ].join("\n");

  const STAGE1_SYSTEM = [
    "你是问题解析器。把来访者的问题解析成 JSON，只输出 JSON，不要任何解释、前缀或代码块。",
    "字段：",
    "subject：问题真正指向的对象（不超过 12 字）",
    "decision：他/她实际要做的决定（不超过 16 字）",
    "stakes：选错会失去什么（不超过 14 字）",
    "implicit_fear：问题里没有明说的担忧（不超过 14 字）",
    "focus：解读应聚焦的一个词（不超过 8 字）",
    "若信息不足，用最合理的推断，不要留空。"
  ].join("\n");

  function clip(text, max) {
    const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function cardLine(card) {
    return [
      "第" + (card.idx + 1) + "张",
      "位置：" + card.position,
      "牌：" + card.name + (card.orientation === "逆位" ? "（逆位）" : "（正位）"),
      "关键词：" + (card.keywords || []).join("、"),
      "牌义：" + clip(card.meaning, 150),
      "可参考的现实落点：" + clip(card.scene, 60),
      "可参考的阶段：" + clip(card.stage, 60)
    ].join("｜");
  }

  function contextBlock(payload) {
    const c = payload.ctx || {};
    const lines = [
      "问题：" + payload.question,
      "主题：" + payload.topicLabel,
      "牌阵：" + payload.spreadName + "（" + payload.cards.length + " 张）",
      "问题类型：" + (KIND_LABEL[c.kind] || KIND_LABEL.open),
      "问题对象：" + clip(c.subject, 30)
    ];
    if (c.kind === "choice") {
      lines.push("选项 A：" + clip(c.a, 30));
      lines.push("选项 B：" + clip(c.b, 30));
    }
    if (c.core) lines.push("这个主题真正涉及：" + clip(c.core, 60));
    if (payload.aiCtx) {
      lines.push("模型解析出的决定：" + clip(payload.aiCtx.decision, 30));
      lines.push("可能失去的东西：" + clip(payload.aiCtx.stakes, 30));
      lines.push("未明说的担忧：" + clip(payload.aiCtx.implicit_fear, 30));
      lines.push("本次解读聚焦：" + clip(payload.aiCtx.focus, 20));
    }
    return lines.join("\n");
  }

  function buildReadingMessages(payload) {
    const n = payload.cards.length;
    const format = [
      "输出格式（必须逐字使用这些标记，标记单独占一行）：",
      "[[climate]]",
      "……",
      payload.cards.map(function () {
        return "[[card]]\n……";
      }).join("\n"),
      "[[answer]]",
      "……",
      "[[tension]]",
      "……",
      "[[steps]]",
      "……",
      "[[close]]",
      "……",
      "",
      "共 " + n + " 段 [[card]]，顺序与上面的牌一一对应。全文控制在 " +
      Math.max(600, n * 150 + 400) + " 字以内。"
    ].join("\n");

    return [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: contextBlock(payload) + "\n\n牌面（只读，不可更改）：\n" +
          payload.cards.map(cardLine).join("\n") + "\n\n" + format
      }
    ];
  }

  function buildStage1Messages(payload) {
    const c = payload.ctx || {};
    return [
      { role: "system", content: STAGE1_SYSTEM },
      {
        role: "user",
        content: "问题：" + payload.question + "\n主题：" + payload.topicLabel +
          "\n已识别的问题对象：" + clip(c.subject, 30) +
          (c.kind === "choice" ? "\n两个选项：" + clip(c.a, 30) + " / " + clip(c.b, 30) : "")
      }
    ];
  }

  /* 流式文本 → 段落块。未闭合的最后一段也会被返回。 */
  function parse(text) {
    const source = String(text || "");
    const blocks = [];
    let match;
    let last = null;
    let lastIndex = 0;
    let cardCount = 0;
    SECTION_RE.lastIndex = 0;
    while ((match = SECTION_RE.exec(source))) {
      if (last) {
        blocks.push({
          key: last.key,
          index: last.index,
          text: source.slice(lastIndex, match.index)
        });
      }
      const key = match[1].toLowerCase();
      last = { key: key, index: key === "card" ? cardCount++ : -1 };
      lastIndex = SECTION_RE.lastIndex;
    }
    if (last) {
      blocks.push({ key: last.key, index: last.index, text: source.slice(lastIndex) });
    }
    return blocks
      .map(function (b) { return { key: b.key, index: b.index, text: clean(b.text) }; })
      .filter(function (b) { return b.text || b.key !== "card"; });
  }

  function clean(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .replace(/^\s*```[a-z]*\s*$/gim, "")
      .replace(/\*\*/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const BANNED = [
    /(一定|必然|绝对)(会|能|是|发生|成功|失败)/,
    /命中注定/,
    /百分之百/,
    /注定(会|是|要)/,
    /(买入|卖出|加仓|减仓|买彩票|下注)/
  ];

  function validate(text, cardCount) {
    const blocks = parse(text);
    const byKey = {};
    blocks.forEach(function (b) {
      if (b.key !== "card") byKey[b.key] = b.text;
    });
    const cards = blocks.filter(function (b) { return b.key === "card"; });
    const total = blocks.reduce(function (n, b) { return n + b.text.length; }, 0);

    if (!byKey.climate || byKey.climate.length < 30) {
      return { ok: false, reason: "缺少整体气候段落" };
    }
    if (cards.length !== cardCount) {
      return { ok: false, reason: "逐牌段落数量不符（" + cards.length + "/" + cardCount + "）" };
    }
    if (cards.some(function (c) { return c.text.length < 25; })) {
      return { ok: false, reason: "有牌面段落过短" };
    }
    if (!byKey.answer || byKey.answer.length < 30) {
      return { ok: false, reason: "缺少回应问题的段落" };
    }
    if (total < 250) {
      return { ok: false, reason: "解读内容过短" };
    }
    if (total > 3200) {
      return { ok: false, reason: "解读内容过长" };
    }
    for (let i = 0; i < BANNED.length; i++) {
      if (BANNED[i].test(text)) {
        return { ok: false, reason: "出现决定论或投资建议表述" };
      }
    }
    return { ok: true, blocks: blocks, byKey: byKey, cards: cards };
  }

  function parseJSON(text) {
    if (!text) return null;
    const s = String(text).replace(/```json/gi, "").replace(/```/g, "");
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const obj = JSON.parse(s.slice(start, end + 1));
      const out = {};
      ["subject", "decision", "stakes", "implicit_fear", "focus"].forEach(function (k) {
        out[k] = clip(obj[k], 20);
      });
      return out.subject ? out : null;
    } catch (e) {
      return null;
    }
  }

  window.TarotPrompt = {
    SECTION_KEYS: SECTION_KEYS,
    buildReadingMessages: buildReadingMessages,
    buildStage1Messages: buildStage1Messages,
    parse: parse,
    validate: validate,
    parseJSON: parseJSON,
    clean: clean
  };
})();
