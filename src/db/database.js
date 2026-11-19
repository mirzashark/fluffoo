import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../fluffoo.sqlite');
const schemaPath = path.resolve(__dirname, 'schema.sql');

export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL journal mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('✅ SQLite Database schema initialized successfully at:', dbPath);
}

export default db;
