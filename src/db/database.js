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

// Determine whether to use native node:sqlite or sql.js (WebAssembly)
let nativeDb = null;
let sqlJsDb = null;
let canUseNative = false;

try {
  if (process.env.TEST_FORCE_SQL_JS) throw new Error('Forced sql.js test mode');
  const { DatabaseSync } = await import('node:sqlite');
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/fluffoo.sqlite';
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, tmpDbPath);
        console.log('📦 Copied fluffoo.sqlite to /tmp');
      } catch (e) {
        console.error('Failed to copy sqlite to /tmp:', e.message);
      }
    }
    if (fs.existsSync(tmpDbPath)) {
      dbPath = tmpDbPath;
    }
  }
  nativeDb = new DatabaseSync(dbPath);
  canUseNative = true;
  console.log('⚡ Using native node:sqlite engine at:', dbPath);
} catch (nativeErr) {
  console.log('ℹ️ Native node:sqlite unavailable, switching to sql.js (WebAssembly):', nativeErr.message);
  canUseNative = false;
}

if (!canUseNative) {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
  }
  const rawDb = buffer ? new SQL.Database(buffer) : new SQL.Database();
  console.log('🌐 SQLite WebAssembly (sql.js) engine initialized successfully');

  class SqlJsAdapter {
    constructor(raw, persistPath = null) {
      this._db = raw;
      this._persistPath = persistPath;
    }

    prepare(sql) {
      const self = this;
      return {
        all(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const stmt = self._db.prepare(sql);
          try {
            if (flat.length > 0) stmt.bind(flat);
            const rows = [];
            while (stmt.step()) {
              rows.push(stmt.getAsObject());
            }
            return rows;
          } finally {
            stmt.free();
          }
        },

        get(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const stmt = self._db.prepare(sql);
          try {
            if (flat.length > 0) stmt.bind(flat);
            const row = stmt.step() ? stmt.getAsObject() : undefined;
            return row;
          } finally {
            stmt.free();
          }
        },

        run(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const stmt = self._db.prepare(sql);
          try {
            if (flat.length > 0) stmt.bind(flat);
            stmt.step();
            const changes = self._db.getRowsModified();
            const idRes = self._db.exec('SELECT last_insert_rowid() as id');
            const lastInsertRowid = idRes[0]?.values[0]?.[0] || 0;
            self._save();
            return { changes, lastInsertRowid };
          } finally {
            stmt.free();
          }
        }
      };
    }

    exec(sql) {
      const res = this._db.exec(sql);
      this._save();
      return res;
    }

    _save() {
      if (this._persistPath) {
        try {
          const data = this._db.export();
          fs.writeFileSync(this._persistPath, Buffer.from(data));
        } catch (_) {}
      }
    }
  }

  const persistTarget = process.env.VERCEL ? '/tmp/fluffoo.sqlite' : dbPath;
  sqlJsDb = new SqlJsAdapter(rawDb, persistTarget);
}

export const db = nativeDb || sqlJsDb;

// Enable foreign keys
try {
  db.exec('PRAGMA foreign_keys = ON;');
} catch (_) {}

try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (_) {}

export function initDatabase() {
  try {
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
      console.log('✅ SQLite Database schema checked/initialized successfully');
    }
  } catch (err) {
    console.log('Notice during initDatabase:', err.message);
  }
}

export default db;
