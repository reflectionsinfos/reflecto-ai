"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kudos Card Generator API',
            version: '1.0.0',
            description: 'API documentation for the Kudos Card Generator application',
        },
        servers: [
            {
                url: 'http://localhost:4000',
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Tenant: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['admin', 'user'] },
                        tenantId: { type: 'string', format: 'uuid' },
                    },
                },
                Card: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        recipientName: { type: 'string' },
                        creatorName: { type: 'string' },
                        message: { type: 'string' },
                        template: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};
exports.specs = (0, swagger_jsdoc_1.default)(options);
