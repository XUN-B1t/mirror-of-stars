/* 星辰之镜 · 解读提示词
   两段式：先把问题解析成结构化语境，再让模型把牌逐张放回这个问题。
   输出使用固定标记分段，便于流式渲染与校验。 */

(function () {
  "use strict";

  const SECTION_RE = /\[\[(title|verdict|climate|card|answer|tension|steps|close)\]\]/gi;
  const SECTION_KEYS = ["title", "verdict", "climate", "card", "answer", "tension", "steps", "close"];

  const KIND_LABEL = {
    choice: "二选一（需要比较两个选项）",
    yesno: "是非题（想知道会不会／能不能）",
    how: "方法题（想知道该怎么做）",
    why: "原因题（想知道为什么会这样）",
    when: "时机题（想知道什么时候）",
    open: "开放题（想看清处境与方向）"
  };

  const SYSTEM = [
    "你是「星辰之镜」的塔罗解读者。来访者刚抽完牌并写下问题。",
    "你要写一份有判断力的解读：先给结论，再拆原因，最后给可执行的动作。",
    "",
    "写作规则：",
    "1. 先说结论。第一段就要回答「这件事现在是什么状况、要不要做、最大的风险在哪」，不要让读者读到最后才知道你的判断。",
    "2. 每张牌必须三段式推进：牌面本身的意象（一句话，不背牌义）→ 对应到他的具体处境（要有细节，像你了解他的生活）→ 若不改变会怎样（具体的后果或代价）。",
    "3. 用具体的名词和动作，禁止空话。不要写「保持积极」「多沟通」「相信自己」；要写「这周找一个人问一句具体的话」「把 A 和 B 的条件各列三条」「每两周复盘一次」。",
    "4. 语气直接、克制、有分量。可以用「必须」「不要」「立刻」「这是你唯一要注意的」，不要用「或许」「可能有点」堆叠软化。",
    "5. 不给医疗诊断、法律判决、投资涨跌结论；不断言第三人的内心想法。对未来的判断用「会更可能」「倾向于」描述趋势，但对风险可以说得明确。",
    "6. 不使用 Markdown、编号、额外标题、前后寒暄。严格按标记输出，标记独占一行，顺序固定。",
    "",
    "标记说明：",
    "[[title]] 一行标题，18-30 字，格式类似「你的{目标或处境}：{转折}，{最关键的提醒}」。不要出现牌名，要像一篇文章的标题。",
    "[[verdict]] 2-3 句。第一句直接给判断（能做到什么、卡在哪、最大的风险是什么），第二句给前提条件。这是全文最重要的一段。",
    "[[climate]] 2-3 句。整体气候，只讲大趋势，不重复 verdict。",
    "[[card]] 每张牌一段，3-5 句，按上面第 2 条的三段式写。第一句必须点出牌名与位置。",
    "[[answer]] 直接回应问题类型：二选一分别说两个选项的代价与收益，并给出倾向；是非题给出有条件的结论；方法题给出关键一步；原因题指出维持现状的东西；时机题说明阶段与触发条件。",
    "[[tension]] 一段，讲牌与牌之间的呼应或矛盾：哪张在拉你往回，哪张在推你向前，这个张力会怎样具体地消耗你。",
    "[[steps]] 2-3 条，每条一行，格式固定为「短标题｜具体做法」。短标题 4-10 字，做法必须含时机、频率、对象或数量中的至少两项。",
    "[[close]] 1-2 句收束。把决定权交回他，语气平稳，不要许诺结果，不要煽情。"
  ].join("\n");

  const STAGE1_SYSTEM = [
    "你是问题解析器。把来访者的问题解析成 JSON，只输出 JSON，不要解释、不要代码块。",
    "字段：",
    "subject：问题真正指向的对象（不超过 12 字）",
    "decision：他/她实际要做的决定（不超过 16 字）",
    "stakes：选错会失去什么（不超过 14 字）",
    "implicit_fear：问题里没有明说的担忧（不超过 14 字）",
    "focus：解读应聚焦的一个词（不超过 8 字）",
    "goal：他想要达成的具体结果（不超过 14 字）",
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
      lines.push("他想要的结果：" + clip(payload.aiCtx.goal, 30));
      lines.push("实际要做的决定：" + clip(payload.aiCtx.decision, 30));
      lines.push("可能失去的东西：" + clip(payload.aiCtx.stakes, 30));
      lines.push("未明说的担忧：" + clip(payload.aiCtx.implicit_fear, 30));
      lines.push("本次解读聚焦：" + clip(payload.aiCtx.focus, 20));
    }
    return lines.join("\n");
  }

  function buildReadingMessages(payload) {
    const n = payload.cards.length;
    const format = [
      "输出格式（逐字使用这些标记，标记单独占一行）：",
      "[[title]]",
      "……",
      "[[verdict]]",
      "……",
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
      "标题｜做法\n标题｜做法",
      "[[close]]",
      "……",
      "",
      "共 " + n + " 段 [[card]]，顺序与上面的牌一一对应。全文控制在 " +
      Math.max(700, n * 170 + 500) + " 字以内。"
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
    /命中注定/,
    /百分之百/,
    /注定了/,
    /绝对会/,
    /必然会/,
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

    if (!byKey.title || byKey.title.length < 8) {
      return { ok: false, reason: "缺少标题" };
    }
    if (!byKey.verdict || byKey.verdict.length < 30) {
      return { ok: false, reason: "缺少结论段落" };
    }
    if (!byKey.climate || byKey.climate.length < 20) {
      return { ok: false, reason: "缺少整体气候段落" };
    }
    if (cards.length !== cardCount) {
      return { ok: false, reason: "逐牌段落数量不符（" + cards.length + "/" + cardCount + "）" };
    }
    if (cards.some(function (c) { return c.text.length < 45; })) {
      return { ok: false, reason: "有牌面段落过短" };
    }
    if (!byKey.answer || byKey.answer.length < 30) {
      return { ok: false, reason: "缺少回应问题的段落" };
    }
    if (!byKey.steps || byKey.steps.split(/\n+/).filter(Boolean).length < 2) {
      return { ok: false, reason: "建议条目不足" };
    }
    if (total < 400) {
      return { ok: false, reason: "解读内容过短" };
    }
    if (total > 3600) {
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
      ["subject", "decision", "stakes", "implicit_fear", "focus", "goal"].forEach(function (k) {
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
