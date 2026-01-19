FROM node:20-alpine AS builder
WORKDIR /app
# Copy root package files
COPY package*.json ./
# Copy backend package file
COPY apps/backend/package*.json ./apps/backend/
# Install dependencies (from root to respect workspaces)
RUN npm install

# Copy source code
COPY . .
# Build backend
RUN npm run build --workspace=apps/backend

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

# Copy necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend

# Set working directory to backend
WORKDIR /app/apps/backend

EXPOSE 4000
CMD ["npm", "start"]
