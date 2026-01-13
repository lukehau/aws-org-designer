import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import fs from 'fs';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'AWS Org Designer', // Display name for the .app file
    executableName: 'aws-org-designer', // Binary name (no spaces for CLI)
    icon: 'public/icon', // Electron Forge adds .icns automatically
    afterCopy: [
      (buildPath, _electronVersion, _platform, _arch, callback) => {
        // Remove "type": "module" from package.json before asar packaging
        const packageJsonPath = path.join(buildPath, 'package.json');
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          delete packageJson.type;
          delete packageJson.devDependencies;
          delete packageJson.scripts;
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          callback();
        } catch (err) {
          callback(err as Error);
        }
      },
    ],
  },
  rebuildConfig: {},
  hooks: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'AWS Org Designer',
        icon: 'public/icon.icns',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'AWSOrgDesigner', // No spaces for NuGet package name
        authors: 'Your Name',
        description: 'Visual designer and management tool for AWS Organizations',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
