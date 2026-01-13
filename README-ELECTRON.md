# Electron Desktop App

This project now supports building as both a web application and a desktop application using Electron Forge.

## Development

### Web Development (Default)
```bash
# Start web dev server (unchanged)
docker-compose up -d
docker-compose exec app npm run dev

# Build for web deployment
docker-compose exec app npm run build
```

### Desktop Development
```bash
# Start Electron app in development mode (works in Docker)
docker-compose exec app npm run forge:start
```

This will:
- Start the Vite dev server
- Launch the Electron app
- Enable hot reload for both renderer and main process

**Note:** Electron dev mode works fine in Docker for development and testing.

## Building Desktop Apps

### ⚠️ Important: Docker Limitations

**What Works in Docker:**
- ✅ Web development (`npm run dev`)
- ✅ Electron development mode (`npm run forge:start`)
- ✅ Web builds (`npm run build`)
- ✅ Linux packages (`.deb`, `.rpm`)

**What Doesn't Work in Docker:**
- ❌ macOS builds (requires macOS + Xcode tools)
- ⚠️ Windows builds (possible but limited, no code signing)

### Building for macOS (Your Platform)

Since you're on macOS, you need to run packaging **locally** (outside Docker):

```bash
# 1. Install Node.js locally (one-time setup)
brew install node

# 2. Install dependencies locally (one-time setup)
npm install

# 3. Package for macOS
npm run forge:package  # Creates unpacked .app in out/

# 4. Create distributable
npm run forge:make     # Creates .zip in out/make/
```

**Why?** macOS builds require native toolchain (Xcode command line tools) that aren't available in Linux Docker containers.

### Building for Other Platforms

**For Linux packages (works in Docker):**
```bash
docker-compose exec app npm run forge:package
docker-compose exec app npm run forge:make
```

**For Windows/macOS (use GitHub Actions):**
See the "GitHub Actions for Multi-Platform Builds" section below.

## Project Structure

```
src/
├── main/              # Electron main process (Node.js)
│   ├── index.ts       # Main process entry point
│   └── vite-env.d.ts  # Type definitions
├── preload/           # Electron preload scripts
│   ├── index.ts       # Preload script (security bridge)
│   └── vite-env.d.ts  # Type definitions
├── App.tsx            # React app (works for both web and desktop)
├── components/        # React components (shared)
└── ...                # All other app code (shared)

forge.config.ts        # Electron Forge configuration
vite.main.config.ts    # Vite config for main process
vite.preload.config.ts # Vite config for preload script
vite.renderer.config.ts # Vite config for renderer (React app)
vite.config.ts         # Original Vite config (for web builds)
```

## Configuration Files

- `forge.config.ts` - Electron Forge configuration (packaging, makers, plugins)
- `vite.main.config.ts` - Vite configuration for Electron main process
- `vite.preload.config.ts` - Vite configuration for preload script
- `vite.renderer.config.ts` - Vite configuration for renderer (React app in Electron)
- `vite.config.ts` - Original Vite config for standalone web builds

## Adding Desktop-Specific Features

If you need desktop-specific features later (file dialogs, system tray, etc.):

1. Add APIs in `src/main/index.ts` (main process)
2. Expose them in `src/preload/index.ts` (security bridge)
3. Use them in your React components via `window.electronAPI`

Example:
```typescript
// In preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile')
});

// In your React component
if (window.electronAPI) {
  const file = await window.electronAPI.openFile();
}
```

## GitHub Actions for Multi-Platform Builds

For production releases, use GitHub Actions to build for all platforms automatically:

```yaml
# .github/workflows/build.yml
name: Build Desktop Apps

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run forge:make
      
      - uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-build
          path: out/make/**/*
```

This will automatically build:
- **macOS**: `.zip` on macOS runner
- **Windows**: `.exe` installer on Windows runner
- **Linux**: `.deb` and `.rpm` on Linux runner

## Recommended Workflow

1. **Development**: Use Docker for both web and Electron dev mode
2. **Testing**: Run `npm run forge:start` in Docker to test desktop app
3. **Local Builds**: Run packaging locally on your Mac when needed
4. **Production**: Use GitHub Actions for multi-platform releases

## Notes

- Web version remains the default development experience
- Docker workflow is preserved for development
- All existing app code works unchanged in both environments
- No desktop-specific features are currently implemented
- Packaging requires platform-specific tools (run locally or use CI/CD)
