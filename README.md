# Resume Generator

A full-stack application with Next.js frontend and Django backend, fully dockerized.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (for cloning the repository)

## Quick Start

### 1. Start All Services

From the root directory, run:

```bash
docker-compose up --build
```

This command will:
- Build Docker images for frontend and backend
- Start PostgreSQL database
- Start Django backend (runs migrations automatically)
- Start Next.js frontend
- Create persistent volumes for database

### 2. Access the Application

Once all services are running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin
- **API Health Check**: http://localhost:8000/api/health/

### 3. Stop Services

To stop all services:

```bash
docker-compose down
```

To stop and remove volumes (⚠️ this will delete database data):

```bash
docker-compose down -v
```

## Development Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
docker-compose up --build frontend
```

### Run Backend Commands

```bash
# Create Django superuser
docker-compose exec backend python manage.py createsuperuser

# Run migrations manually
docker-compose exec backend python manage.py migrate

# Access Django shell
docker-compose exec backend python manage.py shell
```

### Run in Detached Mode

To run services in the background:

```bash
docker-compose up -d
```

## Project Structure

```
resume_generator/
├── backend/              # Django backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── resume_generator/
├── frontend-next/        # Next.js frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── docker-compose.yml    # Docker orchestration
```

## Environment Variables

Backend environment variables are configured in `backend/.env`:
- `DEBUG`: Set to 1 for development
- `SECRET_KEY`: Django secret key (change in production)
- `DB_*`: Database connection settings
- `CORS_ALLOWED_ORIGINS`: Frontend URL for CORS

## Troubleshooting

### Port Already in Use

If ports 3000, 8000, or 5432 are already in use:

1. Stop the conflicting service, or
2. Modify ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000"  # Frontend on 3001
     - "8001:8000"  # Backend on 8001
   ```

### Database Connection Issues

If the backend can't connect to the database:

1. Ensure the database service is healthy (check logs)
2. Verify `backend/.env` has correct database credentials
3. Try rebuilding: `docker-compose up --build`

### Frontend Build Errors

If the frontend fails to build:

1. Check Node.js version (requires Node 20+)
2. Clear Next.js cache: Remove `.next` folder if exists
3. Rebuild: `docker-compose up --build frontend`

## Production Deployment

For production deployment:

1. Update `SECRET_KEY` in `backend/.env`
2. Set `DEBUG=0` in `backend/.env`
3. Update `ALLOWED_HOSTS` with your domain
4. Configure proper CORS origins
5. Use production-ready database credentials
6. Set up proper SSL/TLS certificates

