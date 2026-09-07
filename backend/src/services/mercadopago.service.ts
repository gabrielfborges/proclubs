import { AppError } from "../middleware/errorHandler";

const MERCADO_PAGO_API = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 15_000;

export type MercadoPagoPaymentResponse = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  amountCents: number | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
};

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new AppError("O Mercado Pago ainda nao foi configurado no backend.", 503);
  }
  return token;
}

function webhookUrl() {
  const value = process.env.MERCADO_PAGO_WEBHOOK_URL?.trim();
  if (!value) {
    throw new AppError("Configure MERCADO_PAGO_WEBHOOK_URL antes de criar pagamentos.", 503);
  }
  if (!value.startsWith("https://")) {
    throw new AppError("MERCADO_PAGO_WEBHOOK_URL deve usar HTTPS.", 503);
  }
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : value != null ? String(value) : null;
}

function asCents(value: unknown): number | null {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function mercadoPagoRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(MERCADO_PAGO_API + path, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken()}`,
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Falha de rede ao acessar o Mercado Pago.", error);
    throw new AppError("Nao foi possivel acessar o Mercado Pago agora.", 502);
  }

  const rawBody = await response.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Resposta nao JSON sera convertida em erro generico.
  }

  if (!response.ok) {
    const detail =
      typeof parsed === "object" && parsed !== null && typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : `HTTP ${response.status}`;
    console.error("Mercado Pago recusou a requisicao.", { status: response.status, detail, path });
    throw new AppError(`O Mercado Pago recusou o pagamento (${detail}).`, 502);
  }

  return parsed as T;
}

function normalizePayment(payload: Record<string, unknown>): MercadoPagoPaymentResponse {
  const transactionData =
    typeof payload.point_of_interaction === "object" && payload.point_of_interaction !== null &&
    typeof (payload.point_of_interaction as { transaction_data?: unknown }).transaction_data === "object" &&
    (payload.point_of_interaction as { transaction_data?: unknown }).transaction_data !== null
      ? (payload.point_of_interaction as { transaction_data: Record<string, unknown> }).transaction_data
      : {};

  return {
    id: asString(payload.id) || "",
    status: asString(payload.status) || "pending",
    statusDetail: asString(payload.status_detail),
    externalReference: asString(payload.external_reference),
    amountCents: asCents(payload.transaction_amount),
    qrCode: asString(transactionData.qr_code),
    qrCodeBase64: asString(transactionData.qr_code_base64),
    expiresAt: asDate(payload.date_of_expiration),
  };
}

export async function createMercadoPagoPixPayment(input: {
  amountCents: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  idempotencyKey: string;
}): Promise<MercadoPagoPaymentResponse> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new AppError("O valor da inscricao deve ser maior que zero.", 400);
  }

  const payload = await mercadoPagoRequest<Record<string, unknown>>(
    "POST",
    "/v1/payments",
    {
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.externalReference,
      notification_url: webhookUrl(),
      payer: { email: input.payerEmail },
    },
    input.idempotencyKey,
  );

  const payment = normalizePayment(payload);
  if (!payment.id || !payment.qrCode) {
    throw new AppError("O Mercado Pago nao retornou os dados do PIX.", 502);
  }
  return payment;
}

export async function getMercadoPagoPayment(providerPaymentId: string) {
  const payload = await mercadoPagoRequest<Record<string, unknown>>(
    "GET",
    `/v1/payments/${encodeURIComponent(providerPaymentId)}`,
  );
  return normalizePayment(payload);
}

export function mapMercadoPagoStatus(status: string) {
  switch (status) {
    case "approved":
      return "APPROVED" as const;
    case "cancelled":
      return "CANCELLED" as const;
    case "rejected":
    case "charged_back":
    case "refunded":
      return "REJECTED" as const;
    case "expired":
      return "EXPIRED" as const;
    default:
      return "PENDING" as const;
  }
}
