/**
 * Database wrapper for sql.js
 * Provides a synchronous-like API similar to better-sqlite3
 * so we don't have to rewrite all routes
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = null;
let saveInterval = null;

/**
 * Initialize the database
 */
async function initDatabase(filePath) {
  dbPath = filePath;
  const SQL = await initSqlJs();
  
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Auto-save every 5 seconds
  saveInterval = setInterval(() => {
    saveDatabase();
  }, 5000);

  return createWrapper();
}

/**
 * Save database to disk
 */
function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Create a wrapper that mimics better-sqlite3 API
 */
function createWrapper() {
  const wrapper = {
    prepare: (sql) => {
      return {
        run: (...params) => {
          try {
            db.run(sql, params);
            // Get last insert rowid
            const result = db.exec('SELECT last_insert_rowid() as id');
            const lastId = result.length > 0 ? result[0].values[0][0] : 0;
            // Get changes count
            const changes = db.exec('SELECT changes() as c');
            const changesCount = changes.length > 0 ? changes[0].values[0][0] : 0;
            saveDatabase();
            return { lastInsertRowid: lastId, changes: changesCount };
          } catch (e) {
            console.error('SQL run error:', sql, params, e.message);
            throw e;
          }
        },
        get: (...params) => {
          try {
            const stmt = db.prepare(sql);
            if (params.length > 0) stmt.bind(params);
            if (stmt.step()) {
              const cols = stmt.getColumnNames();
              const vals = stmt.get();
              stmt.free();
              const row = {};
              cols.forEach((col, i) => { row[col] = vals[i]; });
              return row;
            }
            stmt.free();
            return undefined;
          } catch (e) {
            console.error('SQL get error:', sql, params, e.message);
            throw e;
          }
        },
        all: (...params) => {
          try {
            const stmt = db.prepare(sql);
            if (params.length > 0) stmt.bind(params);
            const rows = [];
            const cols = stmt.getColumnNames();
            while (stmt.step()) {
              const vals = stmt.get();
              const row = {};
              cols.forEach((col, i) => { row[col] = vals[i]; });
              rows.push(row);
            }
            stmt.free();
            return rows;
          } catch (e) {
            console.error('SQL all error:', sql, params, e.message);
            throw e;
          }
        }
      };
    },
    exec: (sql) => {
      try {
        db.run(sql);
        saveDatabase();
      } catch (e) {
        console.error('SQL exec error:', e.message);
        throw e;
      }
    },
    pragma: (p) => {
      try {
        db.run(`PRAGMA ${p}`);
      } catch (e) {
        // Ignore pragma errors
      }
    },
    transaction: (fn) => {
      return (...args) => {
        db.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          db.run('COMMIT');
          saveDatabase();
          return result;
        } catch (e) {
          db.run('ROLLBACK');
          throw e;
        }
      };
    },
    close: () => {
      if (saveInterval) clearInterval(saveInterval);
      saveDatabase();
      if (db) db.close();
    }
  };

  return wrapper;
}

module.exports = { initDatabase, saveDatabase };
