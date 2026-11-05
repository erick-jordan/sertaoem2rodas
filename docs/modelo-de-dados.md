# Modelo de dados (Firestore)

O banco nasce pronto para as Fases 2, 3 e 4, sem refazer nada. Os tipos completos estão
em `src/domain/types.ts`. Campos marcados como Fase 2/3/4 existem desde já, mas ficam
vazios até a fase chegar.

## Coleções

| Coleção | Documento | Fase | Observações |
|---|---|---|---|
| `users/{uid}` | perfil | 1 | uid derivado do telefone validado (um perfil por número). `roles`: admin, organizer, rider; **moderator** (+ `moderatorUFs`) na Fase 3. `points` desde a Fase 1; `badges` (Fase 2), `premium` (Fase 4), `partnerAppConsentAt` (Fase 3). |
| `events/{id}` | evento | 1 | `approval` (pendente/aprovado/recusado) separado de `status` (confirmado/adiado/cancelado). `ownerId` muda pelo fluxo "Sou o organizador". `mergedInto` para duplicados. `checkin.token` é o segredo do QR. `counters` desnormalizados. `sponsorship` (Fase 2/4), `euVouArt` (Fase 2). |
| `events/{id}/going/{uid}` | "Eu vou" | 1 | Um por pessoa. A Fase 2 usa para gerar a arte "Eu vou". |
| `subscriptions/{id}` | aviso no WhatsApp | 1 | `scope`: event ou agenda. Guarda `consentAt` e o texto exato aceito (prova de consentimento, LGPD). `revokedAt` para sair. `ufs` para premium (Fase 4). |
| `checkins/{eventId}_{uid}` | check-in | 1 | ID determinístico = um check-in por perfil por evento. Registro imutável (perfil, telefone, evento, cidade/UF, data e hora, distância). Base da gamificação (Fase 2) e da API do app parceiro (Fase 3). |
| `draws/{id}` | sorteio | 1 | Vencedor, tamanho do grupo sorteado, quem sorteou e quando. |
| `claims/{id}` | "Sou o organizador" | 1 | Também usado para juntar duplicados. |
| `notices/{id}` | notificação ao admin | 1 | novo evento, edição (com o que mudou: campo → antes/depois), pedido de organizador. |
| `cities/{ibge}` | município | 1 | Tabela do IBGE com latitude/longitude. Alimenta o cadastro e "quem veio de mais longe". |
| `metrics/{yyyy-mm-dd}` | agregado diário | 1 | Acessos, por cidade e estado, compartilhamentos da agenda. |
| `clubs/{id}` + `members/{uid}` | motoclube | 3 | `verified` pelo admin; membros com papel gestor/membro e estado pendente/aprovado. |
| `events/{id}/clubs/{clubId}` | confirmação do clube | 3 | Motos + garupas = total previsto. Alimenta o mural de brasões. |
| `packages`, `payments`, `messageLog` | financeiro | 4 | Pacote do organizador, assinaturas, custo de cada mensagem da Meta e teto de gastos. |

## Permissões

- Leitura pública: só eventos aprovados.
- Organizador: cria evento como pendente; depois de aprovado, edita livremente, exceto
  aprovação, dono, destaque e contadores. Cada edição gera notificação ao admin.
- Admin: tudo. Moderador (Fase 3): aprova eventos das UFs dele, sem acesso total.
- Check-in, sorteio, pontos e contadores: só pelo servidor (Cloud Functions).
- O organizador vê nome, cidade e foto de quem marcou "Eu vou" ou fez check-in. Nunca o telefone.

Regras completas em `firestore.rules`.

## Integração futura com o app de quilometragem (3.11)

`checkins` já guarda tudo o que o app precisa. Na Fase 3, uma API (`/api/v1/checkins`)
com OAuth devolve os check-ins de um usuário somente se `partnerAppConsentAt` estiver
preenchido.
