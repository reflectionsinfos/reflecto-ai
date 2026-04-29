import passport from "passport";
import { BearerStrategy, IBearerStrategyOption, ITokenPayload, VerifyCallback } from "passport-azure-ad";
import dotenv from "dotenv";

dotenv.config();

// Azure AD Configuration from environment variables
const TENANT_ID = process.env.AZURE_TENANT_ID as string;
const CLIENT_ID = process.env.AZURE_CLIENT_ID as string;

if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID) {
  console.error("CRITICAL: AZURE_TENANT_ID or AZURE_CLIENT_ID missing in backend .env");
}

const config: IBearerStrategyOption = {
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
const bearerStrategy = new BearerStrategy(
  config,
  (token: ITokenPayload, done: VerifyCallback) => {
    // Verifier function: Check if user exists in DB or just pass token info
    // Token is valid signature-wise if we got here.
    // We can extract user info from token (oid, preferred_username, name)

    // Structure user object for req.user
    const user = {
      id: token.oid,
      name: token.name,
      email: token.preferred_username || (token as any).email || (token as any).unique_name,
      tid: token.tid,
      roles: token.roles || []
    };

    return done(null, user, token);
  }
);

passport.use(bearerStrategy);

export const initializeAuth = () => passport.initialize();

export const authenticate = () => (req: any, res: any, next: any) => {
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
  return passport.authenticate("oauth-bearer", { session: false })(req, res, next);
};
