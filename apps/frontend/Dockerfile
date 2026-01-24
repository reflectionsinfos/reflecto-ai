FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm install

# Copy all source files (including .env.production)
COPY . .

# Set NODE_ENV to production so Next.js picks up .env.production
ENV NODE_ENV=production

# Build the Next.js app with production environment
RUN npm run build --workspace=apps/frontend

FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["npm", "start"]
