import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPath = path.resolve(__dirname, '../../fluffoo.sqlite');
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(process.cwd(), 'fluffoo.sqlite');
}
let schemaPath = path.resolve(__dirname, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  schemaPath = path.join(process.cwd(), 'src/db/schema.sql');
}

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
  dbPath = tmpDbPath;
}

export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (_) {
  // Ignore WAL fallback in environments where WAL is restricted
}

export function initDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ SQLite Database schema initialized successfully at:', dbPath);
}

export default db;
