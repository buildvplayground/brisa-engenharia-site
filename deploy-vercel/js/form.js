/* =========================================================================
   Formulário de fornecedores: validação com erro por campo, envio por fetch
   e fallback para POST normal.

   WCAG coberto aqui:
   - 3.3.1 Error Identification: o erro é texto, aparece ao lado do campo e
     o campo recebe aria-invalid + aria-describedby apontando para ele.
   - 3.3.3 Error Suggestion: a mensagem diz o que fazer, não só que falhou.
   - 4.1.3 Status Messages: o resumo do envio vive numa região com role.
   - 2.4.3 / 3.2.2: o foco vai para o primeiro campo com erro, sem trocar
     de contexto sozinho.
   ========================================================================= */
(function () {
  "use strict";

  var form = document.getElementById("form-fornecedor");
  if (!form) return;

  var msg = document.getElementById("form-msg");
  var btn = form.querySelector('button[type="submit"]');
  var campos = [].slice.call(
    form.querySelectorAll("input:not([type=hidden]),select,textarea")
  ).filter(function (el) { return !el.closest("[hidden]"); });

  /* ------------------------------------------------------------- mensagens
     Texto por tipo de falha. Genérico ("preencha o campo") não ajuda: o que
     ajuda é dizer o formato esperado. */
  function texto(el) {
    var v = el.validity;
    var nome = (el.labels && el.labels[0] ? el.labels[0].textContent : el.name)
      .replace(/\s+/g, " ").trim().replace(/\.$/, "");

    if (v.valueMissing) {
      if (el.type === "checkbox") return "Marque esta autorização para enviar o cadastro.";
      if (el.tagName === "SELECT") return "Escolha uma das opções.";
      /* o rotulo entra na caixa original: baixar a caixa transformaria
         "Telefone ou WhatsApp" em "telefone ou whatsapp" */
      return "Preencha o campo " + nome + ".";
    }
    if (v.typeMismatch && el.type === "email") return "Use o formato nome@dominio.com.br.";
    if (v.tooShort) return "Escreva pelo menos " + el.minLength + " caracteres.";
    if (v.tooLong) return "Use no máximo " + el.maxLength + " caracteres.";
    if (v.patternMismatch) return "Confira o formato deste campo.";
    return "Confira este campo.";
  }

  /* ------------------------------------------------- erro visível por campo */
  function caixaErro(el) {
    var id = "err-" + (el.id || el.name);
    var box = document.getElementById(id);
    if (!box) {
      box = document.createElement("p");
      box.className = "field__err";
      box.id = id;
      /* o erro entra logo depois do controle, dentro do mesmo campo */
      var host = el.closest(".field") || el.parentElement;
      host.appendChild(box);
    }
    return box;
  }

  function marcar(el) {
    var box = caixaErro(el);
    box.textContent = texto(el);
    box.hidden = false;
    el.setAttribute("aria-invalid", "true");
    var d = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (d.indexOf(box.id) < 0) d.push(box.id);
    el.setAttribute("aria-describedby", d.join(" "));
  }

  function limpar(el) {
    var box = document.getElementById("err-" + (el.id || el.name));
    if (box) { box.hidden = true; box.textContent = ""; }
    el.removeAttribute("aria-invalid");
    var d = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/).filter(function (x) { return x && x.indexOf("err-") !== 0; });
    if (d.length) el.setAttribute("aria-describedby", d.join(" "));
    else el.removeAttribute("aria-describedby");
  }

  /* valida ao sair do campo, nunca a cada tecla: corrigir enquanto a pessoa
     ainda está digitando é ruído, não ajuda */
  campos.forEach(function (el) {
    el.addEventListener("blur", function () {
      if (el.value === "" && !el.required) return limpar(el);
      if (el.checkValidity()) limpar(el); else marcar(el);
    });
    el.addEventListener("input", function () {
      if (el.getAttribute("aria-invalid") && el.checkValidity()) limpar(el);
    });
  });

  function say(text, ok) {
    msg.hidden = false;
    msg.textContent = text;
    msg.dataset.state = ok ? "ok" : "erro";
  }

  form.addEventListener("submit", function (e) {
    var maus = campos.filter(function (el) { return !el.checkValidity(); });

    if (maus.length) {
      e.preventDefault();
      maus.forEach(marcar);
      campos.forEach(function (el) { if (el.checkValidity()) limpar(el); });
      /* sem "abaixo": o resumo fica depois do botao e os erros ficam acima
         dele, entao qualquer palavra de direcao apontaria para o lado errado */
      say(maus.length === 1
        ? "Falta um campo. Ele está marcado em vermelho no formulário."
        : "Faltam " + maus.length + " campos. Eles estão marcados em vermelho no formulário.", false);
      maus[0].focus();
      return;
    }

    campos.forEach(limpar);
    if (!window.fetch) return;                 /* deixa o POST normal acontecer */
    e.preventDefault();

    btn.disabled = true;
    var original = btn.innerHTML;              /* preserva o ícone dentro do botão */
    btn.textContent = "Enviando...";
    say("Enviando o cadastro...", true);

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
