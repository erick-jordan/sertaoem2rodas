import { useTitle } from '../components/ui';

// Textos do Anexo C (rascunho). Antes de publicar, preencher os campos entre colchetes
// e, de preferência, passar por revisão de um advogado.

const TERMS_VERSION = 'Versão 2026-11 (rascunho)';

export function TermsPage() {
  useTitle('Termos de Uso');
  return (
    <div className="page legal">
      <h1>Termos de Uso</h1>
      <p className="hint">{TERMS_VERSION}</p>
      <h2>1. Quem somos</h2>
      <p>
        O Sertão em 2 Rodas (sertaoem2rodas.com.br) é uma agenda gratuita de eventos de motociclismo, mantida por Irineu Evaristo de Souza Neto, [CPF ou CNPJ do
        responsável], doravante "Sertão em 2 Rodas". Ao usar o site ou criar uma conta, você concorda com estes Termos e com a Política de Privacidade.
      </p>
      <h2>2. Quem pode se cadastrar</h2>
      <p>
        A agenda é de acesso livre e o site não tem conteúdo adulto. O cadastro, porém, é permitido apenas a maiores de 18 anos, que declaram essa condição ao se cadastrar.
        Cada pessoa pode ter apenas uma conta, vinculada a um número de telefone validado.
      </p>
      <h2>3. O que o site oferece</h2>
      <ul>
        <li>Consulta gratuita da agenda de eventos.</li>
        <li>Cadastro gratuito de eventos por organizadores.</li>
        <li>Recursos para motociclistas: "Eu vou", inscrição para receber atualizações de eventos, check-in presencial e participação em sorteios realizados pelos organizadores.</li>
      </ul>
      <p>O Sertão em 2 Rodas pode criar, alterar ou encerrar recursos a qualquer momento.</p>
      <h2>4. Responsabilidade pelas informações dos eventos</h2>
      <p>
        As informações de cada evento (datas, locais, atrações, valores, contatos) são fornecidas e mantidas pelo organizador, que é o único responsável pela sua veracidade e
        pela realização do evento. O Sertão em 2 Rodas revisa os cadastros antes de publicar, mas não garante que o evento aconteça como anunciado e não responde por
        adiamentos, cancelamentos, alterações ou por qualquer ocorrência durante o evento.
      </p>
      <p>Confirme sempre as informações com o organizador antes de viajar.</p>
      <h2>5. Deveres do organizador</h2>
      <p>
        Ao cadastrar um evento, o organizador declara que tem autorização para divulgá-lo e para usar as imagens e marcas enviadas (banners, logos, brasões). Ele se compromete
        a manter os dados atualizados, inclusive o status de adiamento ou cancelamento. O organizador autoriza que as imagens enviadas recebam o selo do Sertão em 2 Rodas
        quando exibidas, geradas ou compartilhadas pelo site, sem alteração do seu conteúdo. O Sertão em 2 Rodas pode recusar, editar ou remover qualquer evento, a seu
        critério.
      </p>
      <h2>6. Check-in e sorteios</h2>
      <p>
        O check-in só é válido presencialmente, pela leitura do QR Code disponibilizado pelo organizador no local, e vale uma vez por pessoa por evento. Tentativas de fraude,
        como check-in fora do local ou contas duplicadas, podem resultar na anulação do check-in e no bloqueio da conta.
      </p>
      <p>
        O site oferece ao organizador apenas uma ferramenta de sorteio aleatório entre as pessoas que fizeram check-in. Prêmios, regras, entrega e eventuais autorizações
        legais do sorteio são de responsabilidade exclusiva do organizador.
      </p>
      <h2>7. Conduta do usuário</h2>
      <p>
        É proibido enviar conteúdo falso, ofensivo, ilegal ou que viole direitos de terceiros, usar marcas ou brasões de motoclubes sem autorização, ou tentar prejudicar o
        funcionamento do site. O descumprimento pode levar à suspensão ou exclusão da conta.
      </p>
      <h2>8. Imagens e artes geradas</h2>
      <p>
        Ao enviar sua foto, você autoriza o seu uso nas artes geradas pelo site para você compartilhar e na exibição do seu perfil aos organizadores dos eventos em que fizer
        "Eu vou" ou check-in. A arte automática de eventos usa a identidade visual do Sertão em 2 Rodas, que não pode ser alterada para outros fins.
      </p>
      <h2>9. Propriedade intelectual</h2>
      <p>
        A marca, o logo e a identidade visual do Sertão em 2 Rodas são registrados e não podem ser usados sem autorização. Banners e marcas dos eventos pertencem aos seus
        titulares.
      </p>
      <h2>10. Mensagens no WhatsApp</h2>
      <p>O site só envia mensagens a quem deu consentimento expresso. Você pode cancelar o recebimento a qualquer momento, pelo próprio site ou respondendo à mensagem.</p>
      <h2>11. Alterações destes Termos</h2>
      <p>Estes Termos podem ser atualizados. Mudanças relevantes serão avisadas no site. O uso continuado após a atualização significa concordância.</p>
      <h2>12. Foro</h2>
      <p>
        Fica eleito o foro da comarca de [cidade/UF do foro] para resolver questões relativas a estes Termos, ressalvado o direito do consumidor de ajuizar ação no seu
        domicílio.
      </p>
    </div>
  );
}

