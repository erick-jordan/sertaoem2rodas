# Cloud Functions (próximo passo)

Ainda não implementadas: o protótipo roda inteiro no navegador. Esta é a lista do que
cada Function faz quando o back-end entrar. Cada uma corresponde a uma função de
`src/data/store.ts`, então as telas não mudam.

| Function | Gatilho | O que faz |
|---|---|---|
| `sendLoginCode` | chamada (callable) | Gera código de 6 números, guarda o hash com validade de 10 min e envia pelo **modelo de autenticação** aprovado na Meta (API oficial do WhatsApp). Limite de tentativas por número e por IP. |
| `verifyLoginCode` | callable | Confere o código e devolve um **custom token** do Firebase Auth. O uid é derivado do telefone, então o mesmo número sempre cai no mesmo perfil (sem duplicados). |
| `completeSignup` | callable | Cria `users/{uid}` com nome, cidade (coordenadas da tabela do IBGE), aceite dos Termos e declaração de maioridade. |
| `setOrganizer` | callable | Liga o claim `organizer` e grava o @ do Instagram. |
| `checkin` | callable | Valida token do QR e check-in aberto, cria `checkins/{eventId}_{uid}` em transação (um por perfil por evento), calcula a distância e soma os pontos. |
| `draw` | callable | Sorteio no servidor (`crypto.randomInt`) entre check-ins válidos; grava `draws`. Só o dono do evento ou admin. |
| `onEventWrite` | Firestore trigger | Cria a notificação ao admin (novo evento ou o que mudou na edição) e atualiza contadores. |
| `decideApproval`, `decideClaim`, `mergeEvents` | callable (admin/moderador) | Aprovação, transferência de dono e junção de duplicados. |
| `onImageUpload` | Storage trigger | Aplica o selo do S2R no banner (canto, pequeno), guarda o original sem selo. |
| `eventOgImage` | HTTP | Gera a arte do evento como imagem de prévia do link (`og:image`) para o WhatsApp mostrar o banner ao compartilhar. |
| `aggregateMetrics` | agendada (diária) | Agrega acessos por dia, cidade e estado para o painel de métricas. |
| `weeklyChannelDigest` | agendada (semanal) | Prepara texto e imagem da semana para o admin postar no Canal. |

Fase 4 (não construir agora): `createPayment` / webhook do Mercado Pago ou Asaas,
`sendEventUpdate` (desconta do pacote do organizador), `sendPremiumDigest` (respeita o
limite mensal do assinante) e o teto de gastos configurável.

## Login pelo WhatsApp: o que precisa antes

1. Conta Meta Business verificada em nome do administrador.
2. Número próprio do Sertão em 2 Rodas na API oficial (Cloud API).
3. Modelo de mensagem da categoria **Autenticação** aprovado (código de verificação).
4. Token de acesso guardado no Secret Manager (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`).
5. Projeto Firebase no plano Blaze (Functions exigem).
