/* =========================================================================
   Brisa Engenharia — comportamento do site (independente do motor de movimento)
   ========================================================================= */
(function () {
  "use strict";

  /* ------------------------------------------------------------- WhatsApp
     Número real da placa oficial: 41 99624-1600. */
  var WA = "5541996241600";

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

  /* ------------------------------------------------------ menu off-canvas */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  var scrim = document.querySelector(".scrim");
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.dataset.open = "true";
    if (scrim) scrim.dataset.open = "true";
    burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var first = drawer.querySelector("a,button");
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawer || drawer.dataset.open !== "true") return;
    drawer.dataset.open = "false";
    if (scrim) scrim.dataset.open = "false";
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.brisaCloseDrawer = closeDrawer;

  if (burger) {
    burger.addEventListener("click", function () {
      drawer.dataset.open === "true" ? closeDrawer() : openDrawer();
    });
  }
  if (scrim) scrim.addEventListener("click", closeDrawer);

  /* ------------------------------------------------- seção ativa no menu */
  var navLinks = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var secs = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (secs.length) {
    var markActive = function () {
      var y = window.pageYOffset + window.innerHeight * 0.34;
      var idx = -1;
      secs.forEach(function (s, i) { if (s.offsetTop <= y) idx = i; });
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

  /* ------------------------------------------------------------- lightbox */
  var lb = document.querySelector(".lb");
  if (lb) {
    var lbImg = lb.querySelector(".lb__stage img");
    var lbTitle = lb.querySelector(".lb__title");
    var lbCount = lb.querySelector(".lb__count");
    var btnPrev = lb.querySelector(".lb__nav--prev");
    var btnNext = lb.querySelector(".lb__nav--next");
    var btnClose = lb.querySelector(".lb__close");
    var list = [], at = 0, title = "", opener = null;

    function render() {
      lbImg.src = list[at];
      lbImg.alt = title + ", foto " + (at + 1) + " de " + list.length;
      lbCount.textContent = String(at + 1).padStart(2, "0") + " / " +
                            String(list.length).padStart(2, "0");
      lbTitle.textContent = title;
      var solo = list.length < 2;
      btnPrev.hidden = solo;
      btnNext.hidden = solo;
      lbCount.hidden = solo;
    }

    function open(el) {
      var g = el.getAttribute("data-gallery");
      if (!g) return;
      list = g.split("|").filter(Boolean);
      title = el.getAttribute("data-title") || "Obra";
      at = 0; opener = el;
      render();
      lb.dataset.open = "true";
      document.body.style.overflow = "hidden";
      btnClose.focus();
    }

    function close() {
      lb.dataset.open = "false";
      document.body.style.overflow = "";
      lbImg.removeAttribute("src");
      if (opener && opener.focus) opener.focus();
    }

    function step(d) {
      if (list.length < 2) return;
      at = (at + d + list.length) % list.length;
      render();
    }

    document.querySelectorAll("[data-gallery]").forEach(function (el) {
      el.addEventListener("click", function () { open(el); });
    });

    btnPrev.addEventListener("click", function () { step(-1); });
    btnNext.addEventListener("click", function () { step(1); });
    btnClose.addEventListener("click", close);
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lb__stage")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (lb.dataset.open !== "true") {
        if (e.key === "Escape") closeDrawer();
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "Tab") {
        var f = [].slice.call(lb.querySelectorAll("button:not([hidden])"));
        if (!f.length) return;
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* ------------------------------------------------------- banner de cookies
     O consentimento emite evento no dataLayer para as tags respeitarem a LGPD. */
  var KEY = "brisa_consent_v1";
  var cookie = document.querySelector(".cookie");

  window.dataLayer = window.dataLayer || [];

  function push(state) {
    window.dataLayer.push({ event: "brisa_consent", consent_state: state });
  }

  if (cookie) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { saved = null; }

    if (saved) {
      push(saved);
    } else {
      setTimeout(function () { cookie.dataset.open = "true"; }, 1400);
    }

    cookie.querySelectorAll("[data-consent]").forEach(function (b) {
      b.addEventListener("click", function () {
        var state = b.getAttribute("data-consent");
        try { localStorage.setItem(KEY, state); } catch (err) { /* modo privado */ }
        push(state);
        cookie.dataset.open = "false";
      });
    });
  }

  /* ------------------------------------------------------------- ano atual */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
