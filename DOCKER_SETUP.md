# Docker Setup Guide - SI-BVET

Panduan lengkap untuk menjalankan SI-BVET dengan Docker.

## 📋 Prerequisites

- Docker Desktop (versi 20.10 atau lebih tinggi)
- Docker Compose (versi 1.29 atau lebih tinggi)
- Git (untuk clone repository)

### Install Docker:

- **Windows/Mac:** Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux:**
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

## 🚀 Quickstart

### 1. Clone Repository

```bash
git clone <repository-url>
cd si-bvet
```

### 2. Setup Environment Variables

```bash
# Copy template environment file
cp backend/.env.docker backend/.env.docker.local

# Edit file dengan credentials Anda (PENTING!)
# Ganti:
# - DB_PASSWORD
# - JWT_SECRET
# - SMTP_USERNAME & SMTP_PASSWORD
```

### 3. Build & Run

```bash
# Build images dan start services
docker-compose up --build

# Atau jika ingin run di background
docker-compose up -d --build
```

### 4. Verify Services Running

```bash
# Check status
docker-compose ps

# Check logs backend
docker-compose logs backend

# Check logs postgres
docker-compose logs postgres
```

## 🛑 Stop & Clean Up

```bash
# Stop semua services (data tetap terjaga)
docker-compose down

# Stop dan remove volumes (data akan dihapus!)
docker-compose down -v

# Remove semua (containers, images, volumes)
docker-compose down -v --remove-orphans --rmi all
```

## 📝 File Structure

```
si-bvet/
├── backend/
│   ├── Dockerfile          # Multi-stage build untuk Go app
│   ├── .dockerignore       # Exclude files from Docker build
│   ├── .env.docker         # Template environment variables
│   ├── cmd/server/main.go
│   ├── internal/...
│   └── go.mod
├── docker-compose.yml      # Orchestration config
└── README.md
```

## 🔧 Services Explanation

### PostgreSQL Service

- **Image:** `postgres:16-alpine`
- **Container Name:** `sibvet-postgres`
- **Port:** `5432`
- **Volume:** `postgres_data` (persistent storage)
- **Network:** `sibvet-network`

### Backend Service

- **Build:** `./backend/Dockerfile` (multi-stage build)
- **Container Name:** `sibvet-backend`
- **Port:** `8080`
- **Volume:** `./backend/uploads` (shared with host)
- **Depends On:** `postgres` (waits for healthy status)
- **Network:** `sibvet-network`

## 🔐 Security Best Practices

### PENTING: Sebelum Production!

1. **Change Default Passwords**

   ```yaml
   # Di docker-compose.yml, ubah:
   POSTGRES_PASSWORD: postgres_password_change_me # → gunakan password kuat
   DB_PASSWORD: postgres_password_change_me # → sama dengan atas
   JWT_SECRET: your_secure_jwt_secret_key_change_me
   ```

2. **Use `.env` File (jangan hardcode di docker-compose.yml)**

   ```yaml
   # Lebih baik:
   env_file:
     - .env.production
   ```

3. **Volumes & Permissions**
   - PostgreSQL data disimpan di named volume `postgres_data`
   - Uploads disimpan di `./backend/uploads`
   - Pastikan permissions sudah benar

4. **Network Isolation**
   - Backend & Database terhubung via `sibvet-network`
   - Hanya expose port yang diperlukan

5. **For Production:**
   - Use environment-specific compose files (docker-compose.prod.yml)
   - Use secrets management (Docker Secrets atau tool lain)
   - Setup proper logging & monitoring
   - Use private image registry jika ada

## 🐛 Troubleshooting

### Backend tidak bisa connect ke database

```bash
# Check postgres is running
docker-compose logs postgres

# Check backend logs
docker-compose logs backend

# Verify: db hostname harus 'postgres' (service name), bukan 'localhost'
```

### Port sudah digunakan

```bash
# Ubah di docker-compose.yml:
ports:
  - "5432:5432"  # ubah left side: "5433:5432"
  - "8080:8080"  # ubah left side: "8081:8080"
```

### Need fresh database

```bash
docker-compose down -v
docker-compose up --build
```

### View database with psql

```bash
docker exec -it sibvet-postgres psql -U postgres -d sibvet_lampung

# Common commands:
\dt                    # list tables
\du                    # list users
SELECT * FROM users;   # query example
\q                     # quit
```

## 📊 Monitoring & Debugging

### View Container Stats

```bash
docker stats

# Format: container-name | CPU% | Memory | Network
```

### Access Container Shell

```bash
# Backend
docker exec -it sibvet-backend sh

# Database
docker exec -it sibvet-postgres bash
```

### View Real-time Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🔄 Development Workflow

### Modify Backend Code

```bash
# No need to rebuild, just restart
docker-compose up --build

# Or if using volumes mount (advanced setup):
# Changes auto-reload if using air/hot-reload
```

### Update Dependencies

```bash
# Rebuild image
docker-compose build --no-cache

# Then restart
docker-compose up
```

### Add New Environment Variable

1. Update `backend/.env.docker`
2. Update `docker-compose.yml` environment section
3. Rebuild: `docker-compose up --build`

## 📦 Building Custom Images (Optional)

### For Private Registry

```bash
# Build & tag
docker build -t myregistry.azurecr.io/sibvet-backend:latest ./backend

# Push
docker push myregistry.azurecr.io/sibvet-backend:latest

# Update docker-compose.yml image reference
```

## ✅ Testing

### Health Check

```bash
# Backend should respond to health check
curl http://localhost:8080/health

# Or manually inside container
docker exec sibvet-backend wget http://localhost:8080/health -O -
```

### Database Connection

```bash
# From backend container
docker exec sibvet-backend psql -h postgres -U postgres -d sibvet_lampung -c "SELECT 1;"
```

## 🎯 Next Steps

1. **Setup Frontend Container** (uncomment di docker-compose.yml)
2. **Configure Production Settings** (create docker-compose.prod.yml)
3. **Setup CI/CD Pipeline** (GitHub Actions, GitLab CI, etc)
4. **Add Reverse Proxy** (Nginx, Traefik)
5. **Setup Logging & Monitoring** (ELK Stack, Prometheus, etc)

## 📚 Useful Commands Cheat Sheet

```bash
# Build & run
docker-compose up -d --build

# View services
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop
docker-compose down

# Remove everything
docker-compose down -v --remove-orphans --rmi all

# Execute command in container
docker-compose exec backend [command]

# Rebuild specific service
docker-compose build --no-cache backend

# Push to registry
docker tag sibvet-backend:latest myregistry/sibvet-backend:latest
docker push myregistry/sibvet-backend:latest
```

## 📞 Support

Jika ada masalah:

1. Check logs: `docker-compose logs`
2. Verify connectivity: `docker-compose exec backend ping postgres`
3. Check environment: `docker-compose config`
4. Rebuild fresh: `docker-compose down -v && docker-compose up --build`

---

**Last Updated:** May 4, 2026
**Status:** Ready for Development