export function PrivacyPage() {
  useTitle('Política de Privacidade');
  const rows: [string, string, string, string][] = [
    ['Nome, telefone (WhatsApp) validado, cidade de origem', 'Motociclistas e organizadores', 'Criar a conta, evitar contas duplicadas, permitir check-in e mostrar "quem veio de mais longe"', 'Execução de contrato (inc. V)'],
    ['Foto de perfil (opcional)', 'Motociclistas', 'Gerar artes compartilháveis e identificar a pessoa para o organizador', 'Consentimento (inc. I)'],
    ['Instagram, CPF (opcional)', 'Organizadores', 'Confirmar a identidade de quem cadastra eventos', 'Execução de contrato (inc. V) e legítimo interesse (inc. IX)'],
    ['"Eu vou", check-ins (evento, data e hora) e pontos', 'Motociclistas', 'Registrar participação, sorteios do organizador e gamificação', 'Execução de contrato (inc. V)'],
    ['Inscrição para avisos no WhatsApp', 'Motociclistas', 'Enviar atualizações do evento ou da agenda', 'Consentimento (inc. I)'],
    ['Dados de navegação (páginas vistas, cliques, cidade aproximada)', 'Visitantes', 'Estatísticas de uso e segurança do site', 'Legítimo interesse (inc. IX)'],
  ];
  return (
    <div className="page legal">
      <h1>Política de Privacidade</h1>
      <p className="hint">Última atualização: [data de publicação]</p>
      <p>Esta Política explica como o Sertão em 2 Rodas trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <h2>1. Controlador</h2>
      <p>
        Irineu Evaristo de Souza Neto, [CPF ou CNPJ do responsável], responsável pelo site sertaoem2rodas.com.br. Contato para assuntos de privacidade: [e-mail de contato
        para privacidade].
      </p>
      <h2>2. Quais dados coletamos e por quê</h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Dado</th>
              <th>De quem</th>
              <th>Para quê</th>
              <th>Base legal (LGPD, art. 7º)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Não coletamos dados sensíveis nem a localização em tempo real do celular. A distância até o evento é calculada a partir da cidade informada.</p>
      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Organizador do evento:</strong> vê nome, cidade e foto de quem tocou em "Eu vou" ou fez check-in no evento dele, para planejamento, sorteio e premiação. Ele
          não recebe o seu telefone.
        </li>
        <li>
          <strong>Prestadores de serviço:</strong> hospedagem do site ([hospedagem]) e envio de mensagens pela API oficial do WhatsApp, da Meta ([provedor da API do
          WhatsApp]). Alguns podem armazenar dados fora do Brasil, com garantias adequadas de proteção.
        </li>
        <li>
          <strong>App parceiro de quilometragem:</strong> os seus check-ins só são compartilhados se você autorizar expressamente, quando esse recurso existir.
        </li>
        <li>
          <strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.
        </li>
      </ul>
      <p>Não vendemos dados pessoais.</p>
      <h2>4. Por quanto tempo guardamos</h2>
      <p>
        Os dados da conta ficam guardados enquanto ela estiver ativa. Se você pedir a exclusão, os dados são apagados ou anonimizados em até 30 dias, salvo o que a lei obrigue
        a manter. O histórico de eventos realizados pode continuar no arquivo do site sem identificar você.
      </p>
      <h2>5. Seus direitos</h2>
      <p>
        Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir a exclusão ou anonimização, revogar consentimentos (por exemplo,
        deixar de receber mensagens ou retirar sua foto), pedir a portabilidade e obter informações sobre compartilhamento. Basta usar as opções do seu perfil ou escrever
        para [e-mail de contato para privacidade]. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>
      <h2>6. Segurança</h2>
      <p>
        Adotamos medidas técnicas para proteger os dados, como conexão segura (HTTPS), validação do telefone e acesso restrito ao painel administrativo. Nenhum sistema é
        totalmente imune; em caso de incidente relevante, os afetados e a ANPD serão comunicados.
      </p>
      <h2>7. Cookies</h2>
      <p>
        Usamos cookies necessários para manter você conectado e cookies de estatística para entender o uso do site. Você pode bloqueá-los no navegador, mas algumas funções
        podem deixar de funcionar.
      </p>
      <h2>8. Menores de idade</h2>
      <p>O cadastro é restrito a maiores de 18 anos. Se identificarmos uma conta de menor, ela será removida.</p>
      <h2>9. Alterações</h2>
      <p>Esta Política pode ser atualizada. A versão vigente fica sempre disponível no site, com a data da última atualização: [data de publicação].</p>
    </div>
  );
}
