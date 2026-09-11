import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
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

const MAX_IMAGE_DATA_LENGTH = 700_000;
const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      reject(new Error("A foto deve ter no maximo 10 MB antes da compressao."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Nao foi possivel processar a foto."));
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / image.naturalWidth, maxDimension / image.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Seu navegador nao conseguiu preparar a foto."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.78, 0.62, 0.48, 0.35]) {
          const imageData = canvas.toDataURL("image/jpeg", quality);
          if (imageData.length <= MAX_IMAGE_DATA_LENGTH) {
            resolve(imageData);
            return;
          }
        }

        reject(new Error("A foto ficou muito grande. Escolha uma imagem menor."));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
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
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [content, setContent] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          setNotice(
            incoming.length === 1
              ? "Nova mensagem no chat da partida."
              : incoming.length + " novas mensagens no chat da partida."
          );
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

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProcessingPhoto(true);
    setError("");
    try {
      const optimizedImage = await optimizeImage(file);
      setImageData(optimizedImage);
      setImageName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel anexar a foto.");
    } finally {
      setProcessingPhoto(false);
    }
  }

  function removePhoto() {
    setImageData("");
    setImageName("");
    setError("");
  }

  async function handleSend() {
    const trimmed = content.trim();
    if ((!trimmed && !imageData) || locked || sending || processingPhoto) return;

    setSending(true);
    setError("");
    try {
      const message = await sendMatchChatMessageRequest(matchId, trimmed, imageData || undefined);
      setMessages((current) => [...current, message]);
      knownMessageIds.current.add(message.id);
      setContent("");
      setImageData("");
      setImageName("");
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
        <span>{compact ? "Visualizar chat" : "Chat da partida"}</span>
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
                    {message.imageData && (
                      <img className="chat-message-image" src={message.imageData} alt="Foto enviada no chat" loading="lazy" />
                    )}
                    {message.content && <p>{message.content}</p>}
                  </div>
                );
              })
            )}
          </div>

          {locked ? (
            <p className="match-chat-locked">Esta partida foi finalizada. O chat está disponível apenas para consulta.</p>
          ) : (
            <div className="match-chat-form">
              {imageData && (
                <div className="match-chat-photo-preview">
                  <img src={imageData} alt="Pré-visualização da foto" />
                  <span>{imageName}</span>
                  <button type="button" onClick={removePhoto} disabled={sending}>Remover</button>
                </div>
              )}
              <div className="match-chat-compose-row">
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
                  disabled={sending || processingPhoto}
                />
                <input
                  ref={fileInputRef}
                  className="match-chat-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => void handlePhotoChange(event)}
                  disabled={sending || processingPhoto}
                />
                <button
                  type="button"
                  className="match-chat-photo-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || processingPhoto}
                  aria-label="Anexar foto"
                >
                  {processingPhoto ? "..." : "Foto"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleSend()}
                  disabled={sending || processingPhoto || (!content.trim() && !imageData)}
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            </div>
          )}
          {error && <p className="match-chat-error">{error}</p>}
        </div>
      )}
    </div>
  );
}