import { Request, Response } from 'express';
import { cardService } from '../services/card.service';
import { asyncHandler } from '../middleware/errorHandler';

export const cardController = {
  createCard: asyncHandler(async (req: Request, res: Response) => {
    const cardData = req.body;
    const user = req.user as any; 
    const card = await cardService.createCard(cardData, user);
    res.json(card);
  }),

  getCards: asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.query;
    const cards = await cardService.getAllCards(tenantId as string);
    res.json(cards);
  }),

  getUserCards: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;
    const cards = await cardService.getUserCards(email);
    res.json(cards);
  }),

  deleteCard: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { deletedBy } = req.body;
    const result = await cardService.deleteCard(id, deletedBy);
    res.json(result);
  })
};
