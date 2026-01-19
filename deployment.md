# Deployment Guide for Reflecto AI (Docker)

This guide details the steps to deploy the **Reflecto AI** application to the remote server `192.168.117.114` using Docker. This ensures isolation and avoids Node.js version conflicts.

## Prerequisites

Ensure the following are installed on `192.168.117.114`:

- **Docker**: Container runtime.
  _Rocky Linux 9 Installation:_

  ```bash
  # 1. Add Docker Repo
  sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

  # 2. Install Docker
  sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

  # 3. Start and Enable Docker
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

- **Docker Compose**: Included as a plugin (`docker compose`) in recent versions, or install standalone if needed.
  _(Check with `docker compose version`)_.
- **Nginx**: Web server / Reverse proxy.
- **Git**: Version control.

To check your Linux version (useful for installing Docker):

```bash
cat /etc/os-release
```

## 1. Project Setup

1.  **Clone or Copy the repository**:
    Deploy the code to a suitable directory, e.g., `/var/www/reflecto-ai`.
    ```bash
    mkdir -p /var/www/reflecto-ai
    # (Copy files via SCP or Git clone)
    cd /var/www/reflecto-ai
    ```

## 2. Environment Configuration

### Backend (`apps/backend/.env`)

Create `apps/backend/.env`:

```env
PORT=4000
DATABASE_URL=postgres://user:password@host.docker.internal:5432/reflecto_db
# Or use real DB IP. 'host.docker.internal' works if DB is on the host machine.
```

### Frontend (`apps/frontend/.env.production`)

Create `apps/frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=/api
```

## 3. Build and Run

Run the application using Docker Compose.

```bash
# Build and start services in detached mode
sudo docker-compose up -d --build
```

- **Backend** will be accessible on `localhost:4000`.
- **Frontend** will be accessible on `localhost:3000`.

## 4. Nginx Configuration

1.  **Copy the Configuration**:
    Copy the provided `reflecto-prod-app.conf` to `/etc/nginx/conf.d/`.

    ```bash
    sudo cp apps/infra/reflecto-prod-app.conf /etc/nginx/conf.d/
    ```

2.  **Verify and Reload Nginx**:

    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

## Troubleshooting

- **Logs**:
  ```bash
  docker-compose logs -f
  ```
- **Restart**:
  ```bash
  docker-compose restart
  ```
- **Stop**:
  ```bash
  docker-compose down
  ```
