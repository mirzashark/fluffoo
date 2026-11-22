import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveExisting(pathsList) {
  for (const p of pathsList) {
    if (fs.existsSync(p)) return p;
  }
  return pathsList[0];
}

let dbPath = resolveExisting([
  path.resolve(__dirname, '../../fluffoo.sqlite'),
  path.join(process.cwd(), 'fluffoo.sqlite'),
  path.resolve(__dirname, '../fluffoo.sqlite'),
  path.resolve(__dirname, 'fluffoo.sqlite')
]);

let schemaPath = resolveExisting([
  path.resolve(__dirname, 'schema.sql'),
  path.join(process.cwd(), 'src/db/schema.sql'),
  path.resolve(__dirname, '../schema.sql')
]);

// In Vercel serverless functions, the deployment directory is read-only.
// Copy bundled SQLite database to /tmp for full read/write support.
if (process.env.VERCEL) {
  const tmpDbPath = path.join('/tmp', 'fluffoo.sqlite');
  if (!fs.existsSync(tmpDbPath)) {
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, tmpDbPath);
        console.log('📦 Copied pre-seeded fluffoo.sqlite to /tmp for Vercel execution');
      } catch (err) {
        console.error('Failed to copy bundled sqlite to /tmp:', err);
      }
    }
  }
  if (fs.existsSync(tmpDbPath)) {
    dbPath = tmpDbPath;
  }
}

export const db = new DatabaseSync(dbPath);

// Enable foreign keys
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch (_) {}

try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (_) {
  // Ignore WAL fallback in environments where WAL is restricted
}

export function initDatabase() {
  try {
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
      console.log('✅ SQLite Database schema initialized successfully at:', dbPath);
    }
  } catch (err) {
    console.error('Database schema initialization notice:', err.message);
  }
}

export default db;
