import { Request, Response } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { prisma } from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import {
  createMercadoPagoPixPayment,
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
} from "../services/mercadopago.service";

function publicPayment(payment: {
  id: string;
  status: string;
  amountCents: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
}) {
  return {
    id: payment.id,
    status: payment.status,
    amountCents: payment.amountCents,
    qrCode: payment.qrCode,
    qrCodeBase64: payment.qrCodeBase64,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
  };
}

async function getCaptainApplication(req: Request) {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Usuario nao autenticado.", 401);

  const application = await prisma.championshipApplication.findUnique({
    where: { id: req.params.id },
    include: { team: true, championship: true },
  });
  if (!application) throw new AppError("Solicitacao nao encontrada.", 404);
  if (application.team.captainUserId !== userId) {
    throw new AppError("Somente o capitao pode gerenciar o pagamento desta solicitacao.", 403);
  }
  return application;
}

export const getApplicationPayment = asyncHandler(async (req: Request, res: Response) => {
  const application = await getCaptainApplication(req);
  const payment = await prisma.championshipPayment.findFirst({
    where: { applicationId: application.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(payment ? publicPayment(payment) : null);
});

export const createApplicationPayment = asyncHandler(async (req: Request, res: Response) => {
  const application = await getCaptainApplication(req);
  const amountCents = application.championship.registrationFeeCents;

  if (application.championship.stage !== "REGISTRATION") {
    throw new AppError("Este campeonato nao esta aceitando pagamentos de inscricao.");
  }
  if (application.status === "REJECTED") {
    throw new AppError("Envie uma nova solicitacao antes de gerar outro pagamento.");
  }
  if (amountCents <= 0) {
    throw new AppError("Este campeonato nao possui taxa de inscricao.");
  }

  const existingApproved = await prisma.championshipPayment.findFirst({
    where: { applicationId: application.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  if (existingApproved) return res.json(publicPayment(existingApproved));

  const now = new Date();
  const existingPending = await prisma.championshipPayment.findFirst({
    where: {
      applicationId: application.id,
      status: "PENDING",
      qrCode: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending) return res.json(publicPayment(existingPending));

  const localPayment = await prisma.championshipPayment.create({
    data: {
      applicationId: application.id,
      amountCents,
      idempotencyKey: randomUUID(),
    },
  });

  try {
    const captain = await prisma.user.findUnique({
      where: { id: application.team.captainUserId || "" },
      select: { email: true },
    });
    if (!captain?.email) {
      throw new AppError("O capitao precisa ter um email valido para gerar o PIX.", 400);
    }

    const remotePayment = await createMercadoPagoPixPayment({
      amountCents,
      description: `Inscricao - ${application.championship.name}`,
      externalReference: application.id,
      payerEmail: captain.email,
      idempotencyKey: localPayment.idempotencyKey,
    });
    if (!remotePayment.id) throw new AppError("O Mercado Pago nao retornou um identificador de pagamento.", 502);

    const updated = await prisma.championshipPayment.update({
      where: { id: localPayment.id },
      data: {
        providerPaymentId: remotePayment.id,
        status: mapMercadoPagoStatus(remotePayment.status),
        statusDetail: remotePayment.statusDetail,
        qrCode: remotePayment.qrCode,
        qrCodeBase64: remotePayment.qrCodeBase64,
        expiresAt: remotePayment.expiresAt,
        paidAt: mapMercadoPagoStatus(remotePayment.status) === "APPROVED" ? new Date() : null,
      },
    });
    return res.status(201).json(publicPayment(updated));
  } catch (error) {
    await prisma.championshipPayment.update({
      where: { id: localPayment.id },
      data: { status: "REJECTED", statusDetail: "creation_failed" },
    }).catch(() => undefined);
    throw error;
  }
});

function parseSignature(value: string) {
  const parts = value.split(",");
  let timestamp = "";
  let hash = "";
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    const item = rest.join("=").trim();
    if (key === "ts") timestamp = item;
    if (key === "v1") hash = item;
  }
  return { timestamp, hash };
}

function queryValue(req: Request, key: string) {
  const value = req.query[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function validWebhookSignature(req: Request, dataId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) throw new AppError("O webhook do Mercado Pago ainda nao foi configurado.", 503);

  const signature = req.header("x-signature");
  const requestId = req.header("x-request-id");
  if (!signature || !requestId) return false;

  const parsed = parseSignature(signature);
  if (!parsed.timestamp || !parsed.hash) return false;

  const timestampNumber = Number(parsed.timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  const timestampMs = timestampNumber > 1_000_000_000_000 ? timestampNumber : timestampNumber * 1000;
  if (Math.abs(Date.now() - timestampMs) > 15 * 60 * 1000) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(parsed.hash.toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export const mercadoPagoWebhook = asyncHandler(async (req: Request, res: Response) => {
  const body = typeof req.body === "object" && req.body !== null ? req.body as Record<string, unknown> : {};
  const eventType = typeof body.type === "string" ? body.type : typeof body.topic === "string" ? body.topic : "";
  if (eventType && eventType !== "payment") return res.sendStatus(200);

  const bodyData = typeof body.data === "object" && body.data !== null ? body.data as Record<string, unknown> : {};
  const dataId = queryValue(req, "data.id") || (typeof bodyData.id === "string" ? bodyData.id : "");
  if (!dataId) return res.sendStatus(200);
  if (!validWebhookSignature(req, dataId)) throw new AppError("Assinatura do webhook invalida.", 401);

  const remotePayment = await getMercadoPagoPayment(dataId);
  const possibleMatches = [
    { providerPaymentId: remotePayment.id },
    ...(remotePayment.externalReference ? [{ applicationId: remotePayment.externalReference }] : []),
  ];
  const localPayment = await prisma.championshipPayment.findFirst({ where: { OR: possibleMatches } });
  if (!localPayment) return res.sendStatus(200);

  if (remotePayment.amountCents !== localPayment.amountCents) {
    console.error("Valor do pagamento Mercado Pago divergente.", {
      localPaymentId: localPayment.id,
      expected: localPayment.amountCents,
      received: remotePayment.amountCents,
    });
    return res.sendStatus(200);
  }

  const nextStatus = localPayment.status === "APPROVED"
    ? "APPROVED"
    : mapMercadoPagoStatus(remotePayment.status);
  await prisma.championshipPayment.update({
    where: { id: localPayment.id },
    data: {
      providerPaymentId: remotePayment.id,
      status: nextStatus,
      statusDetail: remotePayment.statusDetail,
      qrCode: remotePayment.qrCode || undefined,
      qrCodeBase64: remotePayment.qrCodeBase64 || undefined,
      expiresAt: remotePayment.expiresAt || undefined,
      paidAt: nextStatus === "APPROVED" ? localPayment.paidAt || new Date() : null,
      lastWebhookAt: new Date(),
    },
  });

  return res.sendStatus(200);
});
