import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

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
router.get('/', authenticate(), cardController.getCards);

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
router.post('/', authenticate(), cardController.createCard);

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
router.get('/user/:email', authenticate(), cardController.getUserCards);

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
router.delete('/:id', authenticate(), cardController.deleteCard);


export default router;
