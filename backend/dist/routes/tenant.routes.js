"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("../controllers/tenant.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Tenant management
 */
/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: The created tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 */
router.post('/', (0, auth_1.authenticate)(), tenant_controller_1.tenantController.createTenant);
/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tenant'
 */
router.get('/', (0, auth_1.authenticate)(), tenant_controller_1.tenantController.getTenants);
exports.default = router;
