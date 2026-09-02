const discordUrl = import.meta.env.VITE_DISCORD_URL as string | undefined;
const whatsappUrl = import.meta.env.VITE_WHATSAPP_URL as string | undefined;

function CommunityIcon({ type }: { type: "discord" | "whatsapp" }) {
  if (type === "discord") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
        <path fill="currentColor" d="M19.5 5.2A16.2 16.2 0 0 0 15.7 4l-.5 1a14.5 14.5 0 0 0-6.4 0l-.5-1a16.2 16.2 0 0 0-3.8 1.2C2.1 8.8 1.4 12.3 1.7 15.8a15.5 15.5 0 0 0 4.7 2.4l1.1-1.5a9 9 0 0 1-1.8-.9l.4-.3c3.5 1.6 7.3 1.6 10.8 0l.4.3c-.6.4-1.2.7-1.8.9l1.1 1.5a15.5 15.5 0 0 0 4.7-2.4c.4-4.1-.7-7.6-1.8-10.6ZM8.6 14.1c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 0-8.3 14.1L2.5 21.5l5-1.2A9.5 9.5 0 1 0 12 2.5Zm0 17a7.5 7.5 0 0 1-3.8-1l-.3-.2-2.9.7.7-2.8-.2-.3A7.5 7.5 0 1 1 12 19.5Zm4.1-5.6c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.1-.5 0a6.1 6.1 0 0 1-1.8-1.1 6.8 6.8 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.4-.5c.1-.1.1-.3.1-.4l-.7-1.6c-.1-.2-.3-.2-.5-.2h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.1 1.6 2.5 3.9 3.4.5.2.9.3 1.2.4.5.2 1 .2 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function CommunityCard({
  type,
  title,
  description,
  href,
}: {
  type: "discord" | "whatsapp";
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-400">
          <CommunityIcon type={type} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
      <span className={href ? "btn-primary mt-6 w-full" : "mt-6 block text-xs text-slate-500"}>
        {href ? "Entrar na comunidade →" : "Link ainda não configurado"}
      </span>
    </>
  );

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="card block p-5 transition-colors hover:border-accent-500">
      {content}
    </a>
  ) : (
    <div className="card p-5 opacity-75">{content}</div>
  );
}

export function Community() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="page-kicker">Faça parte</p>
      <h1 className="mt-2 text-4xl font-black uppercase">Nossa comunidade</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Entre nos canais oficiais para acompanhar campeonatos, receber avisos e conversar com outros jogadores.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <CommunityCard
          type="discord"
          title="Discord"
          description="Converse com a comunidade, organize partidas e acompanhe os avisos dos campeonatos."
          href={discordUrl}
        />
        <CommunityCard
          type="whatsapp"
          title="Grupo do WhatsApp"
          description="Receba novidades e combine partidas diretamente pelo grupo oficial."
          href={whatsappUrl}
        />
      </div>
    </div>
  );
}
