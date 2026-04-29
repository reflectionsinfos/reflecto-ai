"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const card_controller_1 = require("../controllers/card.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All card routes are protected
/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Kudos Card management
 */
/**
 * @swagger
 * /api/cards:
 *   get:
 *     summary: Get all cards
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         description: Filter by tenant ID
 *     responses:
 *       200:
 *         description: List of cards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Card'
 */
router.get('/', (0, auth_1.authenticate)(), card_controller_1.cardController.getCards);
/**
 * @swagger
 * /api/cards:
 *   post:
 *     summary: Create a new kudos card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Card'
 *     responses:
 *       200:
 *         description: The created card
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Card'
 */
router.post('/', (0, auth_1.authenticate)(), card_controller_1.cardController.createCard);
/**
 * @swagger
 * /api/cards/user/{email}:
 *   get:
 *     summary: Get cards by user email
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: User email
 *     responses:
 *       200:
 *         description: List of user's cards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Card'
 */
router.get('/user/:email', (0, auth_1.authenticate)(), card_controller_1.cardController.getUserCards);
/**
 * @swagger
 * /api/cards/{id}:
 *   delete:
 *     summary: Delete a card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deletedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card deleted successfully
 */
router.delete('/:id', (0, auth_1.authenticate)(), card_controller_1.cardController.deleteCard);
exports.default = router;
