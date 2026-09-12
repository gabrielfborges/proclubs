import type { ReactNode } from "react";

const chapters = [
  ["01", "Plataformas e requisitos", "plataformas"],
  ["02", "Elenco e jogadores", "elenco"],
  ["03", "Como convidar o adversário", "convite"],
  ["04", "Realização das partidas", "partidas"],
  ["05", "Fase de grupos e mata-mata", "fases"],
  ["06", "W.O. — derrota por ausência", "wo"],
  ["07", "Queda de conexão", "conexao"],
  ["08", "Caso a competição não atinja o número de vagas", "vagas"],
  ["09", "Reembolso", "reembolso"],
  ["10", "Premiação", "premiacao"],
  ["11", "Organização e conduta", "conduta"],
] as const;

function Chapter({ number, title, id }: { number: string; title: string; id: string }) {
  return <div className="regulation-heading"><span className="regulation-number">{number}</span><div><p className="section-eyebrow">CAPÍTULO {number}</p><h2 id={`${id}-title`}>{title}</h2></div></div>;
}

function Note({ tone = "yellow", title, children }: { tone?: "yellow" | "red" | "green"; title: string; children: ReactNode }) {
  return <div className={`regulation-note regulation-note-${tone}`}><strong>{title}</strong><p>{children}</p></div>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="regulation-list">{children}</ul>;
}

