/* =========================================================================
   Brisa Engenharia · comportamento do site (independente do motor de movimento)
   ========================================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------------- WhatsApp
     Número informado pela cliente na revisão de 2026-09-29: 41 9 9924-3868. */
  var WA = "5541999243868";

  function waLink(assunto) {
    var base = "Olá! Vim pelo site da Brisa Engenharia";
    var txt = assunto ? base + " e gostaria de solicitar um orçamento para " + assunto + "."
                      : base + " e gostaria de solicitar um orçamento.";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(txt);
  }

  document.querySelectorAll("[data-wa-btn]").forEach(function (el) {
    el.setAttribute("href", waLink(el.getAttribute("data-wa-btn")));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  /* ------------------------------------------------- menu em tela cheia */
  var hdr = document.querySelector(".hdr");
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  var lastFocus = null;

  if (drawer) drawer.inert = true;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.inert = false;
    drawer.dataset.open = "true";
    if (hdr) hdr.setAttribute("data-menu", "open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fechar menu");
    document.body.style.overflow = "hidden";
    var first = drawer.querySelector("a,button");
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeDrawer(keepFocus) {
    if (!drawer || drawer.dataset.open !== "true") return;
    drawer.dataset.open = "false";
    drawer.inert = true;
    if (hdr) hdr.removeAttribute("data-menu");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Abrir menu");
    document.body.style.overflow = "";
    if (!keepFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.brisaCloseDrawer = closeDrawer;

  if (burger) {
    burger.addEventListener("click", function () {
      drawer.dataset.open === "true" ? closeDrawer() : openDrawer();
    });
  }

  /* com o menu aberto o Tab circula entre o X e os itens do menu */
  document.addEventListener("keydown", function (e) {
    if (!drawer || drawer.dataset.open !== "true") return;
    if (e.key === "Escape") { closeDrawer(); return; }
    if (e.key !== "Tab") return;
    var f = [burger].concat([].slice.call(drawer.querySelectorAll("a[href],button")));
    var i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1024) closeDrawer(true);
  });

  /* ------------------------------------------------- seção ativa no menu */
  var navLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secs = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); });

  if (navLinks.length) {
    var markActive = function () {
      var y = window.innerHeight * 0.4;
      var idx = -1;
      secs.forEach(function (s, i) {
        if (!s) return;
        var r = s.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) idx = i;
      });
      navLinks.forEach(function (a, i) {
        if (i === idx) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    var t = false;
    window.addEventListener("scroll", function () {
      if (t) return; t = true;
      requestAnimationFrame(function () { t = false; markActive(); });
    }, { passive: true });
    markActive();
  }

  /* ------------------------------------------ serviços: acordeão + foto
     Um item aberto por vez. A foto da coluna acompanha o item aberto. */
  var svc = document.querySelector("[data-svc]");
  if (svc) {
    var items = [].slice.call(svc.querySelectorAll(".svc__it"));
    var imgs = [].slice.call(document.querySelectorAll("[data-svc-img]"));

    var abrir = function (idx) {
      items.forEach(function (it, i) {
        var on = i === idx;
        it.classList.toggle("is-open", on);
        it.querySelector(".svc__btn").setAttribute("aria-expanded", on ? "true" : "false");
      });
      imgs.forEach(function (im) {
        im.classList.toggle("is-on", +im.getAttribute("data-svc-img") === idx);
      });
    };

    items.forEach(function (it, i) {
      it.querySelector(".svc__btn").addEventListener("click", function () {
        if (it.classList.contains("is-open")) return;   /* sempre um aberto: a foto nunca fica vazia */
        abrir(i);
      });
    });
  }

  /* ------------------------------------------------------------- lightbox */
  var lb = document.querySelector(".lb");
  if (lb) {
    var lbImg = lb.querySelector(".lb__stage img");
    var lbTitle = lb.querySelector(".lb__title");
    var lbSub = lb.querySelector(".lb__sub");
    var lbCount = lb.querySelector(".lb__count");
    var btnPrev = lb.querySelector(".lb__nav--prev");
    var btnNext = lb.querySelector(".lb__nav--next");
    var btnClose = lb.querySelector(".lb__close");
    var list = [], at = 0, title = "", opener = null, swapT = 0;

    var render = function (swap) {
      var put = function () {
        lbImg.src = list[at];
        lbImg.alt = title + ", foto " + (at + 1) + " de " + list.length;
        lbImg.classList.remove("is-swap");
      };
      clearTimeout(swapT);
      if (swap) { lbImg.classList.add("is-swap"); swapT = setTimeout(put, 180); }
      else put();
      lbCount.textContent = String(at + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
      var solo = list.length < 2;
      btnPrev.hidden = solo;
      btnNext.hidden = solo;
      lbCount.hidden = solo;
      /* pré-carrega a vizinha */
      if (!solo) { var pre = new Image(); pre.src = list[(at + 1) % list.length]; }
    };

    var open = function (el) {
      var g = el.getAttribute("data-gallery");
      if (!g) return;
      list = g.split("|").filter(Boolean);
      title = el.getAttribute("data-title") || "Obra";
      lbTitle.textContent = title;
      lbSub.textContent = el.getAttribute("data-sub") || "";
      at = 0; opener = el;
      render(false);
      lb.dataset.open = "true";
      document.body.style.overflow = "hidden";
      btnClose.focus();
    };

    var close = function () {
      lb.dataset.open = "false";
      document.body.style.overflow = "";
      setTimeout(function () { if (lb.dataset.open !== "true") lbImg.removeAttribute("src"); }, 500);
      if (opener && opener.focus) opener.focus();
    };

    var step = function (dir) {
      if (list.length < 2) return;
      at = (at + dir + list.length) % list.length;
      render(true);
    };

    document.querySelectorAll("[data-gallery]").forEach(function (el) {
      el.addEventListener("click", function () { open(el); });
    });

    btnPrev.addEventListener("click", function () { step(-1); });
    btnNext.addEventListener("click", function () { step(1); });
    btnClose.addEventListener("click", close);
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lb__stage")) close();
    });

    /* arrastar no toque troca a foto */
    var sx = null, sy = null;
    lb.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
      sx = sy = null;
    });

    document.addEventListener("keydown", function (e) {
      if (lb.dataset.open !== "true") return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "Tab") {
        var f = [].slice.call(lb.querySelectorAll("button:not([hidden])"));
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* ------------------------------------------- CTA abre o popup do Merlin
     O href do WhatsApp continua sendo o destino real sempre que o Merlin não
     estiver disponível (sem JS, antes do script carregar, vendor fora). Só
     interceptamos quando o botão do widget existe no DOM. Links de contato
     simples (número, e-mail) não entram aqui: quem clica num número espera
     o WhatsApp, e eles são a rota de escape acessível. */
  document.addEventListener("click", function (e) {
    var cta = e.target.closest && e.target.closest('a.btn[href*="wa.me"]');
    if (!cta) return;
    var botao = document.querySelector(".merlin-button-popup");
    if (!botao) return;
    e.preventDefault();
    if (cta.closest(".drawer")) closeDrawer(true);
    if (botao.classList.contains("merlin-hidden")) return;
    botao.click();
  });

  /* ----------------------------------------- acessibilidade do widget Merlin
     O vendor injeta um <button> só com <img> sem alt: leitor de tela anuncia
     "botão" sem nome (WCAG 4.1.2 e 1.1.1). Quando ele aparece, damos nome ao
     botão e tiramos a imagem decorativa da leitura. */
  var nomeiaMerlin = function () {
    var bt = document.querySelector(".merlin-button-popup");
    if (!bt) return false;
    if (!bt.getAttribute("aria-label")) bt.setAttribute("aria-label", "Solicitar orçamento pelo WhatsApp");
    bt.querySelectorAll("img:not([alt])").forEach(function (i) { i.setAttribute("alt", ""); });
    return true;
  };
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function () { if (nomeiaMerlin()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 20000);
  }

  /* ------------------------------------------------------- banner de cookies
     O consentimento emite evento no dataLayer para as tags respeitarem a LGPD. */
  var KEY = "brisa_consent_v1";
  var cookie = document.querySelector(".cookie");

  window.dataLayer = window.dataLayer || [];
  function push(state) { window.dataLayer.push({ event: "brisa_consent", consent_state: state }); }

  if (cookie) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { saved = null; }

    /* O aviso não nasce em cima do hero: aparece no primeiro scroll (ou de
       imediato nas páginas sem hero). Até lá nada é medido, porque o Consent
       Mode já começa em "denied". */
    if (saved) push(saved);
    else {
      var mostrar = function () {
        if (cookie.dataset.open === "true") return;
        cookie.dataset.open = "true";
        window.removeEventListener("scroll", porScroll);
      };
      var porScroll = function () { if (window.pageYOffset > 160) mostrar(); };
      if (document.querySelector(".hero")) window.addEventListener("scroll", porScroll, { passive: true });
      else setTimeout(mostrar, 1200);
    }

    var aviso = document.createElement("p");
    aviso.className = "sr-only";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    document.body.appendChild(aviso);

    cookie.querySelectorAll("[data-consent]").forEach(function (b) {
      b.addEventListener("click", function () {
        var state = b.getAttribute("data-consent");
        try { localStorage.setItem(KEY, state); } catch (err) { /* modo privado */ }
        if (typeof window.gtag === "function") {
          window.gtag("consent", "update", {
            ad_storage: state, ad_user_data: state, ad_personalization: state, analytics_storage: state
          });
        }
        push(state);
        cookie.dataset.open = "false";
        document.dispatchEvent(new CustomEvent("brisa:consent", { detail: state }));
        aviso.textContent = state === "granted"
          ? "Cookies aceitos. O aviso foi fechado."
          : "Cookies recusados. O aviso foi fechado e nada será medido.";
      });
    });
  }

  /* ------------------------------------------------------------- ano atual */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
