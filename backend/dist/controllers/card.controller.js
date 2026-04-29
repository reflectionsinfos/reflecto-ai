"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardController = void 0;
const card_service_1 = require("../services/card.service");
const errorHandler_1 = require("../middleware/errorHandler");
exports.cardController = {
    createCard: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const cardData = req.body;
        const user = req.user;
        const card = await card_service_1.cardService.createCard(cardData, user);
        res.json(card);
    }),
    getCards: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { tenantId } = req.query;
        const cards = await card_service_1.cardService.getAllCards(tenantId);
        res.json(cards);
    }),
    getUserCards: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { email } = req.params;
        const cards = await card_service_1.cardService.getUserCards(email);
        res.json(cards);
    }),
    deleteCard: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const { deletedBy } = req.body;
        const result = await card_service_1.cardService.deleteCard(id, deletedBy);
        res.json(result);
    })
};
