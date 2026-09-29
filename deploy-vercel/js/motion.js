/* =========================================================================
   Brisa Engenharia · motor de movimento (sistema de movimento BuildV)
   Sem biblioteca. Usa o scroll real da janela, então sticky, :target e a
   barra do navegador continuam funcionando.

   O header e as âncoras funcionam SEMPRE. Reveals, cena travada, parallax,
   scroll suave e cursor só rodam com html[data-motion] (que já não é ligado
   com prefers-reduced-motion).
   ========================================================================= */
(function () {
  "use strict";

  window.__brisaMotion = true;

  var d = document.documentElement;
  var MOTION = d.hasAttribute("data-motion");
  var FINE = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hdr = document.querySelector(".hdr");
  var vh = window.innerHeight;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hdrOffset() { return (hdr ? parseFloat(getComputedStyle(d).getPropertyValue("--hdr-s")) || 68 : 0) + 4; }
  function locked() { return document.body.style.overflow === "hidden"; }

  /* ------------------------------------------------------------ header */
  var isHome = !!document.querySelector(".hero");
  function headerState() {
    if (!hdr || !isHome) return;
    hdr.setAttribute("data-solid", window.pageYOffset > 40 ? "true" : "false");
  }

  /* ------------------------------------------------ título palavra a palavra */
  function split(el) {
    if (el.children.length) return;                /* só texto puro */
    var txt = el.textContent.replace(/[ \t\r\n]+/g, " ").trim();   /* preserva &nbsp; */
    if (!txt) return;
    el.setAttribute("aria-label", txt.replace(/\u00a0/g, " "));
    var holder = document.createElement("span");
    holder.setAttribute("aria-hidden", "true");
    txt.split(" ").forEach(function (w, i, all) {
      var s = document.createElement("span");
      s.className = "w";
      var inner = document.createElement("i");
      inner.textContent = w;
      s.style.setProperty("--wi", i);
      s.appendChild(inner);
      holder.appendChild(s);
      if (i < all.length - 1) holder.appendChild(document.createTextNode(" "));
    });
    el.textContent = "";
    el.appendChild(holder);
  }

  /* ------------------------------------------------------------- reveals */
  var pending = [];

  function prep() {
    document.querySelectorAll("[data-split]").forEach(split);
    var els = [].slice.call(document.querySelectorAll("[data-reveal],[data-split]"));
    els.forEach(function (el) {
      if (!el.hasAttribute("data-reveal")) return;
      var sibs = [].filter.call(el.parentElement.children, function (c) { return c.hasAttribute("data-reveal"); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty("--rv-d", Math.min(i, 6) * 80 + "ms");
    });
    pending = els;
  }

  function doneMask(el) {
    if (el.getAttribute("data-reveal") !== "mask") return;
    var fin = function (e) {
      if (e && e.target !== el) return;
      el.classList.add("rv-done");
      el.style.clipPath = "none";            /* libera o contorno de foco do botão */
      el.removeEventListener("transitionend", fin);
    };
    el.addEventListener("transitionend", fin);
    setTimeout(fin, 2200);
  }

  function show(el, instant) {
    if (el.classList.contains("is-in")) return;
    if (instant) el.classList.add("no-anim");
    el.classList.add("is-in");
    if (instant) {
      if (el.getAttribute("data-reveal") === "mask") { el.classList.add("rv-done"); el.style.clipPath = "none"; }
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove("no-anim"); }); });
    } else {
      doneMask(el);
    }
  }

  /* ARMADILHA: um elemento com clip-path fechado (inset 100%) tem área visível
     zero. O IntersectionObserver nunca o dá como visível, e o lazy loading do
     navegador também não carrega as imagens dentro dele. Por isso as máscaras
     são observadas pelo PAI (que não é recortado), e as imagens delas trocam
     para loading="eager" quando o pai chega a 1,5 tela de distância. */
  var io = null;
  function watch() {
    if (!("IntersectionObserver" in window)) {
      pending.forEach(function (el) { show(el, true); });
      document.querySelectorAll('[data-reveal="mask"] img[loading="lazy"]').forEach(function (i) { i.loading = "eager"; });
      return;
    }
    var hosts = new Map();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var kids = hosts.get(en.target);
        if (kids) kids.forEach(function (k) { show(k); });
        else show(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    var pre = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (hosts.get(en.target) || []).forEach(function (k) {
          k.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = "eager"; });
        });
        pre.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px 150% 0px" });

    pending.forEach(function (el) {
      if (el.getAttribute("data-reveal") === "mask") {
        var h = el.parentElement;
        if (!hosts.has(h)) { hosts.set(h, []); io.observe(h); pre.observe(h); }
        hosts.get(h).push(el);
      } else {
        io.observe(el);
      }
    });
  }

  /* camada 1: o que já está na tela entra por timer, não por observer */
  function firstScreen() {
    pending.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) show(el);
    });
  }

  /* camada 3: saltos (âncora, hash, arraste da barra) revelam o que ficou para trás */
  function flush() {
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      if (el.classList.contains("is-in")) continue;
      if (el.getBoundingClientRect().bottom < vh * 0.3) show(el, true);
    }
  }

  /* ------------------------------------------------------- hero: janela */
  function heroIntro() {
    var intro = d.hasAttribute("data-intro");
    var img = document.querySelector(".hero__media img");
    var go = function () { d.classList.add("hero-go"); };

    if (!isHome) { go(); return; }

    var ready = new Promise(function (res) {
      if (!img) return res();
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
      setTimeout(res, 1400);
    });

    if (intro) {
      var t0 = Date.now();
      ready.then(function () {
        var wait = Math.max(0, 1150 - (Date.now() - t0));
        setTimeout(function () {
          d.classList.add("ld-out");
          setTimeout(go, 180);
          setTimeout(function () {
            d.removeAttribute("data-intro");
            d.classList.remove("ld-out");
            try { sessionStorage.setItem("brisa_intro", "1"); } catch (e) {}
          }, 1300);
        }, wait);
      });
    } else {
      ready.then(function () { requestAnimationFrame(go); });
    }
  }

  /* ------------------------------------------------------------ parallax */
  var plx = [];
  function plxPrep() {
    plx = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
      return { el: el, f: parseFloat(el.getAttribute("data-parallax")) || 0.08, host: el.closest("section") || el.parentElement };
    });
  }
  function plxRun() {
    for (var i = 0; i < plx.length; i++) {
      var o = plx[i], r = o.host.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      var c = (r.top + r.height / 2) - vh / 2;
      var y = clamp(-c * o.f, -r.height * 0.09, r.height * 0.09);
      o.el.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
    }
  }

  /* ------------------------------------------------- método: cena travada */
  var htl = document.querySelector("[data-htl]");
  var htlFill = htl ? htl.querySelector("[data-htl-fill]") : null;
  var htlItems = htl ? [].slice.call(htl.querySelectorAll("[data-htl-item]")) : [];
  var pinOn = false;

  function htlMode() {
    if (!htl) return;
    var want = MOTION && window.innerWidth >= 1025 && window.innerHeight >= 640;
    if (want) {
      htl.setAttribute("data-pin", "on");
      htl.style.height = Math.round(window.innerHeight * 2.4) + "px";   /* recalculado em todo resize */
      pinOn = true;
      htlRun();
    } else {
      htl.removeAttribute("data-pin");
      htl.style.height = "";
      if (htlFill) htlFill.style.removeProperty("--p");
      htlItems.forEach(function (it) { it.setAttribute("data-on", ""); });
      pinOn = false;
    }
  }
  function htlRun() {
    if (!pinOn) return;
    var r = htl.getBoundingClientRect();
    var span = r.height - vh;
    var p = span > 0 ? clamp(-r.top / span, 0, 1) : 1;
    var f = clamp((p - 0.05) / 0.72, 0, 1);
    if (htlFill) htlFill.style.setProperty("--p", f.toFixed(4));
    var n = htlItems.length;
    htlItems.forEach(function (it, i) {
      var t = n > 1 ? i / (n - 1) : 0;
      if (f >= t - 0.02 && r.top < vh * 0.5) it.setAttribute("data-on", "");
      else it.removeAttribute("data-on");
    });
  }

  /* --------------------------------------------------- scroll suave (lerp) */
  var cur = window.pageYOffset, tgt = cur, raf = 0, ours = false;
  var lerpOn = MOTION && FINE;

  function maxY() { return d.scrollHeight - window.innerHeight; }
  function loop() {
    cur += (tgt - cur) * 0.105;
    if (Math.abs(tgt - cur) < 0.5) cur = tgt;
    ours = true;
    window.scrollTo(0, cur);
    if (cur !== tgt) raf = requestAnimationFrame(loop);
    else raf = 0;
  }
  function ssTo(y) {
    tgt = clamp(y, 0, maxY());
    if (!lerpOn) { window.scrollTo({ top: tgt, behavior: MOTION ? "smooth" : "auto" }); return; }
    cur = window.pageYOffset;
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function scrollable(el) {
    for (var i = 0; el && el !== document.body && i < 8; i++, el = el.parentElement) {
      var s = getComputedStyle(el).overflowY;
      if ((s === "auto" || s === "scroll") && el.scrollHeight > el.clientHeight) return true;
    }
    return false;
  }
  if (lerpOn) {
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || locked() || scrollable(e.target)) return;
      e.preventDefault();
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (!raf) { cur = window.pageYOffset; tgt = cur; }
      tgt = clamp(tgt + dy, 0, maxY());
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: false });
  }

  /* âncoras: o motor desconta o header e move o foco para a seção */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    var fromMenu = !!a.closest(".drawer");
    if (fromMenu && window.brisaCloseDrawer) window.brisaCloseDrawer(true);
    setTimeout(function () {
      var y = el.id === "topo" ? 0 : el.getBoundingClientRect().top + window.pageYOffset - hdrOffset();
      ssTo(y);
      if (history.replaceState) history.replaceState(null, "", id);
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }, fromMenu ? 420 : 60);
  });

  /* --------------------------------------------------- cursor "Ver obra" */
  function cursor() {
    var host = document.querySelector("[data-cursor]");
    var c = document.querySelector(".cur");
    if (!host || !c || !MOTION || !FINE) return;
    var x = -200, y = -200, tx = x, ty = y, s = 0.4, ts = 0.4, on = false, r = 0;
    function tick() {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22; s += (ts - s) * 0.18;
      c.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 || Math.abs(ts - s) > 0.005) r = requestAnimationFrame(tick);
      else r = 0;
    }
    function kick() { if (!r) r = requestAnimationFrame(tick); }
    host.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      var over = !!(e.target.closest && e.target.closest(".obra__btn"));
      if (over !== on) {
        on = over; ts = on ? 1 : 0.4;
        c.setAttribute("data-on", on ? "true" : "false");
        if (on) host.setAttribute("data-cur-on", ""); else host.removeAttribute("data-cur-on");
        if (on && x < -100) { x = tx; y = ty; }
      }
      kick();
    });
    host.addEventListener("pointerleave", function () {
      on = false; ts = 0.4; c.setAttribute("data-on", "false"); host.removeAttribute("data-cur-on"); kick();
    });
  }

  /* --------------------------------------------------------------- laço */
  var ticking = false;
  function onScroll() {
    if (!ours) { cur = tgt = window.pageYOffset; }      /* barra, teclado, toque */
    ours = false;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      headerState();
      if (MOTION) { plxRun(); htlRun(); flush(); }
    });
  }

  var rz = 0;
  function onResize() {
    clearTimeout(rz);
    rz = setTimeout(function () {
      vh = window.innerHeight;
      htlMode();
      if (MOTION) plxRun();
    }, 120);
  }

  /* --------------------------------------------------------------- início */
  headerState();
  if (MOTION) {
    prep();
    plxPrep();
    watch();
    setTimeout(firstScreen, 140);
    requestAnimationFrame(function () { firstScreen(); });
    heroIntro();
    cursor();
    plxRun();
  }
  htlMode();
  if (location.hash && MOTION) setTimeout(flush, 400);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
})();
