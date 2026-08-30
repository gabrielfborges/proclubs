import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { searchEaClubs as searchEaClubsService } from "../services/ea-clubs.service";

const searchSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para buscar o clube."),
});

export const searchEaClubs = asyncHandler(async (req: Request, res: Response) => {
  const { name } = searchSchema.parse(req.query);

  try {
    const clubs = await searchEaClubsService(name);
    res.json(clubs);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Nao foi possivel consultar os clubes da EA agora. Tente novamente em instantes.", 502);
  }
});