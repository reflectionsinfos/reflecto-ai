# ReflectoAI

A futuristic, AI-powered HR recognition platform.

## Project Structure (Monorepo)

- **`apps/frontend`**: The Next.js Web Application.
- **`apps/backend`**: The Node.js/AI Service.
- **`packages/`**: Shared libraries.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Running the App

To start **both** the Frontend and Backend simultaneously:

```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: (Console Output)

### Other Commands

- `npm run build` - Build all apps.
- `npm run lint` - Lint all code.

### Docker Deployment

To run the application using Docker Compose (recommended for production):

```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```
