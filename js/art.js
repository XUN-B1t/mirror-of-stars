/* 星辰之镜 · 牌背纹样
   牌面采用 1909 年 Rider–Waite–Smith 公版图像（cards/*.jpg），
   此文件只负责生成深靛金线的牌背。 */

(function () {
  "use strict";

  const GOLD = "#c9a96b";
  const GOLD_LIGHT = "#e6d0a0";

  let uid = 0;

  function line(x1, y1, x2, y2, color, width, opacity) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + color + '" stroke-width="' + width + '" stroke-opacity="' + opacity + '"/>';
  }

  function starPoints(cx, cy, spikes, outer, inner) {
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(" ");
  }

  function smallStar(cx, cy, r, color, opacity) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color +
      '" fill-opacity="' + opacity + '"/>';
  }

  function backSVG() {
    const u = ++uid;
    let lattice = "";
    for (let i = -320; i <= 160; i += 34) {
      lattice += line(i, 340, i + 340, 0, GOLD, 0.5, 0.12);
      lattice += line(i, 0, i + 340, 340, GOLD, 0.5, 0.12);
    }
    let stars = "";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      stars += smallStar(100 + Math.cos(a) * 44, 166 + Math.sin(a) * 44, i % 2 ? 2.4 : 3.2, GOLD_LIGHT, 0.7);
    }
    return '<svg class="card-svg card-svg--back" viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' +
      '<linearGradient id="bk' + u + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#1b1636"/>' +
      '<stop offset="48%" stop-color="#131027"/>' +
      '<stop offset="100%" stop-color="#0b0918"/>' +
      '</linearGradient>' +
      '<radialGradient id="bg' + u + '" cx="50%" cy="46%" r="60%">' +
      '<stop offset="0%" stop-color="rgba(201,169,107,.20)"/>' +
      '<stop offset="72%" stop-color="rgba(201,169,107,0)"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="200" height="340" rx="9" fill="url(#bk' + u + ')"/>' +
      '<rect x="0" y="0" width="200" height="340" rx="9" fill="url(#bg' + u + ')"/>' +
      '<g>' + lattice + '</g>' +
      '<rect x="5" y="5" width="190" height="330" rx="7" fill="none" stroke="#c9a96b" stroke-width="1.1" stroke-opacity=".62"/>' +
      '<rect x="10" y="10" width="180" height="320" rx="4" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".34"/>' +
      '<rect x="14" y="14" width="172" height="312" rx="3" fill="none" stroke="#c9a96b" stroke-width=".45" stroke-opacity=".18"/>' +
      '<circle cx="100" cy="166" r="62" fill="none" stroke="#c9a96b" stroke-width=".8" stroke-opacity=".48"/>' +
      '<circle cx="100" cy="166" r="55" fill="none" stroke="#c9a96b" stroke-width=".5" stroke-opacity=".3"/>' +
      '<circle cx="100" cy="166" r="31" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".4"/>' +
      '<circle cx="108" cy="160" r="25" fill="#131027" stroke="none"/>' +
      '<circle cx="100" cy="166" r="27" fill="none" stroke="#e6d0a0" stroke-width=".9" stroke-opacity=".85"/>' +
      '<polygon points="' + starPoints(100, 166, 8, 20, 8) + '" fill="none" stroke="#e6d0a0" stroke-width=".9" stroke-opacity=".85"/>' +
      '<circle cx="100" cy="166" r="3" fill="none" stroke="#e6d0a0" stroke-width=".8" stroke-opacity=".8"/>' +
      '<polygon points="' + starPoints(100, 46, 4, 9, 3) + '" fill="none" stroke="#c9a96b" stroke-width=".8" stroke-opacity=".7"/>' +
      '<polygon points="' + starPoints(100, 292, 4, 9, 3) + '" fill="none" stroke="#c9a96b" stroke-width=".8" stroke-opacity=".7"/>' +
      stars +
      '<path d="M22,44 C34,34 46,34 56,44" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".4"/>' +
      '<path d="M178,44 C166,34 154,34 144,44" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".4"/>' +
      '<path d="M22,296 C34,306 46,306 56,296" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".4"/>' +
      '<path d="M178,296 C166,306 154,306 144,296" fill="none" stroke="#c9a96b" stroke-width=".6" stroke-opacity=".4"/>' +
      '<line x1="82" y1="80" x2="118" y2="80" stroke="#c9a96b" stroke-width=".5" stroke-opacity=".25"/>' +
      '<line x1="82" y1="252" x2="118" y2="252" stroke="#c9a96b" stroke-width=".5" stroke-opacity=".25"/>' +
      '</svg>';
  }

  function face(card) {
    const src = (window.TAROT_IMAGES && window.TAROT_IMAGES[card.id]) ||
      ("cards/" + card.id + ".jpg");
    return '<img class="card-img" src="' + src + '" alt="' +
      card.name + '" draggable="false" decoding="async">';
  }

  window.TarotArt = { face: face, back: backSVG };
})();
