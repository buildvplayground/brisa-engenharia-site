# Brisa Engenharia — site institucional

**Cliente:** Brisa Engenharia (planejamento e gerenciamento de obras residenciais de alto padrão)
**Slug:** `brisa-engenharia` · **Repo:** `dev-buildv/brisa-engenharia-site` (privado)
**Drive:** https://drive.google.com/drive/folders/1oiD44ETnWRAoAkyffqE0Cgf8BXYogY3y
**Contato real:** 41 9 9924-3868 (novo, 2026-09-29) · contato@brisa.eng.br · @brisa.eng · www.brisa.eng.br
**Responsável técnica:** Elisa Andrade da Silva, CREA PR 115016/D
**Atualizado:** 2026-09-29 · **Versão:** v2 (refação high premium; v1 reprovada, guardada em `_versao-1/`)

---

## Checklist do pipeline

- [x] **1. Extrair do Drive** — 105 MB em `_raw/`: 2 apresentações (comercial ago/2026 e
      técnica), 2 versões do Manual de IDV, placa vetorial (clara e escura), 51 fotos de
      obra em 3 pastas, 25 peças de Instagram, 1 docx de inspiração.
- [x] **2. Organizar pastas** — `Marca/ Copys/ imagens/ design-system/ Site/`,
      `.gitignore` seguro, `PROJETO.md`, `state.json`.
- [x] **2b. Repositório GitHub** — `dev-buildv/brisa-engenharia-site`, privado.
- [x] **3. Design system** — `design-system/design-system.md`. Paleta amostrada por
      pixel/vetor da marca real, contraste de cada par verificado.
      Logo extraído como **vetor** dos paths do PDF da placa, em 4 arquivos SVG.
- [x] **4. Copy estruturada** — `Copys/copy-site.md`. Só fatos do material.
      Sem travessão em nenhum texto visível.
- [x] **5. Front-end (v2, 2026-09-29)** — refeito do zero depois da reprovação da v1. Direção
      "luz de projeto" (hero com janela que se abre, luz de janela dos `_patterns`, grade de cor
      única nas fotos, explorador de serviços, método em cena travada, 3 obras em 1 linha).
      14 pedidos da cliente aplicados. `revisar-frontend`: 0 achados bloqueantes (`brief-pack.md` §8).
- [x] **6. Ajustes finais** — 47 imagens tratadas para `.webp` (6,5 MB; hero de 104 KB).
      Aceite auditado por medição: overflow horizontal **0** de 320 a 1920px, contraste AA
      em todas as páginas (incluindo texto sobre foto, medido por pixel real), 0 imagem
      quebrada, 0 erro de console, menu e lightbox testados.
- [x] **7. Tags e módulos** — banner de cookies com evento no `dataLayer`, Política de
      Privacidade, Fornecedores e Trabalhe Conosco, backend PHP com MySQL opcional.
      **GTM/GA4/Pixel e Merlin: pulados** (o cliente ainda não informou os IDs).
- [ ] **8. Revisão humana** — v2 servida em http://127.0.0.1:8834. Aguardando a cliente.
- [ ] **9. Deploy** — pasta `deploy-vercel/` pronta e versionada. Bloqueado: falta definir
      a hospedagem e o domínio, e fornecer os secrets.

---

## Estrutura

```
brisa-engenharia/
├── _raw/                  material bruto do Drive (local + Drive, fora do git)
├── _tools/                scripts de build e auditoria (fora do git)
├── Marca/                 logo vetorial (4 SVG) + PDFs de marca
├── Copys/                 copy estruturada + textos-fonte extraídos dos PDFs
├── imagens/tratadas/      espelho das imagens .webp
├── design-system/         design-system.md
├── Site/                  front-end de trabalho
├── deploy-vercel/         PASTA VERSIONADA E PUBLICADA (cópia de Site/ + vercel.json)
├── .github/workflows/     deploy-hostinger.yml (FTP)
├── brief-pack.md
├── PROJETO.md
└── state.json
```

O repositório versiona **só** `deploy-vercel/`, `.github/`, `PROJETO.md`, `state.json` e
`.gitignore`. Material-fonte fica local e no Drive.

## Como rodar localmente

```bash
python _tools/serve.py            # serve Site/ em http://127.0.0.1:8834 (MIME de .webp registrado)
python _tools/audit-v2.py         # overflow, encaixe por seção, linha, imagens, console
python _tools/test-interacoes.py  # 58 testes de interação e movimento
python _tools/wcag-v2.py          # contraste sólido e por pixel sobre foto
python _tools/contrast-foto.py    # contraste de texto sobre foto, por pixel real
python _tools/build-images-v2.py  # regera as .webp a partir de _raw/ (grade de cor única)
python _tools/build-internas.py   # privacidade.html e fornecedores.html a partir do index
python _tools/sync-deploy.py      # Site/ -> deploy-vercel/
```

## Pendências do cliente

Ver `state.json` → `pendencias` (lista idêntica ao report final).
