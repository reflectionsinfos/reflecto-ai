FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=/api

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm install --include=dev

# Copy all source files (including .env.production)
COPY . .

# Set NODE_ENV to production so Next.js picks up .env.production
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js app with production environment
RUN npm run build --workspace=apps/frontend

FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ARG NEXT_PUBLIC_API_URL=/api
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy package files and dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["npm", "start"]
