"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantController = void 0;
const tenant_service_1 = require("../services/tenant.service");
const errorHandler_1 = require("../middleware/errorHandler");
exports.tenantController = {
    createTenant: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { name } = req.body;
        const tenant = await tenant_service_1.tenantService.createTenant(name);
        res.json(tenant);
    }),
    getTenants: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const allTenants = await tenant_service_1.tenantService.getAllTenants();
        res.json(allTenants);
    })
};
