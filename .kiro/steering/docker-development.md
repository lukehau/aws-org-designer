# Docker Development Environment Guidelines

## Core Principle
This project uses Docker for all development operations. Node.js is NOT installed locally - all commands must be executed through Docker containers.

## Key Rules

### 1. Never Modify Docker Configuration
- **Never modify**: `Dockerfile` or `docker-compose.yml`
- **Never suggest**: Changes to Docker configuration files
- **Always work within**: The existing Docker setup as provided

### 2. Always Use Docker Commands
- **Never run**: `npm`, `node`, `npx`, or any Node.js commands directly
- **Always use**: `docker-compose exec app <command>` for interactive commands
- **Always use**: `docker-compose run --rm app <command>` for one-off commands

### 3. Background Operations Only
- **Never run**: `docker-compose up` (blocks terminal)
- **Never run**: `docker-compose logs -f app` (blocks terminal)
- **Always use**: `docker-compose up -d` (detached/background mode)
- **Always use**: `docker-compose logs app` or `docker-compose logs app --tail=50` (non-following)

### 4. Common Command Patterns

#### Starting/Stopping Services
```bash
# Start services in background
docker-compose up -d

# Rebuild and start in background
docker-compose up --build -d

# Stop services
docker-compose down
```

#### Running Development Commands
```bash
# Install dependencies
docker-compose exec app npm install

# Run build
docker-compose exec app npm run build

# Run linting
docker-compose exec app npm run lint

# Run any npm script
docker-compose exec app npm run <script-name>
```

#### Checking Logs and Status
```bash
# View recent logs (non-blocking)
docker-compose logs app

# View last 50 lines of logs
docker-compose logs app --tail=50

# Check if services are running
docker-compose ps
```

#### File Operations
```bash
# Execute shell commands in container
docker-compose exec app sh

# Run one-off commands
docker-compose run --rm app <command>
```

### 5. Development Workflow
1. Start services: `docker-compose up -d`
2. Check logs: `docker-compose logs app`
3. Run commands: `docker-compose exec app <command>`
4. View logs when needed: `docker-compose logs app --tail=20`
5. Stop when done: `docker-compose down`

### 6. Port Access
- Application runs on: `http://localhost:3000`
- Internal container port: `5173`
- Always use `localhost:3000` for browser access

### 7. Volume Mounts
- Source code is mounted as volume for live reloading
- `node_modules` is a named volume for performance
- Changes to source files are immediately reflected

## Benefits
- Consistent development environment across all machines
- No need for local Node.js installation
- Isolated dependencies and environment
- Easy cleanup and reset capabilities
- Matches production environment more closely

## Troubleshooting
- If containers aren't responding: `docker-compose restart`
- If you need to rebuild: `docker-compose up --build -d`
- If you need to reset: `docker-compose down && docker-compose up -d`
- To see container status: `docker-compose ps`