/* Envio do formulário de fornecedores por fetch, com fallback para POST normal. */
(function () {
  "use strict";
  var form = document.getElementById("form-fornecedor");
  if (!form) return;
  var msg = document.getElementById("form-msg");
  var btn = form.querySelector('button[type="submit"]');

  function say(text, ok) {
    msg.hidden = false;
    msg.textContent = text;
    msg.style.borderLeftColor = ok ? "var(--olive)" : "#8C3A2B";
  }

  form.addEventListener("submit", function (e) {
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return;
    }
    if (!window.fetch) return;                 /* deixa o POST normal acontecer */
    e.preventDefault();

    btn.disabled = true;
    var original = btn.innerHTML;              /* preserva o ícone dentro do botão */
    btn.textContent = "Enviando...";

    fetch(form.action, { method: "POST", body: new FormData(form) })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (d) {
        if (d && d.ok) {
          form.reset();
          say("Cadastro enviado. Vamos analisar e entrar em contato quando houver demanda compatível.", true);
        } else {
          say((d && d.error) || "Não conseguimos enviar agora. Escreva para contato@brisa.eng.br.", false);
        }
      })
      .catch(function () {
        say("Não conseguimos enviar agora. Escreva para contato@brisa.eng.br.", false);
      })
      .then(function () {
        btn.disabled = false;
        btn.innerHTML = original;
      });
  });
})();