export function Regulations() {
  return <div className="regulations-page">
    <header className="regulations-hero">
      <div className="regulations-hero-copy">
        <p className="section-eyebrow">DOCUMENTO OFICIAL · RACHÃO TOURNAMENTS</p>
        <h1>REGULAMENTO<span>.</span></h1>
        <p className="regulations-lead">As regras que organizam cada confronto — do convite no lobby à confirmação do resultado.</p>
        <p className="regulations-intro">Ao realizar a inscrição, o capitão e sua equipe declaram estar cientes e de acordo com todas as regras abaixo.</p>
        <div className="regulations-meta"><span><b>11</b> capítulos</span><span><b>2+</b> jogadores por partida</span><span><b>10 min</b> de tolerância</span></div>
      </div>
      <div className="regulations-essentials">
        <div className="regulations-card-label"><span>●</span> LEIA ANTES DE JOGAR</div>
        <h2>O essencial<br /><em>em campo.</em></h2>
        <div className="essential-row"><span>01</span><p><strong>Amistoso de Clubes</strong><br />Toda partida deve ser criada neste formato.</p></div>
        <div className="essential-row"><span>02</span><p><strong>Sem posição QQ</strong><br />O uso gera W.O. com placar de 3x0.</p></div>
        <div className="essential-row"><span>03</span><p><strong>Chat da partida</strong><br />É o canal oficial entre os dois clubes.</p></div>
      </div>
    </header>

    <div className="regulations-layout">
      <aside className="regulations-index"><div className="regulations-index-inner"><p className="section-eyebrow">NESTA PÁGINA</p><nav aria-label="Índice do regulamento">
        {chapters.map(([number, title, id]) => <a key={id} href={`#${id}`}><span>{number}</span>{title}</a>)}
        <a href="#disposicoes" className="index-final"><span>✦</span>Disposições finais</a>
      </nav></div></aside>

      <main className="regulations-content">
        <section className="regulation-section" id="plataformas"><Chapter number="01" title="Plataformas e requisitos" id="plataformas" /><p>A competição é exclusiva para a <strong>Nova Geração</strong>:</p><div className="platform-grid"><span>🎮 <b>PlayStation 5</b></span><span>🎮 <b>Xbox Series S/X</b></span><span>💻 <b>PC</b></span></div><Note tone="red" title="Posição QQ proibida">Caso um jogador seja identificado utilizando QQ durante a partida, a equipe será punida com derrota por W.O., pelo placar de 3x0, independentemente do resultado obtido dentro do jogo.</Note><p className="rule-callout">A equipe deverá iniciar cada partida com <strong>no mínimo 2 jogadores</strong>.</p></section>

        <section className="regulation-section" id="elenco"><Chapter number="02" title="Elenco e jogadores" id="elenco" /><div className="regulation-columns"><div><h3>O elenco pode mudar entre as partidas</h3><p>A equipe <strong>não é obrigada a utilizar os mesmos jogadores durante toda a competição</strong>. Entre uma partida e outra, jogadores podem entrar ou sair normalmente, desde que a equipe respeite o mínimo de 2 jogadores.</p><p className="example-line"><span>EXEMPLO</span> Uma equipe joga a primeira partida com 2 jogadores, a segunda com 3 e a terceira novamente com 2. A situação é permitida.</p></div><div><h3>Não existem substituições durante a partida</h3><p>Depois que a partida começar, <strong>nenhum jogador poderá entrar ou substituir outro jogador</strong>. Se um jogador chegar enquanto a partida estiver acontecendo, deverá aguardar até a próxima partida.</p><p>Também não é permitido iniciar com 3 jogadores, um deles sair durante o jogo e outro jogador entrar em seu lugar.</p></div></div><Note title="Queda de conexão">Se houver uma queda, a partida deverá seguir as regras de conexão descritas no capítulo 07.</Note></section>

        <section className="regulation-section" id="convite"><Chapter number="03" title="Como convidar o adversário" id="convite" /><p>Todas as partidas deverão ser realizadas pelo sistema de <strong>Amistoso de Clubes</strong>.</p><ol className="regulation-steps"><li>O capitão deverá abrir as configurações no lobby do Pro Clubs.</li><li>Alterar o tipo de partida de <strong>Partida de Liga</strong> para <strong>Amistoso de Clubes</strong>.</li><li>Ao iniciar a partida, informar o nome do clube adversário.</li></ol><div className="communication-box"><div className="communication-icon">✉</div><div><h3>Comunicação entre as equipes</h3><p>Cada partida possui um chat exclusivo para os dois clubes. Os capitães devem utilizar esse chat para:</p><Bullets><li>Combinar quem realizará o convite;</li><li>Confirmar presença;</li><li>Resolver dúvidas e registrar problemas;</li><li>Solicitar a presença da organização.</li></Bullets><p><strong>Evite tratar assuntos da partida pelo privado.</strong> O chat da partida é o canal oficial porque permite que a organização acompanhe a comunicação quando necessário.</p></div></div></section>

        <section className="regulation-section" id="partidas"><Chapter number="04" title="Realização das partidas" id="partidas" /><h3>4.1 · Chave e horários</h3><p>A chave da competição será definida pelo sistema conforme o formato e número de equipes participantes.</p><div className="match-facts"><span>⏰ <b>Horário</b><small>Definido para o confronto</small></span><span>⚽ <b>Adversário</b><small>Definido pelo sistema</small></span><span>💬 <b>Chat exclusivo</b><small>Entre os dois clubes</small></span></div><h3>4.2 · Tolerância</h3><Note title="10 minutos após o horário marcado">Após esse período, caso uma equipe não esteja presente ou não tenha o mínimo de 2 jogadores, o adversário poderá solicitar W.O.</Note><h3>4.3 · Resultado da partida</h3><ol className="regulation-steps compact"><li>As duas equipes deverão informar o resultado na página da partida.</li><li>Deverá ser enviado <strong>print da tela final da partida</strong>.</li><li>O resultado será confirmado quando as duas equipes informarem o mesmo placar.</li></ol><p>Caso exista divergência, a <strong>organização analisará os prints e demais informações disponíveis</strong> para determinar o resultado oficial.</p><Note tone="red" title="Partida sem resultado">Caso nenhuma das equipes informe o resultado, 30 minutos após o horário oficial o confronto será encaminhado para análise da organização. Nenhum resultado será considerado automaticamente válido sem a devida confirmação.</Note></section>

        <section className="regulation-section" id="fases"><Chapter number="05" title="Fase de grupos e mata-mata" id="fases" /><div className="regulation-columns"><div><h3>Fase de grupos</h3><p>A classificação será definida, nesta ordem:</p><ol className="ranking-list"><li>Pontos</li><li>Saldo de gols</li><li>Gols marcados</li></ol><p>Caso ainda exista empate entre equipes, a organização poderá utilizar critérios adicionais para definir a classificação.</p></div><div><h3>Mata-mata</h3><p>Os confrontos do mata-mata serão disputados em <strong>jogo único</strong>.</p><Note title="Empate no tempo regulamentar">A decisão será diretamente nos pênaltis. O resultado da disputa deverá ser informado na súmula da partida.</Note></div></div></section>

        <section className="regulation-section" id="wo"><Chapter number="06" title="W.O. — derrota por ausência" id="wo" /><p>A equipe poderá perder por W.O. nos seguintes casos:</p><Bullets><li>Não comparecer dentro do período de tolerância;</li><li>Não apresentar o mínimo de <strong>2 jogadores</strong>;</li><li>Utilizar <strong>QQ</strong>;</li><li>Descumprir alguma regra que determine W.O.;</li><li>Realizar alguma ação irregular que comprometa a integridade da partida.</li></Bullets><div className="wo-grid"><div><span>PLACAR DO W.O.</span><strong>3x0</strong><p>para a equipe adversária.</p></div><div><span>QUEM PODE SOLICITAR?</span><p>O <strong>adversário deverá declarar o W.O. na página da partida</strong>, apresentando, sempre que possível, prints ou outras provas.</p></div></div><Note title="W.O. duplo">Caso nenhuma das duas equipes compareça ou cumpra os requisitos mínimos, nenhuma equipe receberá os pontos. A organização analisará a situação e definirá o procedimento adequado.</Note></section>

        <section className="regulation-section" id="conexao"><Chapter number="07" title="Queda de conexão" id="conexao" /><p>Problemas de conexão ou servidores podem ocorrer durante o EA FC. Por isso, serão aplicadas as seguintes regras:</p><div className="connection-grid"><div className="connection-card"><span>🔴</span><h3>Queda antes dos 10 minutos</h3><p>As duas equipes deverão sair e <strong>reiniciar a partida do zero</strong>. O novo jogo será disputado normalmente.</p></div><div className="connection-card"><span>🟡</span><h3>Queda após os 10 minutos</h3><p>A partida deverá continuar normalmente com os jogadores restantes/bots. O resultado final será válido.</p></div></div><Note title="Gol antes da queda">Qualquer gol marcado antes da desconexão será considerado válido. Se a equipe estiver enfrentando problemas de conexão, deverá sair o quanto antes. Após a partida continuar, não serão aceitas reclamações posteriores relacionadas a um gol sofrido antes da saída.</Note></section>

        <section className="regulation-section" id="vagas"><Chapter number="08" title="Caso a competição não atinja o número de vagas" id="vagas" /><p>A competição poderá ser realizada com um número menor de equipes. Caso não sejam preenchidas todas as vagas:</p><Bullets><li>A organização utilizará o <strong>maior formato possível</strong> de acordo com o número de equipes pagantes;</li><li>Os formatos disponíveis serão informados na página da competição;</li><li>Caso seja necessário ajustar a estrutura, a organização informará os capitães antes do sorteio.</li></Bullets><Note tone="red" title="Caso não atinja o número mínimo">Se o número mínimo de equipes necessário não for alcançado, a edição será cancelada. Nesse caso, todos os participantes receberão <strong>100% do valor da inscrição de volta</strong>.</Note></section>

        <section className="regulation-section" id="reembolso"><Chapter number="09" title="Reembolso" id="reembolso" /><p>A Rachão Tournaments oferece política de reembolso aos participantes. O reembolso poderá ocorrer nos casos previstos na <strong>Política de Reembolso oficial</strong>, disponível no site antes da realização do pagamento.</p><div className="refund-grid"><div><span>Cancelamento da competição</span><p>Se a edição for cancelada por falta de equipes ou qualquer outro motivo que impeça sua realização, o participante receberá <strong>100% do valor pago</strong>.</p></div><div><span>Desistência</span><p>O participante poderá solicitar reembolso dentro do prazo estabelecido na Política de Reembolso.</p></div></div><Note title="Prazo para desistência">O prazo termina no momento em que o sorteio da competição é realizado. Após a definição da chave, a equipe já estará oficialmente vinculada aos seus confrontos.</Note></section>

        <section className="regulation-section" id="premiacao"><Chapter number="10" title="Premiação" id="premiacao" /><p>A premiação será definida de acordo com o <strong>formato da edição</strong> e estará informada na página oficial da competição.</p><div className="prize-highlight"><span>🏆 PAGAMENTO DOS PRÊMIOS</span><strong>Pix em até 24 horas</strong><p>Após o encerramento da competição, salvo situações excepcionais comunicadas pela organização.</p></div></section>

        <section className="regulation-section" id="conduta"><Chapter number="11" title="Organização e conduta" id="conduta" /><p>A organização da Rachão Tournaments será responsável por analisar situações não previstas ou conflitos ocorridos durante a competição.</p><h3>Comunicação oficial</h3><p>Sempre que houver um problema relacionado à partida, os capitães deverão utilizar o <strong>chat da própria partida</strong> e mencionar a organização. Isso permite que a situação fique registrada e possa ser analisada corretamente.</p><h3>Decisão da organização</h3><p>A decisão da organização será <strong>final dentro da competição</strong>, especialmente em casos de conflito entre equipes, divergência de resultados, problemas de conexão, descumprimento de regras ou situações não previstas neste regulamento.</p><div className="sanctions"><span>DEPENDENDO DA GRAVIDADE, PODERÁ SER APLICADO</span><div><b>Advertência</b><b>Derrota por W.O.</b><b>Perda de pontos</b><b>Desclassificação</b><b>Perda da vaga</b><b>Perda da premiação</b></div></div></section>

        <section className="final-regulation" id="disposicoes"><div className="final-star">✦</div><p className="section-eyebrow">DISPOSIÇÕES FINAIS</p><h2>Jogue limpo.<br /><span>Jogue para vencer.</span></h2><p>Ao participar da Rachão Tournaments, o capitão declara que <strong>leu, compreendeu e aceitou este regulamento</strong>, sendo responsável por repassar todas as regras aos jogadores de sua equipe.</p><p>A alegação de desconhecimento de uma regra <strong>não será aceita</strong> como justificativa para o seu descumprimento.</p><p>A organização poderá atualizar ou esclarecer regras quando necessário, desde que isso seja comunicado aos participantes e não prejudique injustamente uma partida já realizada.</p><div className="final-good-luck">BOA SORTE A TODOS E QUE VENÇA O MELHOR! <span>🏆⚽</span></div></section>
      </main>
    </div>
  </div>;
}