/* =========================================================================
   Brisa Engenharia · motor de movimento v3
   GSAP 3.13 + ScrollTrigger + SplitText + CustomEase + Lenis, servidos do
   próprio site (assets/vendor). Um motor de rolagem só (Lenis, e só em
   ponteiro fino). Com movimento reduzido nada é montado: o gate
   html[data-motion] nem liga no <head>.

   Vocabulário (entrada · saída pelo topo):
     expo    fotos   véu da cor da seção 1→0 + escala 1.04→1 · véu 0→.40 + escala 1→1.03
     linha   títulos linhas em máscara sobem 105%→0          · translate 0→-16px
     bloco   texto   opacidade 0→1 + 16px→0                   · translate 0→-12px
     filete  juntas  scaleX 0→1 da esquerda                    · não sai
   A saída nunca mexe na opacidade do texto: ele continua legível até sair.
   ========================================================================= */
(function () {
  "use strict";

  var d = document.documentElement;
  var hero = document.querySelector(".hero");
  var MOTION = d.hasAttribute("data-motion");

  /* sem bibliotecas (rede, bloqueador): o timer do <head> libera a página */
  if (!window.gsap || !window.ScrollTrigger) {
    if (hero) hero.classList.add("is-done");
    return;
  }
  window.__brisaMotion = true;

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  var EASE = "power3.out";
  if (window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("brisa", ".16,.84,.28,1");
    EASE = "brisa";
  }
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------ hero: fim da entrada */
  if (hero) {
    var done = function () { hero.classList.add("is-done"); };
    if (!MOTION) done();
    else {
      var p1 = hero.querySelector('.cine__s[data-i="0"] picture');
      if (p1) p1.addEventListener("animationend", done, { once: true });
      setTimeout(done, 4500);
      /* quem já começou a rolar não espera a entrada: acelera 4x */
      var gestos = ["wheel", "touchstart", "keydown", "pointerdown"];
      var acelera = function () {
        if (document.getAnimations) {
          document.getAnimations().forEach(function (a) {
            if ((a.animationName || "").indexOf("h-") === 0) a.playbackRate = 4;
          });
        }
        gestos.forEach(function (g) { removeEventListener(g, acelera); });
      };
      gestos.forEach(function (g) { addEventListener(g, acelera, { passive: true }); });
    }
  }

  if (!MOTION) return;

  /* --------------------------------------------------------------- Lenis */
  function startLenis() {
    if (!window.Lenis) return function () {};
    var lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      prevent: function (n) { return !!(n && n.closest && n.closest(".lb,.drawer,[data-lenis-prevent]")); }
    });
    lenis.on("scroll", ScrollTrigger.update);
    var tick = function (t) { lenis.raf(t * 1000); };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.brisaLenis = lenis;
    return function () { gsap.ticker.remove(tick); lenis.destroy(); window.brisaLenis = null; };
  }

  /* --------------------------------------------------------- vocabulário */
  var STAG = { expo: 0.14, bloco: 0.09, linha: 0.09, filete: 0.08 };
  var hostState = new Map();   /* host -> { armed, items } */
  var hostOf = new Map();      /* elemento -> host */

  function fxOf(el) { return el.classList.contains("fx") ? el : el.querySelector(".fx"); }

  function arm(it) {
    var el = it.el;
    if (it.type === "expo") {
      var fx = fxOf(el), p = fx && fx.querySelector(".fx__p");
      gsap.set(fx, { "--ev": 1 });
      if (p) gsap.set(p, { scale: 1.04 });
    } else if (it.type === "linha" && window.SplitText) {
      if (it.split) it.split.revert();
      it.split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "ln-l", aria: "auto" });
      gsap.set(it.split.lines, { yPercent: 105 });
    } else if (it.type === "filete") {
      gsap.set(el, { scaleX: 0, transformOrigin: "0% 50%" });
    } else {
      gsap.set(el, { opacity: 0, y: 16 });
    }
  }

  function play(it, delay, instant) {
    var el = it.el, dur = instant ? 0 : 1;
    if (it.type === "expo") {
      var fx = fxOf(el), p = fx && fx.querySelector(".fx__p");
      gsap.to(fx, { "--ev": 0, duration: 1.4 * dur, ease: "sine.inOut", delay: delay, overwrite: "auto" });
      if (p) gsap.to(p, { scale: 1, duration: 1.8 * dur, ease: EASE, delay: delay, overwrite: "auto" });
    } else if (it.type === "linha" && it.split) {
      var s = it.split;
      gsap.to(s.lines, {
        yPercent: 0, duration: 0.9 * dur, stagger: instant ? 0 : 0.08, ease: EASE, delay: delay,
        onComplete: function () { if (it.split === s) { s.revert(); it.split = null; } }
      });
    } else if (it.type === "filete") {
      gsap.to(el, { scaleX: 1, duration: 0.9 * dur, ease: EASE, delay: delay });
    } else if (it.type !== "linha") {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.7 * dur, ease: EASE, delay: delay, clearProps: "opacity,transform" });
    }
  }

  function delays(host, items) {
    /* filetes primeiro; o resto entra 200ms depois, em cascata. Legenda de
       foto entra 300ms depois da foto. Etapas na mesma linha da grade
       ganham um passo extra de 120ms entre si. */
    var hasF = items.some(function (it) { return it.type === "filete"; });
    var extra = 0;
    if (host.classList.contains("etapa")) {
      var idx = [].indexOf.call(host.parentElement.children, host);
      var cols = getComputedStyle(host.parentElement).gridTemplateColumns.split(" ").length || 1;
      extra = (idx % cols) * 0.12;
    }
    var fi = 0, oi = 0;
    return items.map(function (it) {
      if (it.type === "filete") return extra + (fi++) * STAG.filete;
      var base = hasF ? 0.2 : 0;
      if (it.el.classList.contains("leg")) base += 0.3;
      return extra + base + (oi++) * (STAG[it.type] || 0.09);
    });
  }

  function vocab() {
    var groups = new Map();
    gsap.utils.toArray("[data-m]").forEach(function (el) {
      var g = el.parentElement && el.parentElement.closest("[data-m-group]");
      var host = g || el;
      if (!groups.has(host)) groups.set(host, []);
      groups.get(host).push({ el: el, type: el.getAttribute("data-m") });
      hostOf.set(el, host);
    });

    groups.forEach(function (items, host) {
      var st = { armed: false, items: items };
      hostState.set(host, st);
      var dl = delays(host, items);
      var armAll = function () { items.forEach(arm); st.armed = true; };
      var playAll = function () {
        if (!st.armed) return;
        st.armed = false;
        items.forEach(function (it, i) { play(it, dl[i], false); });
      };
      /* só nasce escondido o que está inteiro abaixo da janela */
      if (host.getBoundingClientRect().top > window.innerHeight) armAll();
      ScrollTrigger.create({ trigger: host, start: "top bottom", onEnter: playAll, onLeaveBack: armAll });
    });

    /* saída pelo topo: scrub no próprio elemento, só translate/escala/véu */
    gsap.utils.toArray("[data-m]").forEach(function (el) {
      var type = el.getAttribute("data-m");
      if (type === "filete") return;
      var trig = { trigger: el, start: "bottom 45%", end: "bottom top", scrub: 0.6 };
      if (type === "expo") {
        var fx = fxOf(el);
        gsap.fromTo(fx, { "--xv": 0, "--xs": 1 }, { "--xv": 0.4, "--xs": 1.03, ease: "none", scrollTrigger: trig });
      } else {
        gsap.fromTo(el, { "--xy": "0px" }, { "--xy": type === "linha" ? "-16px" : "-12px", ease: "none", scrollTrigger: trig });
      }
    });
  }

  /* foco nunca cai em conteúdo escondido: completa a entrada na hora */
  document.addEventListener("focusin", function (e) {
    var m = e.target.closest && e.target.closest("[data-m]");
    if (!m) return;
    var host = hostOf.get(m), st = host && hostState.get(host);
    if (!st || !st.armed) return;
    st.armed = false;
    st.items.forEach(function (it) { play(it, 0, true); });
  });

  /* ------------------------------------------------------- hero: saída
     Ao rolar, a foto desce devagar (paralaxe) e escurece; o texto sobe 32px.
     O degradê não se move: fica preso ao texto, e o contraste medido vale
     durante toda a saída. */
  function cineExit() {
    var tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true } });
    tl.fromTo(hero.querySelector(".cine__media"), { yPercent: 0 }, { yPercent: 10, ease: "none" }, 0)
      .fromTo(hero, { "--xv": 0 }, { "--xv": 0.5, ease: "none" }, 0)
      .fromTo(hero.querySelector(".cine__in"), { "--xy": "0px" }, { "--xy": "-32px", ease: "none" }, 0);
  }

  /* --------------------------------------------------------------- início */
  var mm = gsap.matchMedia();
  mm.add({
    fine: "(hover: hover) and (pointer: fine)"
  }, function (ctx) {
    var c = ctx.conditions, undo = [];
    if (c.fine) undo.push(startLenis());
    var pronto = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    pronto.then(function () {
      ctx.add(function () {
        vocab();
        if (hero) cineExit();
        ScrollTrigger.refresh();
        if (location.hash && location.hash.length > 1) {
          var alvo = document.querySelector(location.hash);
          if (alvo) {
            if (window.brisaLenis) window.brisaLenis.scrollTo(alvo, { immediate: true, force: true });
            else alvo.scrollIntoView();
          }
        }
      });
    });
    return function () {
      undo.forEach(function (f) { f(); });
      hostState.forEach(function (st) {
        st.items.forEach(function (it) { if (it.split) { it.split.revert(); it.split = null; } });
      });
      hostState.clear();
      hostOf.clear();
    };
  });
})();
