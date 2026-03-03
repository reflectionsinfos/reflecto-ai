"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("../services/user.service");
const errorHandler_1 = require("../middleware/errorHandler");
exports.userController = {
    createUser: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { email, name, role, tenantId } = req.body;
        const user = await user_service_1.userService.createUser({ email, name, role, tenantId });
        res.json(user);
    }),
    getCurrentUser: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const email = req.user?.email;
        if (!email) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await user_service_1.userService.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId
        });
    }),
    getUsers: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { email } = req.query;
        if (email && typeof email === 'string') {
            const user = await user_service_1.userService.getUserByEmail(email);
            return res.json(user || null);
        }
        const allUsers = await user_service_1.userService.getAllUsers();
        res.json(allUsers);
    })
};
