# Deployment Guide for Reflecto AI (Docker)

This guide details the steps to deploy the **Reflecto AI** application to the remote server `192.168.117.114` using Docker. This ensures isolation and avoids Node.js version conflicts.

## Prerequisites

Ensure the following are installed on `192.168.117.144`:

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
  ```bash
  sudo dnf install git -y
  ```

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

### Option A: Full Stack (Includes Database - For Dev/Test)

Creates a fresh database container. Good for testing or isolated environments.

```bash
sudo docker compose up -d --build
```

### Option B: Production (Uses Host Database)

**Recommended for 192.168.117.114**. Connects to your existing local Postgres and assumes Nginx is on the host.
a. Connect winscp to 192.168.117.114 using refluser and gi5ruS4s=ewo&5
b. Copy apps folder from local to /var/www/reflecto-ai
c. open the putty and login to 192.168.117.114
d. change the folder to /var/www/reflecto-ai then run the below command

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

_Note: This configuration uses `host.docker.internal` to connect to the database running natively on the server._

- **Backend** will be accessible on `localhost:4000`.
- **Frontend** will be accessible on `localhost:3000`.

## 4. Nginx Configuration

1.  **Copy the Configuration**:
    Copy the provided `reflecto-prod-app.conf` to `/etc/nginx/conf.d/`.

    ```bash
    sudo cp apps/infra/reflecto-prod-app.conf /etc/nginx/conf.d/
    # Make sure to copy samiksha-prod-app.conf as well if needed
    sudo cp apps/infra/samiksha-prod-app.conf /etc/nginx/conf.d/
    ```

2.  **Verify and Reload Nginx**:

    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

3.  **Update Azure AD Redirect URIs (Frontend App)**:
    Locate the App Registration for the **Frontend** (Client ID: `7e34b4ec-3528-4096-866e-615d3e0eb06d`).
    _Do not edit the Backend app registration._
    Ensure the following URIs are added to the Authentication -> Redirect URIs section:
    - `https://reflecto-ai.onreflections.com`
    - `https://samiksha-ai.onreflections.com` (If you intend to access via this domain)

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

## 5. Clean Re-deployment (If changes are not reflecting)

If you have updated the code but the app still shows the old version, run these commands to remove old images and rebuild from scratch:

**Important**: Ensure you have re-copied the latest `apps` folder to `/var/www/reflecto-ai` before running this.

```bash
# 1. Stop containers and remove images
sudo docker compose -f docker-compose.prod.yml down --rmi all

# 2. Build freshly without cache
sudo docker compose -f docker-compose.prod.yml build --no-cache

# 3. Start services
sudo docker compose -f docker-compose.prod.yml up -d --force-recreate
```
