# Brisa Engenharia — site institucional

**Cliente:** Brisa Engenharia (planejamento e gerenciamento de obras residenciais de alto padrão)
**Slug:** `brisa-engenharia` · **Repo:** `dev-buildv/brisa-engenharia-site` (privado)
**Drive:** https://drive.google.com/drive/folders/1oiD44ETnWRAoAkyffqE0Cgf8BXYogY3y
**Contato real:** 41 99624-1600 · contato@brisa.eng.br · @brisa.eng · www.brisa.eng.br
**Responsável técnica:** Elisa Andrade da Silva, CREA PR 115016/D
**Atualizado:** 2026-09-02

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
- [x] **5. Front-end** — `Site/` (HTML + CSS + JS vanilla). `brief-pack.md` registra as
      referências, os padrões do design-bank e os eixos de variação.
- [x] **6. Ajustes finais** — 47 imagens tratadas para `.webp` (6,5 MB; hero de 104 KB).
      Aceite auditado por medição: overflow horizontal **0** de 320 a 1920px, contraste AA
      em todas as páginas (incluindo texto sobre foto, medido por pixel real), 0 imagem
      quebrada, 0 erro de console, menu e lightbox testados.
- [x] **7. Tags e módulos** — banner de cookies com evento no `dataLayer`, Política de
      Privacidade, Fornecedores e Trabalhe Conosco, backend PHP com MySQL opcional.
      **GTM/GA4/Pixel e Merlin: pulados** (o cliente ainda não informou os IDs).
- [ ] **8. Revisão humana** — site pronto e servido localmente. Aguardando o olhar do
      usuário e os ajustes finais.
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
python _tools/audit.py            # auditoria por medição -> _tools/audit-out.json
python _tools/contrast-foto.py    # contraste de texto sobre foto, por pixel real
python _tools/build-images.py     # regera as .webp a partir de _raw/
python _tools/sync-deploy.py      # Site/ -> deploy-vercel/
```

## Pendências do cliente

Ver `state.json` → `pendencias` (lista idêntica ao report final).
