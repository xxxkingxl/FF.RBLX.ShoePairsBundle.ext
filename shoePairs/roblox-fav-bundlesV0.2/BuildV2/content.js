
(() => {
  if (window.top !== window) return;

  const LABEL = "Shoe Pairs";
  const TYPE = "Shoes";

  let data = null;
  let loading = null;
  let gridEl = null;
  let viewToken = 0;
  let timer = null;
  let lastPath = location.pathname;

  const style = document.createElement("style");

  style.textContent = `
    .rfb-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 0 16px;
    }

    .rfb-msg {
      font-size: 14px;
      opacity: .8;
      padding: 8px 0;
    }

    .rfb-warning {
      color: #e5b85c;
    }

    .rfb-card {
      display: block;
      width: 113px;
      color: inherit;
      text-decoration: none;
    }

    .rfb-thumb {
      width: 113px;
      height: 113px;
      border-radius: 6px;
      background: rgba(128,128,128,.28);
      overflow: hidden;
    }

    .rfb-thumb img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }

    .rfb-name {
      font-size: 14px;
      line-height: 18px;
      margin-top: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rfb-by {
      font-size: 11px;
      opacity: .8;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rfb-price {
      font-size: 14px;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rfb-price svg {
      width: 14px;
      height: 14px;
    }

    .rfb-retry {
      margin-top: 8px;
      padding: 6px 12px;
      cursor: pointer;
    }
  `;

  document.documentElement.appendChild(style);

  function textNode(text) {
    const w = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let n;

    while ((n = w.nextNode())) {
      if (n.nodeValue.trim() === text) {
        return n;
      }
    }

    return null;
  }

  function findFavoritesHeading() {
    return [...document.querySelectorAll("h1,h2,h3")]
      .find(el => el.textContent.trim() === "My Favorites");
  }

  function findFavoritesMount() {
    const heading = findFavoritesHeading();

    if (heading) {
      return heading.parentElement;
    }

    return document.querySelector("main");
  }

  // Add our entry next to Left Shoe / Right Shoe.
  function tryInject() {
    if (!/favorites/i.test(location.pathname)) return;

    const existing = document.querySelector("[data-rfb-row]");

    if (existing && existing.isConnected) return;

    const l = textNode("Left Shoe");
    const r = textNode("Right Shoe");

    if (!l || !r) return;

    let common = r.parentElement;

    while (common && !common.contains(l)) {
      common = common.parentElement;
    }

    if (!common || common === r.parentElement) return;

    let row = r.parentElement;

    while (row.parentElement !== common) {
      row = row.parentElement;
    }

    const clone = row.cloneNode(true);

    clone.setAttribute("data-rfb-row", "1");
    clone.removeAttribute("id");

    clone.querySelectorAll("[id]").forEach(e => {
      e.removeAttribute("id");
    });

    clone.removeAttribute("href");

    clone.querySelectorAll("[href]").forEach(e => {
      e.removeAttribute("href");
    });

    const w = document.createTreeWalker(
      clone,
      NodeFilter.SHOW_TEXT
    );

    let n;

    while ((n = w.nextNode())) {
      if (n.nodeValue.trim() === "Right Shoe") {
        n.nodeValue = LABEL;
      }
    }

    clone.style.cursor = "pointer";

    clone.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      showPairs(clone);
    }, true);

    common.insertBefore(clone, row.nextSibling);
  }

  function cleanup() {
    viewToken++;

    if (gridEl) {
      gridEl.remove();
      gridEl = null;
    }

    document.querySelectorAll("[data-rfb-row]").forEach(e => {
      e.style.backgroundColor = "";
    });
  }

  function priceEl(d) {
    const p = document.createElement("div");

    p.className = "rfb-price";

    if (!d.forSale) {
      p.textContent = "Off sale";
      return p;
    }

    if (d.price == null) return p;

    p.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">' +
      '<path d="M8 1.5l5.6 3.25v6.5L8 14.5l-5.6-3.25v-6.5z"/>' +
      '<rect x="6" y="6" width="4" height="4" fill="currentColor" stroke="none"/>' +
      '</svg>';

    p.appendChild(
      document.createTextNode(String(d.price))
    );

    return p;
  }

  function render() {
    if (!gridEl) return;

    gridEl.textContent = "";

    const items = (data?.items || [])
      .filter(d => d.type === TYPE);

    const errors = data?.errors || [];

    if (errors.length) {
      const warning = document.createElement("div");

      warning.className = "rfb-msg rfb-warning";

      warning.textContent =
        `Warning: ${errors.length} bundle request(s) failed. Results may be incomplete.`;

      gridEl.appendChild(warning);
    }

    if (!items.length) {
      const m = document.createElement("div");

      m.className = "rfb-msg";

      m.textContent = errors.length
        ? "Could not retrieve all shoe bundles."
        : "No favorited shoe pairs found.";

      gridEl.appendChild(m);
      return;
    }

    for (const d of items) {
      const a = document.createElement("a");

      a.className = "rfb-card";
      a.href = "https://www.roblox.com/bundles/" + d.id;

      const t = document.createElement("div");
      t.className = "rfb-thumb";

      if (d.thumb) {
        const img = document.createElement("img");

        img.src = d.thumb;
        img.alt = "";

        img.onerror = () => img.remove();

        t.appendChild(img);
      }

      const nm = document.createElement("div");

      nm.className = "rfb-name";
      nm.textContent = d.name;

      const by = document.createElement("div");

      by.className = "rfb-by";
      by.textContent = "By " + d.creator;

      a.append(t, nm, by, priceEl(d));

      gridEl.appendChild(a);
    }
  }

  function showRetry(error, row) {
    if (!gridEl) return;

    gridEl.textContent = "";

    const message = document.createElement("div");

    message.className = "rfb-msg";

    message.textContent =
      "Could not load bundles: " +
      String(error.message || error);

    const retry = document.createElement("button");

    retry.className = "rfb-retry";
    retry.textContent = "Retry";

    retry.addEventListener("click", () => {
      loading = null;
      data = null;
      showPairs(row);
    });

    gridEl.append(message, retry);
  }

  async function showPairs(row) {
    cleanup();

    if (!row || !row.isConnected) return;

    row.style.backgroundColor = "rgba(255,255,255,.12)";

    gridEl = document.createElement("div");
    gridEl.className = "rfb-wrap";

    const message = document.createElement("div");

    message.className = "rfb-msg";
    message.textContent = "Loading…";

    gridEl.appendChild(message);

    // Never hide or modify Roblox's native Favorites grid.
    // Mount our UI below the My Favorites heading.
    const mount = findFavoritesMount();

    if (!mount) {
      gridEl.remove();
      gridEl = null;
      return;
    }

    mount.insertAdjacentElement("afterend", gridEl);

    const currentToken = viewToken;

    try {
      if (!data) {
        loading = loading ||
          browser.runtime.sendMessage({
            type: "getFavoriteBundles"
          });

        data = await loading;
      }

      if (currentToken !== viewToken || !gridEl) return;

      render();

    } catch (e) {
      if (currentToken !== viewToken || !gridEl) return;

      loading = null;

      showRetry(e, row);
    }
  }

  // Clicking elsewhere restores the normal UI.
  document.addEventListener("click", e => {
    if (!gridEl) return;

    if (
      gridEl.contains(e.target) ||
      (e.target instanceof Element &&
       e.target.closest("[data-rfb-row]"))
    ) {
      return;
    }

    cleanup();
  }, true);

  function handleNavigation() {
    const currentPath = location.pathname;

    if (currentPath !== lastPath) {
      lastPath = currentPath;

      if (!/favorites/i.test(currentPath)) {
        cleanup();

        document.querySelectorAll("[data-rfb-row]").forEach(e => {
          e.remove();
        });

        data = null;
        loading = null;

        return;
      }
    }

    tryInject();
  }

  // Detect Roblox SPA navigation and DOM updates.
  new MutationObserver(() => {
    clearTimeout(timer);

    timer = setTimeout(handleNavigation, 150);
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("popstate", handleNavigation);
  window.addEventListener("hashchange", handleNavigation);

  tryInject();
})();
