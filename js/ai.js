/* 星辰之镜 · AI 解读客户端
   云端优先：DeepSeek（经 Cloudflare Worker 代理，密钥留在服务端）。
   调用失败时由上层回退到离线牌义模板，占卜流程不会中断。 */

(function () {
  "use strict";

  const CONFIG_KEY = "tarot.ai.v1";
  const CACHE_KEY = "tarot.ai.cache.v1";
  const CACHE_TTL = 2 * 60 * 60 * 1000;
  const CACHE_MAX = 8;
  const TIMEOUT = 45000;

  /* 部署 Cloudflare Worker 后，把它的地址填在这里（例如
     "https://mirror-of-stars-ai.xxx.workers.dev"），所有访客即可直接使用 AI。
     留空时，访客需要自行填写代理地址或 API Key。 */
  const DEFAULT_PROXY = "";

  const DEFAULTS = {
    enabled: true,
    mode: DEFAULT_PROXY ? "proxy" : "direct",
    proxy: "",
    token: "",
    key: "",
    model: "deepseek-chat"
  };

  function getConfig() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") || {};
    } catch (e) {
      saved = {};
    }
    const merged = Object.assign({}, DEFAULTS, saved);
    if (!merged.proxy && DEFAULT_PROXY) merged.proxy = DEFAULT_PROXY;
    return merged;
  }

  function setConfig(cfg) {
    const clean = Object.assign({}, DEFAULTS, cfg);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
    } catch (e) {
      /* 忽略存储限制 */
    }
    return clean;
  }

  function clearConfig() {
    try {
      localStorage.removeItem(CONFIG_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function isConfigured(cfg) {
    const c = cfg || getConfig();
    if (!c.enabled) return false;
    if (c.mode === "direct") return !!c.key.trim();
    return !!c.proxy.trim();
  }

  function endpoint(cfg) {
    if (cfg.mode === "direct") return "https://api.deepseek.com/chat/completions";
    const base = cfg.proxy.trim().replace(/\/+$/, "");
    if (!base) return null;
    if (/\/chat\/completions$/i.test(base)) return base;
    return base + "/chat/completions";
  }

  function headers(cfg) {
    const h = { "Content-Type": "application/json" };
    if (cfg.mode === "direct") {
      h.Authorization = "Bearer " + cfg.key.trim();
    } else if (cfg.token) {
      h["x-tarot-token"] = cfg.token.trim();
    }
    return h;
  }

  function buildBody(messages, opts, cfg) {
    const body = {
      model: cfg.model || "deepseek-chat",
      messages: messages,
      stream: !!opts.stream,
      temperature: opts.temperature == null ? 0.75 : opts.temperature,
      max_tokens: opts.maxTokens || 1400
    };
    if (opts.json) body.response_format = { type: "json_object" };
    return body;
  }

  function timeoutController(external) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    if (external) {
      if (external.aborted) ctrl.abort();
      else external.addEventListener("abort", function () { ctrl.abort(); });
    }
    return {
      signal: ctrl.signal,
      done: function () { clearTimeout(timer); }
    };
  }

  async function readError(res) {
    let detail = "";
    try {
      const text = await res.text();
      const json = JSON.parse(text);
      detail = (json.error && (json.error.message || json.error)) || text;
    } catch (e) {
      detail = "";
    }
    detail = String(detail || "").slice(0, 160);
    if (res.status === 401) return "密钥或访问口令不正确（401）";
    if (res.status === 429) return "调用太频繁，请稍后再试（429）";
    if (res.status === 403) return "代理拒绝访问（403）";
    if (res.status === 402) return "DeepSeek 账户余额不足（402）";
    return "服务返回 " + res.status + (detail ? "：" + detail : "");
  }

  /* 流式读取 SSE，累积全文并回调 */
  async function streamChat(messages, opts, cfg, handlers) {
    const url = endpoint(cfg);
    if (!url) throw new Error("尚未配置代理地址");
    const ctl = timeoutController(handlers.signal);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify(buildBody(messages, opts, cfg)),
        signal: ctl.signal
      });
    } catch (e) {
      ctl.done();
      if (e.name === "AbortError") throw new Error("请求超时或已取消");
      throw new Error("网络无法连接解读服务");
    }
    if (!res.ok) {
      ctl.done();
      throw new Error(await readError(res));
    }

    const type = res.headers.get("content-type") || "";
    if (!res.body || type.indexOf("application/json") >= 0) {
      const json = await res.json().catch(function () { return null; });
      ctl.done();
      const text = json && json.choices && json.choices[0] && json.choices[0].message
        ? json.choices[0].message.content : "";
      if (!text) throw new Error("解读服务没有返回内容");
      if (handlers.onDelta) handlers.onDelta(text, text);
      return text;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.indexOf("data:") !== 0) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          let piece = "";
          try {
            const json = JSON.parse(data);
            const delta = json.choices && json.choices[0] && json.choices[0].delta;
            piece = (delta && delta.content) || "";
          } catch (e) {
            piece = "";
          }
          if (piece) {
            full += piece;
            if (handlers.onDelta) handlers.onDelta(full, piece);
          }
        }
      }
    } catch (e) {
      if (e.name === "AbortError") throw new Error("请求超时或已取消");
      throw new Error("解读流被中断");
    } finally {
      ctl.done();
    }
    if (!full.trim()) throw new Error("解读服务没有返回内容");
    return full;
  }

  async function requestOnce(messages, opts, cfg) {
    const url = endpoint(cfg);
    if (!url) throw new Error("尚未配置代理地址");
    const ctl = timeoutController();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify(buildBody(messages, opts, cfg)),
        signal: ctl.signal
      });
      if (!res.ok) throw new Error(await readError(res));
      const json = await res.json();
      const msg = json && json.choices && json.choices[0] && json.choices[0].message;
      return (msg && msg.content) || "";
    } finally {
      ctl.done();
    }
  }

  async function stage1(payload, cfg, handlers) {
    if (handlers.onStage) handlers.onStage("understanding");
    const text = await requestOnce(
      window.TarotPrompt.buildStage1Messages(payload),
      { stream: false, maxTokens: 260, temperature: 0.2, json: true },
      cfg
    );
    return window.TarotPrompt.parseJSON(text);
  }

  function cacheKey(payload) {
    return (payload.spreadId || "") + "|" + (payload.question || "").replace(/\s+/g, "") + "|" +
      payload.cards.map(function (c) {
        return c.name + (c.orientation === "逆位" ? "R" : "U");
      }).join(",");
  }

  function readCache(key) {
    try {
      const map = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}") || {};
      const item = map[key];
      if (!item || Date.now() - item.at > CACHE_TTL) return null;
      return item.text;
    } catch (e) {
      return null;
    }
  }

  function writeCache(key, text) {
    try {
      const map = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}") || {};
      map[key] = { at: Date.now(), text: text };
      const keys = Object.keys(map);
      while (keys.length > CACHE_MAX) {
        const oldest = keys.reduce(function (a, b) {
          return map[a].at <= map[b].at ? a : b;
        });
        delete map[oldest];
        const pos = keys.indexOf(oldest);
        if (pos >= 0) keys.splice(pos, 1);
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch (e) {
      /* ignore */
    }
  }

  /* 主入口：返回 { text, ctx, cached }；失败抛出错误，由 app.js 回退 */
  async function interpret(payload, handlers) {
    handlers = handlers || {};
    const cfg = getConfig();
    if (!isConfigured(cfg)) throw new Error("AI 解读尚未启用");
    if (typeof window.TarotPrompt === "undefined") throw new Error("提示词模块未加载");

    const key = cacheKey(payload);
    const cached = readCache(key);
    if (cached) {
      if (handlers.onDelta) handlers.onDelta(cached, cached);
      return { text: cached, ctx: null, cached: true };
    }

    let ctx = null;
    try {
      ctx = await stage1(payload, cfg, handlers);
    } catch (e) {
      ctx = null;
    }
    if (handlers.onStage) handlers.onStage("writing");

    const messages = window.TarotPrompt.buildReadingMessages(
      Object.assign({}, payload, { aiCtx: ctx })
    );
    const text = await streamChat(messages, { stream: true, maxTokens: 1500, temperature: 0.78 },
      cfg, handlers);
    writeCache(key, text);
    return { text: text, ctx: ctx, cached: false };
  }

  async function test(cfg) {
    const c = cfg || getConfig();
    const ready = c.mode === "direct" ? !!String(c.key || "").trim() : !!String(c.proxy || "").trim();
    if (!ready) {
      return { ok: false, message: c.mode === "direct" ? "请先填写 API Key" : "请先填写代理地址" };
    }
    try {
      const text = await requestOnce(
        [
          { role: "system", content: "只回复两个字：可以。" },
          { role: "user", content: "连接测试" }
        ],
        { stream: false, maxTokens: 8, temperature: 0 },
        c
      );
      if (!String(text).trim()) return { ok: false, message: "服务有响应，但没有内容" };
      return { ok: true, message: "连接正常，模型已就绪" };
    } catch (e) {
      return { ok: false, message: e.message || "连接失败" };
    }
  }

  window.TarotAI = {
    getConfig: getConfig,
    setConfig: setConfig,
    clearConfig: clearConfig,
    isConfigured: isConfigured,
    interpret: interpret,
    test: test
  };
})();
