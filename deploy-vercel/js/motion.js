/* =========================================================================
   Brisa Engenharia — motor de movimento (JS), sem dependência externa.
   Se este arquivo falhar, o gate data-motion é removido e tudo aparece.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* rede de segurança: nada fica invisível para sempre */
  var panic = setTimeout(function () { root.removeAttribute("data-motion"); }, 3200);

  if (reduce) {
    clearTimeout(panic);
    root.removeAttribute("data-motion");
  }

  /* ------------------------------------------------------- 1. split de título
     Só títulos de texto puro. O divisor usa [ \t\r\n]+ e NÃO \s+, senão
     &nbsp; (U+00A0) seria tratado como espaço e as amarrações de quebra
     de linha seriam desfeitas. */
  function split(el) {
    if (!el || el.dataset.splitDone) return;
    if (el.children.length) return;                 /* tem <strong>/<br>: ignora */
    var txt = el.textContent;
    if (!txt || !txt.trim()) return;
    var words = txt.trim().split(/[ \t\r\n]+/);
    var frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "w";
      var inner = document.createElement("i");
      inner.textContent = w;
      inner.style.setProperty("--d", (i * 42) + "ms");
      s.appendChild(inner);
      frag.appendChild(s);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    el.textContent = "";
    el.appendChild(frag);
    el.dataset.splitDone = "1";
    el.setAttribute("data-split", "");
  }

  /* abaixo de 560px a máscara por palavra (inline-block) impediria a quebra
     dentro de palavras longas: mantém o título como texto corrido. */
  if (!reduce && window.innerWidth >= 560) {
    document.querySelectorAll("[data-h-split]").forEach(split);
  }

  /* ------------------------------------------------------------- 2. reveals */
  var targets = [].slice.call(
    document.querySelectorAll("[data-reveal],[data-curtain],[data-split]")
  );

  /* stagger automático: irmãos diretos com data-reveal no mesmo pai */
  var byParent = new Map();
  targets.forEach(function (el) {
    if (!el.hasAttribute("data-reveal")) return;
    var p = el.parentElement;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(el);
  });
  byParent.forEach(function (list) {
    if (list.length < 2) return;
    list.forEach(function (el, i) {
      if (el.style.getPropertyValue("--d")) return;
      el.style.setProperty("--d", Math.min(i, 6) * 80 + "ms");
    });
  });

  function show(el) {
    if (el.dataset.on !== undefined) return;
    el.setAttribute("data-on", "");
  }

  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(show);
  }

  /* camada 1: primeira tela entra por rAF + timer (observer não dispara em
     aba de fundo) */
  function firstScreen() {
    var vh = window.innerHeight;
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94) show(el);
    });
  }
  requestAnimationFrame(firstScreen);
  setTimeout(firstScreen, 140);

  /* camada 3: saltos de scroll (âncora, hash, arraste da barra) não geram
     callback de observer — revela o que já passou */
  function flush() {
    var vh = window.innerHeight;
    targets.forEach(function (el) {
      if (el.dataset.on !== undefined) return;
      var r = el.getBoundingClientRect();
      if (r.bottom < vh * 0.3 || r.top < vh * 0.9) show(el);
    });
  }

  /* escadinha de filetes sem ancestral de reveal (páginas internas): entra
     direto, senão ficaria em scaleX(0) para sempre */
  document.querySelectorAll(".rule3").forEach(function (r) {
    if (!r.closest("[data-reveal],[data-curtain],.hero")) r.setAttribute("data-on", "");
  });

  /* ---------------------------------------------------------------- 3. hero */
  var hero = document.querySelector(".hero");
  if (hero) requestAnimationFrame(function () { hero.setAttribute("data-on", ""); });

  /* -------------------------------------------------- 4. header + progresso */
  var hdr = document.querySelector(".hdr");
  var procFill = document.querySelector(".proc__fill");
  var proc = document.querySelector(".proc");
  var bands = [].slice.call(document.querySelectorAll(".band__bg"));
  var heroImg = document.querySelector("[data-hero-img]");

  /* parallax generico: qualquer elemento com data-parallax="0.05" move a
     propria <img> nessa proporcao do scroll, sempre dentro de um pai com
     overflow escondido. O fator fica em 0.05 a 0.08: acima disso o
     deslocamento passa a ser percebido como "a pagina esta tremendo". */
  var px = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
    return { box: el, img: el.querySelector("img"), k: parseFloat(el.dataset.parallax) || 0.05 };
  }).filter(function (o) { return o.img; });

  /* a tira do feed deriva de lado, devagar, enquanto atravessa a tela */
  var feed = document.querySelector(".feed__grid");
  var steps = document.querySelector(".steps");
  var ticking = false;

  function frame() {
    ticking = false;
    var y = window.pageYOffset || root.scrollTop;

    if (hdr) hdr.setAttribute("data-compact", y > 40 ? "true" : "false");

    /* trilha do processo: progresso 0→1 conforme a seção atravessa a tela */
    if (proc && procFill) {
      var r = proc.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.82 - r.top) / Math.max(r.height * 0.86, 1);
      procFill.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(4));
    }

    /* parallax das faixas de imagem (≤0.10, calibragem da casa).
       O scale(1.04) constante dá folga extra para o deslocamento e evita
       qualquer chance de revelar a borda da foto. */
    if (!reduce) {
      bands.forEach(function (b) {
        var rr = b.parentElement.getBoundingClientRect();
        if (rr.bottom < -200 || rr.top > window.innerHeight + 200) return;
        var mid = rr.top + rr.height / 2 - window.innerHeight / 2;
        var cap = rr.height * 0.1;                      /* nunca revela a borda */
        var off = Math.max(-cap, Math.min(cap, -mid * 0.08));
        b.style.transform = "translate3d(0," + off.toFixed(2) + "px,0) scale(1.04)";
      });

      /* parallax declarado: a foto sobe dentro da propria moldura */
      px.forEach(function (o) {
        /* espera a cortina assentar: antes disso o transform da entrada e
           quem manda na <img>, e um estilo inline mataria a animacao */
        if (o.box.hasAttribute("data-curtain") && o.box.dataset.on === undefined) return;
        var rr = o.box.getBoundingClientRect();
        if (rr.bottom < -160 || rr.top > window.innerHeight + 160) return;
        var mid = rr.top + rr.height / 2 - window.innerHeight / 2;
        var cap = rr.height * 0.07;                 /* folga do scale abaixo */
        var off = Math.max(-cap, Math.min(cap, -mid * o.k));
        o.img.style.transform = "translate3d(0," + off.toFixed(2) + "px,0) scale(1.08)";
      });

      /* tira do feed: deriva horizontal de poucos pixels, para a faixa nao
         ficar estatica. Fica dentro do vao de 2px, sem estourar largura. */
      if (feed) {
        var fr = feed.getBoundingClientRect();
        if (fr.bottom > -100 && fr.top < window.innerHeight + 100) {
          var fp = (window.innerHeight - fr.top) / (window.innerHeight + fr.height);
          feed.style.transform = "translate3d(" + ((fp - 0.5) * -22).toFixed(2) + "px,0,0)";
        }
      }

      /* hero: deriva lenta da foto enquanto a primeira tela sai de cena */
      /* y > 4: no topo o transform fica com o CSS, senão o estilo inline
         mataria a animação de carga (a foto assenta de scale(1.06) para 1.03) */
      if (heroImg && y > 4 && y < window.innerHeight * 1.2) {
        heroImg.style.transform = "translate3d(0," + (y * 0.06).toFixed(2) + "px,0) scale(1.03)";
      }
    }

    if (steps && steps.dataset.on !== "true") {
      var sr = steps.getBoundingClientRect();
      if (sr.top < window.innerHeight * 0.86) steps.dataset.on = "true";
    }
  }

  /* camada 3 ligada ao scroll: um salto (arraste da barra, Home/End, âncora,
     scrollTo) não gera callback de IntersectionObserver, e os blocos pulados
     ficariam invisíveis para sempre. Debounce para não medir a cada frame. */
  var flushT = null;
  function scheduleFlush() {
    if (flushT) return;
    flushT = setTimeout(function () { flushT = null; flush(); }, 150);
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    scheduleFlush();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* --------------------------------------------------- 5. scroll suave (lerp)
     Implementação própria sobre o scroll real da janela: sticky, :target e a
     barra do navegador continuam funcionando. Só em ponteiro fino. */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var headerOffset = 84;

  function scrollable(node) {
    for (var i = 0, n = node; i < 8 && n && n !== document.body; i++, n = n.parentElement) {
      var st = getComputedStyle(n);
      if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 4) return true;
    }
    return false;
  }

  var target = window.pageYOffset, current = target, running = false;

  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function loop() {
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.4) { current = target; running = false; }
    window.scrollTo(0, current);
    if (running) requestAnimationFrame(loop);
  }

  function kick() {
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  if (fine && !reduce) {
    window.addEventListener("wheel", function (e) {
      if (document.body.style.overflow === "hidden") return;   /* lightbox aberto */
      if (e.ctrlKey || e.deltaMode === 1) return;
      if (scrollable(e.target)) return;
      e.preventDefault();
      if (!running) current = window.pageYOffset;
      target = Math.max(0, Math.min(maxY(), target + e.deltaY));
      kick();
    }, { passive: false });

    window.addEventListener("scroll", function () {
      if (!running) { target = window.pageYOffset; current = target; }
    }, { passive: true });
  }

  function goTo(y, delay) {
    y = Math.max(0, Math.min(maxY(), y));
    setTimeout(function () {
      if (fine && !reduce) { target = y; current = window.pageYOffset; kick(); }
      else window.scrollTo(0, y);
      setTimeout(flush, 60);
    }, delay || 0);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (!id || id === "#") return;
    var dst = document.querySelector(id);
    if (!dst) return;
    e.preventDefault();
    var fromDrawer = !!a.closest(".drawer");
    if (fromDrawer && window.brisaCloseDrawer) window.brisaCloseDrawer();
    var y = dst.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    goTo(y, fromDrawer ? 420 : 60);
    history.replaceState(null, "", id);
  });

  window.brisaGoTo = goTo;
  window.addEventListener("hashchange", function () { setTimeout(flush, 80); });
  clearTimeout(panic);
})();
