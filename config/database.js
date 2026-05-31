// config/database.js
// Adaptador de Base de Datos: MySQL / SQLite

require('dotenv').config();

const requireMysql = () => {
  const mysql = require('mysql2');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_municipal',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = mysql.createPool(dbConfig);
  const promisePool = pool.promise();

  const testConnection = async () => {
    try {
      const connection = await promisePool.getConnection();
      console.log('✓ Conexión exitosa a la base de datos MySQL');
      connection.release();
      return true;
    } catch (error) {
      console.error('✗ Error al conectar a la base de datos MySQL:', error.message);
      return false;
    }
  };

  const query = async (sql, params) => {
    try {
      const [results] = await promisePool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('Error en query MySQL:', error);
      throw error;
    }
  };

  return {
    pool: promisePool,
    testConnection,
    query
  };
};

// Si el cliente no es sqlite, usar mysql original
if (process.env.DB_CLIENT !== 'sqlite') {
  module.exports = requireMysql();
} else {
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');

  const dbPath = process.env.SQLITE_DB_PATH || './database/gestion_municipal.db';
  
  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('✗ Error al abrir la base de datos SQLite:', err.message);
    } else {
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) console.error('Error habilitando foreign_keys:', err.message);
        });
        db.run('PRAGMA journal_mode = WAL;', (err) => {
          if (err) console.error('Error habilitando journal_mode WAL:', err.message);
        });
      });
    }
  });

  const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };

  const translateQuery = (sql) => {
    if (typeof sql !== 'string') return sql;

    let translated = sql;

    // 1. Specific MONTH(CURDATE()) and YEAR(CURDATE()) translations
    translated = translated.replace(/MONTH\(CURDATE\(\)\)/gi, "CAST(strftime('%m', 'now', 'localtime') AS INTEGER)");
    translated = translated.replace(/YEAR\(CURDATE\(\)\)/gi, "CAST(strftime('%Y', 'now', 'localtime') AS INTEGER)");

    // 2. Specific MONTH(NOW()) and YEAR(NOW()) translations (just in case)
    translated = translated.replace(/MONTH\(NOW\(\)\)/gi, "CAST(strftime('%m', 'now', 'localtime') AS INTEGER)");
    translated = translated.replace(/YEAR\(NOW\(\)\)/gi, "CAST(strftime('%Y', 'now', 'localtime') AS INTEGER)");

    // 3. DATE_FORMAT(A, B) -> strftime(B, A) (must be translated before commas check)
    translated = translated.replace(/DATE_FORMAT\(([^,]+),\s*([^)]+)\)/gi, 'strftime($2, $1)');

    // 4. DATEDIFF(A, B) -> MUST BE TRANSLATED BEFORE CURDATE()/NOW() because of commas in arguments
    translated = translated.replace(/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, 'CAST(julianday($1) - julianday($2) AS INTEGER)');

    // 5. DATE_ADD(A, INTERVAL B DAY/MONTH/YEAR) -> MUST BE TRANSLATED BEFORE CURDATE()/NOW()
    translated = translated.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s*([^ ]+)\s+(DAY|MONTH|YEAR)S?\)/gi, (match, expr, interval, unit) => {
      unit = unit.toLowerCase();
      return `date(${expr}, '+' || ${interval} || ' ${unit}s')`;
    });

    // 6. DATE_SUB(A, INTERVAL B DAY/MONTH/YEAR) -> MUST BE TRANSLATED BEFORE CURDATE()/NOW()
    translated = translated.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s*([^ ]+)\s+(DAY|MONTH|YEAR)S?\)/gi, (match, expr, interval, unit) => {
      unit = unit.toLowerCase();
      return `date(${expr}, '-' || ${interval} || ' ${unit}s')`;
    });

    // 7. CONCAT(a, b, ...) -> MUST BE TRANSLATED BEFORE CURDATE()/NOW()
    translated = translated.replace(/CONCAT\(([^)]+)\)/gi, (match, args) => {
      const parts = args.split(',').map(p => p.trim());
      return '(' + parts.join(' || ') + ')';
    });

    // 8. NOW() -> datetime('now', 'localtime')
    translated = translated.replace(/NOW\(\)/gi, "datetime('now', 'localtime')");

    // 9. CURDATE() -> date('now', 'localtime')
    translated = translated.replace(/CURDATE\(\)/gi, "date('now', 'localtime')");

    // 10. TO_DAYS(A) -> CAST(julianday(A) AS INTEGER)
    translated = translated.replace(/TO_DAYS\(([^)]+)\)/gi, 'CAST(julianday($1) AS INTEGER)');

    // 11. MONTH(A) -> CAST(strftime('%m', A) AS INTEGER)
    translated = translated.replace(/MONTH\(([^)]+)\)/gi, "CAST(strftime('%m', $1) AS INTEGER)");

    // 12. YEAR(A) -> CAST(strftime('%Y', A) AS INTEGER)
    translated = translated.replace(/YEAR\(([^)]+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)");

    // 13. INSERT IGNORE -> INSERT OR IGNORE
    translated = translated.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO');

    return translated;
  };

  const cleanParams = (params) => {
    if (!params) return [];
    return params.map(val => val === undefined ? null : val);
  };

  const execute = async (sql, params = []) => {
    const translatedSql = translateQuery(sql);
    const cleanedParams = cleanParams(params);

    const isSelect = translatedSql.trim().match(/^(select|show|pragma|explain|with)\b/i);

    try {
      if (isSelect) {
        const rows = await dbAll(translatedSql, cleanedParams);
        return [rows, undefined];
      } else {
        const result = await dbRun(translatedSql, cleanedParams);
        const okPacket = {
          insertId: result.lastID,
          affectedRows: result.changes,
          fieldCount: 0,
          info: '',
          serverStatus: 2,
          warningStatus: 0
        };
        return [okPacket, undefined];
      }
    } catch (error) {
      console.error('Error ejecutando query SQLite:', { sql, translatedSql, params, error });
      throw error;
    }
  };

  const getConnection = async () => {
    return {
      execute: async (sql, params = []) => {
        return execute(sql, params);
      },
      release: () => {
        // No-op para sqlite
      }
    };
  };

  const promisePoolMock = {
    execute,
    getConnection,
    query: async (sql, params = []) => {
      const [results] = await execute(sql, params);
      return results;
    }
  };

  const testConnection = async () => {
    try {
      await dbAll('SELECT 1');
      console.log('✓ Conexión y chequeo exitoso a la base de datos local SQLite');
      return true;
    } catch (error) {
      console.error('✗ Error al conectar a la base de datos SQLite:', error.message);
      return false;
    }
  };

  const query = async (sql, params = []) => {
    const [results] = await execute(sql, params);
    return results;
  };

  module.exports = {
    pool: promisePoolMock,
    testConnection,
    query
  };
}
