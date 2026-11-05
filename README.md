# Sertão em 2 Rodas: agenda de eventos de motociclismo

Site **sertaoem2rodas.com.br**: agenda de eventos de motociclismo do Nordeste, simples,
pensada para o celular e para circular no WhatsApp.

Este repositório contém a **Fase 1** em forma de **protótipo clicável**: todas as telas
funcionam com dados de exemplo guardados no navegador, para validar o visual e os fluxos
antes de ligar o back-end (Firebase).

## O que já está no protótipo (Fase 1 do briefing)

| Seção | Tela |
|---|---|
| 3.1 | Agenda em tabela por mês, filtro por UF, ADIADO/CANCELADO, valor só se pago, faixa de destaque em rodízio, "Fique por dentro da agenda" |
| 3.2 | Imagem da agenda para o WhatsApp: próximos eventos, um mês ou um estado no ano inteiro |
| 3.3 | Página do evento: banner ou arte automática, "Como chegar" (Maps/Waze no pino exato), "Ver mais locais", "Eu vou", "Receba atualizações" com aceite, contatos, anterior/próximo |
| 3.4 | Cadastro do evento com todos os campos da tabela, pino por link do Google Maps ou "Estou no local", selo aplicado no banner |
| 3.5 | Painel do admin: aprovar/recusar, notificações com o que mudou, cadastro direto, destaque, "Sou o organizador", juntar duplicados |
| 3.6 | Arquivo de eventos realizados com links de fotos e cobertura |
| 3.7 | Login pelo WhatsApp (código), cadastro rápido 18+, check-in por QR Code, pontos, próximo evento depois do check-in |
| 3.8 | Sorteio entre check-ins e "Quem veio de mais longe" |
| 3.9 | Registro de inscritos por evento e da agenda; texto e imagem da semana para o Canal do WhatsApp |
| 3.10 | Arte automática do evento em feed (4:5) e story (9:16) |
| Fase 2 (antecipada) | Arte "Eu vou" para os stories: abre ao tocar em "Eu vou", usa o banner e a cor do evento, círculo com a foto ou o brasão do motoclube |
| 3.12 | Métricas do admin e do organizador |
| 3.13 | PWA: "Adicionar à tela inicial" |
| 3.14 | Termos de Uso e Política de Privacidade (rascunho do Anexo C), aceite no cadastro |

No protótipo, a barra verde no rodapé troca o perfil (visitante, motociclista, organizador,
administrador) e restaura os dados de exemplo. O código de login é sempre **123456**.

## Rodar

```bash
npm install
npm run dev          # desenvolvimento em http://localhost:5173
npm run build        # site para o Firebase Hosting (pasta dist)
npm run build:demo   # um único HTML autocontido do protótipo (pasta dist-demo)
```

## Estrutura

```
src/
  domain/      tipos (modelo de dados das Fases 1–4), datas no formato do meio, distâncias
  data/        store.ts (camada de dados do protótipo) e seed.ts (dados de exemplo)
  lib/         art.ts (imagens geradas: agenda, arte do evento, selo), brand.ts
  pages/       telas
  assets/brand logos (provisórios, extraídos do PDF do briefing)
docs/modelo-de-dados.md   coleções do Firestore e permissões
firestore.rules, storage.rules, firebase.json
functions/README.md       Cloud Functions planejadas (login WhatsApp, check-in, sorteio…)
```

## Próximos passos para a Fase 1 ir ao ar

1. Validar o protótipo com o Irineu.
2. Trocar os logos pelos vetores oficiais (`src/assets/brand`).
3. Criar o projeto Firebase (plano Blaze) em nome do administrador.
4. Configurar a API oficial do WhatsApp (número próprio + modelo de autenticação aprovado).
5. Implementar as Cloud Functions e trocar `src/data/store.ts` por chamadas ao Firestore.
6. Carregar a tabela de municípios do IBGE e fazer a carga inicial de eventos.
7. Preencher os campos entre colchetes dos Termos e da Política e revisar com advogado.
