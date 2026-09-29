/* =========================================================================
   Brisa Engenharia · comportamento do site (independente do motor de movimento)
   Tudo aqui funciona também com movimento reduzido e sem as bibliotecas.
   ========================================================================= */
(function () {
  "use strict";

  var d = document.documentElement;
  var MOTION = d.hasAttribute("data-motion");
  var lenis = function () { return window.brisaLenis || null; };

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

  /* --------------------------------------------------------------- header
     Compacta depois de 40px. Depois que o hero sai, recolhe ao descer e
     volta ao subir, com foco dentro dele ou com o menu aberto. */
  var hdr = document.querySelector(".hdr");
  var heroOut = !document.querySelector(".hero");
  var lastY = window.pageYOffset;

  function headerState() {
    if (!hdr) return;
    var y = window.pageYOffset;
    hdr.setAttribute("data-solid", y > 40 ? "true" : "false");
    if (hdr.getAttribute("data-menu") === "open" || hdr.contains(document.activeElement)) {
      hdr.setAttribute("data-hide", "false");
    } else if (heroOut && y > lastY + 6) {
      hdr.setAttribute("data-hide", "true");
    } else if (y < lastY - 6 || y < 120) {
      hdr.setAttribute("data-hide", "false");
    }
    if (Math.abs(y - lastY) > 6) lastY = y;
  }
  if (hdr) {
    hdr.addEventListener("focusin", function () { hdr.setAttribute("data-hide", "false"); });
  }

  /* WCAG 1.4.4: com o texto ampliado (200%), menu e botão podem não caber
     numa linha. Em vez de empurrar o botão para fora da tela, o header passa
     para o menu em tela cheia. Medido, não adivinhado por largura. */
  var hIn = hdr && hdr.querySelector(".hdr__in");
  var nav = hdr && hdr.querySelector(".nav");
  var cabe = function () {
    if (!hIn || !nav) return;
    hdr.classList.remove("is-tight");
    if (getComputedStyle(nav).display === "none") return;
    var brand = hdr.querySelector(".brand").getBoundingClientRect();
    var n = nav.getBoundingClientRect();
    var fim = hdr.querySelector(".hdr__end").getBoundingClientRect();
    var borda = hIn.getBoundingClientRect().right - parseFloat(getComputedStyle(hIn).paddingRight);
    if (n.left < brand.right + 16 || fim.left < n.right + 16 || fim.right > borda + 1) hdr.classList.add("is-tight");
  };
  if (hIn) {
    cabe();
    window.addEventListener("resize", cabe);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(cabe);
    if ("ResizeObserver" in window) new ResizeObserver(cabe).observe(nav);
  }

  /* -------------------------------------------------- saída do hero
     Um sentinela na base do hero. Quando ele sobe acima da metade da
     janela, o hero "saiu": o header passa a poder se recolher e o aviso de
     cookies pode aparecer. Funciona com pin, sem pin e sem movimento. */
  var sentinela = document.querySelector(".hero__end");
  var avisaSaida = function () {
    if (heroOut) return;
    heroOut = true;
    document.dispatchEvent(new CustomEvent("brisa:hero-out"));
  };
  if (sentinela && "IntersectionObserver" in window) {
    var ioHero = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting || en.boundingClientRect.top < 0) { avisaSaida(); ioHero.disconnect(); }
      });
    }, { rootMargin: "0px 0px -50% 0px", threshold: 0 });
    ioHero.observe(sentinela);
  } else if (sentinela) {
    avisaSaida();
  }

  /* ------------------------------------------------- hero: troca de planos
     Três planos em fusão lenta (1,6s no CSS), cada um com aproximação lenta.
     A duração de cada plano é a da barra de progresso: quando a barra
     termina, entra o próximo; pausar a barra pausa tudo.
     WCAG 2.2.2 (conteúdo que se move sozinho por mais de 5s): botão de
     pausar visível, pausa automática fora da janela e com a aba oculta, e
     nada disso existe com movimento reduzido (o gate data-motion nem liga). */
  var cine = document.querySelector(".cine");
  if (cine && MOTION && window.Element && Element.prototype.animate) {
    var slides = [].slice.call(cine.querySelectorAll(".cine__s"));
    var segs = [].slice.call(cine.querySelectorAll(".cine__prog b"));
    var bPause = cine.querySelector(".cine__pause");
    var elN = cine.querySelector("[data-cine-n]");
    var elT = cine.querySelector("[data-cine-t]");
    var HOLD = 6500, FADE = 1600;
    var KB = [
      [{ transform: "scale(1.08)" }, { transform: "scale(1)" }],
      [{ transform: "scale(1.06) translate3d(-1.2%,0,0)" }, { transform: "scale(1.06) translate3d(1.2%,0,0)" }],
      [{ transform: "scale(1)" }, { transform: "scale(1.07)" }]
    ];
    var at = 0, prog = null, kbs = [], userP = false, autoP = false, visivel = true, iniciou = false;

    var carrega = function (s) {
      s.querySelectorAll("[data-srcset]").forEach(function (x) {
        x.srcset = x.getAttribute("data-srcset");
        x.removeAttribute("data-srcset");
      });
      var im = s.querySelector("img[data-src]");
      if (im) { im.src = im.getAttribute("data-src"); im.removeAttribute("data-src"); }
    };
    var parado = function () { return userP || autoP; };
    var aplica = function () {
      var p = parado();
      [prog].concat(kbs).forEach(function (a) { if (a) { if (p) a.pause(); else a.play(); } });
      bPause.setAttribute("aria-pressed", userP ? "true" : "false");
    };

    var mostra = function (i, primeira) {
      at = i;
      slides.forEach(function (s, k) {
        var ativo = k === i;
        s.classList.toggle("is-on", ativo);
        s.setAttribute("aria-hidden", ativo ? "false" : "true");
      });
      elN.textContent = String(i + 1).padStart(2, "0");
      elT.textContent = slides[i].getAttribute("data-t");
      if (prog) { prog.onfinish = null; prog.cancel(); }
      segs.forEach(function (b, k) { b.style.transform = k < i ? "scaleX(1)" : "scaleX(0)"; });
      prog = segs[i].animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
                             { duration: HOLD, easing: "linear", fill: "forwards" });
      prog.onfinish = function () { mostra((at + 1) % slides.length); };
      /* na primeira vez o plano 01 acabou de assentar da entrada: aproxima devagar */
      var quadros = primeira ? [{ transform: "scale(1)" }, { transform: "scale(1.05)" }] : KB[i % KB.length];
      kbs.push(slides[i].querySelector("img").animate(quadros, { duration: HOLD + FADE * 2, easing: "linear", fill: "both" }));
      if (kbs.length > 2) kbs.shift().cancel();
      carrega(slides[(i + 1) % slides.length]);
      if (parado()) aplica();
    };

    var inicia = function () {
      if (iniciou) return;
      iniciou = true;
      cine.setAttribute("data-show", "");
      bPause.hidden = false;
      mostra(0, true);
    };

    bPause.addEventListener("click", function () { userP = !userP; aplica(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visivel = en[0].isIntersecting;
        autoP = !visivel || document.hidden;
        if (iniciou) aplica();
      }, { threshold: 0.2 }).observe(cine);
    }
    document.addEventListener("visibilitychange", function () {
      autoP = !visivel || document.hidden;
      if (iniciou) aplica();
    });

    /* começa quando a entrada termina (o motion.js marca is-done) */
    if (cine.classList.contains("is-done")) inicia();
    else if ("MutationObserver" in window) {
      var moCine = new MutationObserver(function () {
        if (cine.classList.contains("is-done")) { moCine.disconnect(); inicia(); }
      });
      moCine.observe(cine, { attributes: true, attributeFilter: ["class"] });
    }
    setTimeout(inicia, 5200);
  }

  /* ------------------------------------------ foco nunca atrás de camadas
     WCAG 2.4.7: o aviso de cookies e a bolha do Merlin ficam fixos na base
     da tela. Se o Tab leva o foco para algo que está por baixo deles, a
     página rola o suficiente para o elemento aparecer inteiro acima. */
  var revela = function (el) {
    if (!el || !el.getBoundingClientRect || el === document.body) return;
    if (el.closest(".cookie,.merlin-button,.lb,.drawer,.hdr")) return;
    var r = el.getBoundingClientRect();
    var topo = Infinity;
    [document.querySelector('.cookie[data-open="true"]'), document.querySelector(".merlin-button-popup")].forEach(function (c) {
      if (!c) return;
      var k = c.getBoundingClientRect();
      if (!k.width) return;
      if (r.bottom > k.top && r.top < k.bottom && r.right > k.left && r.left < k.right) topo = Math.min(topo, k.top);
    });
    if (topo === Infinity) return;
    var dy = r.bottom - topo + 16;
    requestAnimationFrame(function () {
      var y = window.pageYOffset + dy;
      if (lenis()) lenis().scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    });
  };
  document.addEventListener("focusin", function (e) { revela(e.target); });
  window.brisaRevela = revela;

  /* ------------------------------------------------- menu em tela cheia */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  var lastFocus = null;

  if (drawer) drawer.inert = true;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.inert = false;
    drawer.dataset.open = "true";
    if (hdr) { hdr.setAttribute("data-menu", "open"); hdr.setAttribute("data-hide", "false"); }
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Fechar menu");
    document.body.style.overflow = "hidden";
    if (lenis()) lenis().stop();
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
    if (lenis()) lenis().start();
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

  /* -------------------------------------------------------------- âncoras
     Com a Lenis: rolagem suave dela. Sem ela: rolagem suave nativa (ou pulo,
     com movimento reduzido). O topo de cada seção já comporta o header
     compacto, então o destino é o topo da seção. Depois, foco na seção. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    var fromMenu = !!a.closest(".drawer");
    if (fromMenu) closeDrawer(true);
    setTimeout(function () {
      var y = el.id === "topo" ? 0 : el.getBoundingClientRect().top + window.pageYOffset;
      if (lenis()) lenis().scrollTo(y, { duration: 1.2, force: true });
      else window.scrollTo({ top: y, behavior: MOTION ? "smooth" : "auto" });
      if (history.replaceState) history.replaceState(null, "", id);
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }, fromMenu ? 420 : 0);
  });

  /* ------------------------------------------------- seção ativa no menu */
  var navLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secs = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); });

  function markActive() {
    if (!navLinks.length) return;
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
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; headerState(); markActive(); });
  }, { passive: true });
  headerState();
  markActive();

  /* ------------------------------------------ serviços: acordeão + foto
     Um item aberto por vez. A foto da coluna e a legenda dela acompanham o
     item aberto. */
  var svc = document.querySelector("[data-svc]");
  if (svc) {
    var items = [].slice.call(svc.querySelectorAll(".svc__it"));
    var imgs = [].slice.call(document.querySelectorAll("[data-svc-img]"));
    var legN = document.querySelector("[data-svc-n]");
    var legT = document.querySelector("[data-svc-leg]");

    var abrir = function (idx) {
      items.forEach(function (it, i) {
        var on = i === idx;
        it.classList.toggle("is-open", on);
        it.querySelector(".svc__btn").setAttribute("aria-expanded", on ? "true" : "false");
      });
      imgs.forEach(function (im) {
        im.classList.toggle("is-on", +im.getAttribute("data-svc-img") === idx);
      });
      if (legN) legN.textContent = String(idx + 1).padStart(2, "0");
      if (legT) legT.textContent = items[idx].querySelector(".svc__t").textContent;
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
      if (swap) { lbImg.classList.add("is-swap"); swapT = setTimeout(put, 200); }
      else put();
      lbCount.textContent = String(at + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
      var solo = list.length < 2;
      btnPrev.hidden = solo;
      btnNext.hidden = solo;
      lbCount.hidden = solo;
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
      if (lenis()) lenis().stop();
      btnClose.focus();
    };

    var close = function () {
      lb.dataset.open = "false";
      document.body.style.overflow = "";
      if (lenis()) lenis().start();
      setTimeout(function () { if (lb.dataset.open !== "true") lbImg.removeAttribute("src"); }, 500);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
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
     O consentimento emite evento no dataLayer para as tags respeitarem a LGPD.
     O aviso aparece quando o hero sai (nunca em cima dele); nas páginas sem
     hero, logo depois da carga. Até lá nada é medido: o Consent Mode já
     começa em "denied". */
  var KEY = "brisa_consent_v1";
  var cookie = document.querySelector(".cookie");

  window.dataLayer = window.dataLayer || [];
  function push(state) { window.dataLayer.push({ event: "brisa_consent", consent_state: state }); }

  if (cookie) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { saved = null; }

    /* WCAG 2.4.7: com o aviso aberto, nada focado pode ficar escondido atrás
       dele. A rolagem por foco respeita scroll-padding, então reservamos a
       altura do aviso enquanto ele estiver na tela. */
    var reserva = function (on) {
      var h = on ? cookie.offsetHeight + 24 : 0;
      d.style.scrollPaddingBottom = on ? h + "px" : "";
      /* folga no fim da página: os últimos links podem subir acima do aviso */
      d.style.setProperty("--cookie-h", h + "px");
    };

    if (saved) push(saved);
    else {
      /* o aviso pode abrir por cima de algo que JÁ está focado: confere na hora */
      var mostrar = function () {
        cookie.dataset.open = "true"; reserva(true);
        setTimeout(function () { if (window.brisaRevela) window.brisaRevela(document.activeElement); }, 60);
      };
      if (heroOut) setTimeout(mostrar, 1200);
      else document.addEventListener("brisa:hero-out", function () { setTimeout(mostrar, 400); }, { once: true });
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
        reserva(false);
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
