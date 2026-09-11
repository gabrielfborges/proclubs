import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { fetchMatchChatRequest, sendMatchChatMessageRequest } from "../api/championships";
import { getApiErrorMessage } from "../api/client";
import { MatchChatMessage, MatchStatus } from "../types";
import { useAuth } from "../context/AuthContext";

interface MatchChatProps {
  matchId: string;
  matchStatus: MatchStatus;
  autoOpen?: boolean;
  compact?: boolean;
  pollWhenClosed?: boolean;
}

export function MatchChat({
  matchId,
  matchStatus,
  autoOpen = false,
  compact = false,
  pollWhenClosed = !compact,
}: MatchChatProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(autoOpen);
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [locked, setLocked] = useState(matchStatus === "PLAYED");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const knownMessageIds = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      setUnreadCount(0);
    }
  }, [autoOpen]);

  useEffect(() => {
    setLocked(matchStatus === "PLAYED");
  }, [matchStatus]);

  useEffect(() => {
    if (!user || (!open && !pollWhenClosed)) return;

    let cancelled = false;
    const loadMessages = async (initial: boolean) => {
      if (initial) setLoading(true);
      try {
        const response = await fetchMatchChatRequest(matchId);
        if (cancelled) return;

        const incoming = response.messages.filter(
          (message) => !knownMessageIds.current.has(message.id) && message.userId !== user.id
        );
        knownMessageIds.current = new Set(response.messages.map((message) => message.id));
        setMessages(response.messages);
        setLocked(response.locked);
        if (!initial && incoming.length > 0) {
          setUnreadCount((current) => current + incoming.length);
          setNotice(incoming.length === 1 ? "Nova mensagem no chat da partida." : `${incoming.length} novas mensagens no chat da partida.`);
        }
        if (open) setUnreadCount(0);
        setError("");
        initialized.current = true;
      } catch (err) {
        if (!cancelled && !initialized.current) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    void loadMessages(true);
    const intervalId = window.setInterval(() => void loadMessages(false), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [matchId, open, pollWhenClosed, user?.id]);

  function toggleChat() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        setUnreadCount(0);
        setNotice("");
      }
      return next;
    });
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || locked || sending) return;

    setSending(true);
    setError("");
    try {
      const message = await sendMatchChatMessageRequest(matchId, trimmed);
      setMessages((current) => [...current, message]);
      knownMessageIds.current.add(message.id);
      setContent("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={compact ? "match-chat match-chat-compact" : "match-chat"}>
      <button type="button" className="match-chat-trigger" onClick={toggleChat} aria-expanded={open}>
        <span className="match-chat-trigger-icon">⌁</span>
        <span>Chat da partida</span>
        {unreadCount > 0 && <span className="match-chat-unread">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        <span className="match-chat-trigger-state">{locked ? "Encerrado" : open ? "Fechar" : "Abrir"}</span>
      </button>

      {notice && <div className="match-chat-notification" role="status">{notice}</div>}

      {open && (
        <div className="match-chat-panel">
          <div className="match-chat-header">
            <div>
              <strong>Conversa da partida</strong>
              <span>{locked ? "Leitura disponível · partida encerrada" : "Apenas os capitães e administradores"}</span>
            </div>
            <span className={locked ? "match-chat-status locked" : "match-chat-status"}>{locked ? "Fechado" : "Online"}</span>
          </div>

          <div className="match-chat-messages" aria-live="polite">
            {loading ? (
              <p className="match-chat-empty">Carregando mensagens...</p>
            ) : messages.length === 0 ? (
              <p className="match-chat-empty">Nenhuma mensagem ainda. Combine os detalhes da partida por aqui.</p>
            ) : (
              messages.map((message) => {
                const ownMessage = message.userId === user?.id;
                return (
                  <div key={message.id} className={ownMessage ? "chat-message own" : "chat-message"}>
                    <div className="chat-message-meta">
                      <strong>{ownMessage ? "Você" : message.user.username}</strong>
                      {message.user.role === "ADMIN" && <span>ADM</span>}
                      <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                );
              })
            )}
          </div>

          {locked ? (
            <p className="match-chat-locked">Esta partida foi finalizada. O chat está disponível apenas para consulta.</p>
          ) : (
            <div className="match-chat-form">
              <input
                className="input"
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, 1000))}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Escreva uma mensagem..."
                maxLength={1000}
                aria-label="Mensagem do chat"
                disabled={sending}
              />
              <button type="button" className="btn-primary" onClick={() => void handleSend()} disabled={sending || !content.trim()}>{sending ? "..." : "Enviar"}</button>
            </div>
          )}
          {error && <p className="match-chat-error">{error}</p>}
        </div>
      )}
    </div>
  );
}