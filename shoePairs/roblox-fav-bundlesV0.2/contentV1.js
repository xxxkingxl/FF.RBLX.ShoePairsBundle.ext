(() => {
  if (window.top !== window) return;

  const LABEL = "Shoe Pairs";   // name of the new entry
  const TYPE = "Shoes";         // bundleType shown by it

  let data = null, loading = null;
  let gridEl = null, hiddenNative = null;

  const style = document.createElement("style");
  style.textContent = `
    .rfb-wrap{display:flex;flex-wrap:wrap;gap:8px;padding:0 0 16px 0}
    .rfb-msg{font-size:14px;opacity:.7;padding:8px 0}
    .rfb-card{display:block;width:113px;color:inherit;text-decoration:none}
    .rfb-thumb{width:113px;height:113px;border-radius:6px;background:rgba(128,128,128,.28);overflow:hidden}
    .rfb-thumb img{width:100%;height:100%;display:block}
    .rfb-name{font-size:14px;line-height:18px;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .rfb-by{font-size:11px;opacity:.8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rfb-price{font-size:14px;margin-top:2px;display:flex;align-items:center;gap:4px}
    .rfb-price svg{width:14px;height:14px}
  `;
  document.documentElement.appendChild(style);

  function textNode(text) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.nodeValue.trim() === text) return n;
    return null;
  }

  // Add our entry next to "Left Shoe" / "Right Shoe" whenever that menu is open.
  function tryInject() {
    if (!/favorites/i.test(location.pathname)) return;
    const existing = document.querySelector("[data-rfb-row]");
    if (existing && existing.isConnected) return;
    const l = textNode("Left Shoe"), r = textNode("Right Shoe");
    if (!l || !r) return;

    let common = r.parentElement;
    while (common && !common.contains(l)) common = common.parentElement;
    if (!common || common === r.parentElement) return;
    let row = r.parentElement;
    while (row.parentElement !== common) row = row.parentElement;

    const clone = row.cloneNode(true);
    clone.setAttribute("data-rfb-row", "1");
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    clone.removeAttribute("href");
    clone.querySelectorAll("[href]").forEach(e => e.removeAttribute("href"));
    const w = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.trim() === "Right Shoe") n.nodeValue = LABEL;
    }
    clone.style.cursor = "pointer";
    clone.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPairs(clone);
    }, true);
    common.insertBefore(clone, row.nextSibling);
  }

  function countCards(el) {
    return el.querySelectorAll('a[href*="/catalog/"], a[href*="/bundles/"]').length;
  }

  function findNativeGrid() {
    const a = [...document.querySelectorAll('a[href*="/catalog/"], a[href*="/bundles/"]')]
      .find(x => /\/(catalog|bundles)\/\d+/.test(x.getAttribute("href")));
    if (!a) return null;
    let node = a;
    while (node.parentElement && countCards(node.parentElement) <= 1) node = node.parentElement;
    return node.parentElement;
  }

  function cleanup() {
    if (gridEl) { gridEl.remove(); gridEl = null; }
    if (hiddenNative) { hiddenNative.style.display = ""; hiddenNative = null; }
    document.querySelectorAll("[data-rfb-row]").forEach(e => { e.style.backgroundColor = ""; });
  }

  function priceEl(d) {
    const p = document.createElement("div");
    p.className = "rfb-price";
    if (!d.forSale) { p.textContent = "Off sale"; return p; }
    if (d.price == null) return p;
    p.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 1.5l5.6 3.25v6.5L8 14.5l-5.6-3.25v-6.5z"/><rect x="6" y="6" width="4" height="4" fill="currentColor" stroke="none"/></svg>';
    p.appendChild(document.createTextNode(String(d.price)));
    return p;
  }

  function render() {
    if (!gridEl) return;
    gridEl.textContent = "";
    const items = (data || []).filter(d => d.type === TYPE);
    if (!items.length) {
      const m = document.createElement("div");
      m.className = "rfb-msg";
      m.textContent = "No favorited shoe pairs found.";
      gridEl.appendChild(m);
      return;
    }
    for (const d of items) {
      const a = document.createElement("a");
      a.className = "rfb-card";
      a.href = "https://www.roblox.com/bundles/" + d.id;
      const t = document.createElement("div");
      t.className = "rfb-thumb";
      if (d.thumb) { const img = document.createElement("img"); img.src = d.thumb; img.alt = ""; t.appendChild(img); }
      const nm = document.createElement("div"); nm.className = "rfb-name"; nm.textContent = d.name;
      const by = document.createElement("div"); by.className = "rfb-by"; by.textContent = "By " + d.creator;
      a.append(t, nm, by, priceEl(d));
      gridEl.appendChild(a);
    }
  }

  async function showPairs(row) {
    cleanup();
    row.style.backgroundColor = "rgba(255,255,255,.12)";
    gridEl = document.createElement("div");
    gridEl.className = "rfb-wrap";
    gridEl.innerHTML = '<div class="rfb-msg">Loading…</div>';
    const native = findNativeGrid();
    if (native) {
      native.style.display = "none";
      hiddenNative = native;
      native.parentElement.insertBefore(gridEl, native);
    } else {
      (document.querySelector("main") || document.body).prepend(gridEl);
    }
    try {
      if (!data) {
        loading = loading || browser.runtime.sendMessage({ type: "getFavoriteBundles" });
        data = await loading;
      }
      render();
    } catch (e) {
      loading = null;
      if (gridEl) gridEl.innerHTML = '<div class="rfb-msg">Could not load: ' + String(e.message || e) + "</div>";
    }
  }

  // Clicking anything else (another category, a link) restores the normal list.
  document.addEventListener("click", (e) => {
    if (!gridEl) return;
    if (gridEl.contains(e.target) || e.target.closest("[data-rfb-row]")) return;
    cleanup();
  }, true);

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(tryInject, 150);
  }).observe(document.body, { childList: true, subtree: true });
  tryInject();
})();
