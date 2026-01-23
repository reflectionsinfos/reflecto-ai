"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.initializeAuth = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_azure_ad_1 = require("passport-azure-ad");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Azure AD Configuration from environment variables
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID) {
    console.error("CRITICAL: AZURE_TENANT_ID or AZURE_CLIENT_ID missing in backend .env");
}
const config = {
    identityMetadata: `https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: CLIENT_ID,
    // Or 'common', 'organizations' if multi-tenant, but we set Single Tenant
    validateIssuer: false, // Allow both v1 and v2 tokens
    loggingLevel: "warn",
    isB2C: false,
    // Required for v2.0
    audience: [CLIENT_ID, `api://${CLIENT_ID}`], // The token must be issued for this API
    allowMultiAudiencesInToken: true,
    loggingNoPII: false,
    scope: ["access_as_user"]
};
// Strategy
const bearerStrategy = new passport_azure_ad_1.BearerStrategy(config, (token, done) => {
    // Verifier function: Check if user exists in DB or just pass token info
    // Token is valid signature-wise if we got here.
    // We can extract user info from token (oid, preferred_username, name)
    // Structure user object for req.user
    const user = {
        id: token.oid,
        name: token.name,
        email: token.preferred_username || token.email || token.unique_name,
        tid: token.tid,
        roles: token.roles || []
    };
    return done(null, user, token);
});
passport_1.default.use(bearerStrategy);
const initializeAuth = () => passport_1.default.initialize();
exports.initializeAuth = initializeAuth;
const authenticate = () => (req, res, next) => {
    // Bypass for demo user
    const authHeader = req.headers['authorization'];
    if (authHeader === 'Bearer demo-token') {
        req.user = {
            oid: 'demo-user-id',
            name: 'Demo User',
            preferred_username: 'demo@example.com',
            roles: ['user'] // or ['admin'] depending on test
        };
        return next();
    }
    return passport_1.default.authenticate("oauth-bearer", { session: false })(req, res, next);
};
exports.authenticate = authenticate;
