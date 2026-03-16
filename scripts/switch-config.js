/**
 * Switch Config Script
 * สลับ config.php ระหว่าง dev และ prod
 * 
 * Usage: 
 *   node scripts/switch-config.js dev       - สลับทั้ง public และ dist เป็น dev
 *   node scripts/switch-config.js prod      - สลับทั้ง public และ dist เป็น prod  
 *   node scripts/switch-config.js dev-local - สลับเฉพาะ public เป็น dev (ไม่แตะ dist)
 */

import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, '..', 'public', 'api');
const distApiDir = join(__dirname, '..', 'dist', 'api');

let env = process.argv[2] || 'dev';
const localOnly = env === 'dev-local';
if (localOnly) env = 'dev';

const configSource = env === 'prod'
    ? join(apiDir, 'config.prod.php')
    : join(apiDir, 'config.dev.php');

const configTarget = join(apiDir, 'config.php');
const distConfigTarget = join(distApiDir, 'config.php');

console.log(`🔄 Switching to ${env.toUpperCase()} config...${localOnly ? ' (public only)' : ''}`);

if (!existsSync(configSource)) {
    console.error(`❌ Config file not found: ${configSource}`);
    process.exit(1);
}

// Copy to public/api/config.php
copyFileSync(configSource, configTarget);
console.log(`✓ Copied to: ${configTarget}`);

// Also copy to dist/api/config.php if dist exists AND not local-only mode
if (!localOnly && existsSync(distApiDir)) {
    copyFileSync(configSource, distConfigTarget);
    console.log(`✓ Copied to: ${distConfigTarget}`);
}

console.log(`✅ Config switched to: ${env.toUpperCase()}`);
