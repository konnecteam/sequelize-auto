
const sequelize = require('sequelize');
const _ = require('lodash');

export class Dialects {

  /**
   * function isPrimaryKey : record
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */

  /**
   * function getForeignKeysQuery : (tableName, schemaName)
   * Generates an SQL query that returns all foreign keys of a table.
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */

  /**
   * function isForeignKey : record
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual foreign key
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */

  /**
   * function isUnique : record
   * Determines if record entry from the getForeignKeysQuery
   * results is a unique key
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */

  /**
   * function isSerialKey : record
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual serial/auto increment key
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */

  /**
   * function showTablesQuery : schema
   * Overwrites Sequelize's native method for showing all tables.
   * This allows custom schema support
   * @param {String} schema The schema to list all tables from
   * @return {String}
   */

  public static sqlite = {

    isPrimaryKey : record => {
      return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
    },
    getForeignKeysQuery : (tableName, schemaName) => {
      return "SELECT \
          K.CONSTRAINT_NAME as constraint_name \
        , K.CONSTRAINT_SCHEMA as source_schema \
        , K.TABLE_SCHEMA as source_table \
        , K.COLUMN_NAME as source_column \
        , K.REFERENCED_TABLE_SCHEMA AS target_schema \
        , K.REFERENCED_TABLE_NAME AS target_table \
        , K.REFERENCED_COLUMN_NAME AS target_column \
        , C.extra \
        , C.COLUMN_KEY AS column_key \
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS K \
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS AS C \
          ON C.TABLE_NAME = K.TABLE_NAME AND C.COLUMN_NAME = K.COLUMN_NAME \
        WHERE \
          K.TABLE_NAME = '" + tableName + "' \
          AND K.CONSTRAINT_SCHEMA = '" + schemaName + "';";
    }
  };

  public static mysql = {
    isForeignKey : record => {
      return _.isObject(record) && _.has(record, 'extra') && record.extra !== 'auto_increment';
    },
    isUnique : record => {
      return _.isObject(record) && _.has(record, 'column_key') && record.column_key.toUpperCase() === 'UNI';
    },
    isPrimaryKey : record => {
      return _.isObject(record) && _.has(record, 'constraint_name') && record.constraint_name === 'PRIMARY';
    },
    isSerialKey : record => {
      return _.isObject(record) && _.has(record, 'extra') && record.extra === 'auto_increment';
    }
  };

  public static postgres = {
    getForeignKeysQuery : (tableName, schemaName) => {
      return 'SELECT \
        o.conname AS constraint_name, \
        (SELECT nspname FROM pg_namespace WHERE oid=m.relnamespace) AS source_schema, \
        m.relname AS source_table, \
        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column, \
        (SELECT nspname FROM pg_namespace WHERE oid=f.relnamespace) AS target_schema, \
        f.relname AS target_table, \
        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column, \
        o.contype, \
        (SELECT d.adsrc AS extra FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid,  d.adnum) \
        WHERE NOT a.attisdropped AND a.attnum > 0 AND a.attrelid = o.conrelid AND a.attnum = o.conkey[1]\ LIMIT 1) \
      FROM pg_constraint o \
      LEFT JOIN pg_class c ON c.oid = o.conrelid \
      LEFT JOIN pg_class f ON f.oid = o.confrelid \
      LEFT JOIN pg_class m ON m.oid = o.conrelid \
      WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = \'' + tableName + '\' LIMIT 1)';
    },
    isForeignKey : record => {
      return _.isObject(record) && _.has(record, 'contype') && record.contype === 'f';
    },
    isUnique : record => {
      return _.isObject(record) && _.has(record, 'contype') && record.contype === 'u';
    },
    isPrimaryKey : record => {
      return _.isObject(record) && _.has(record, 'contype') && record.contype === 'p';
    },
    isSerialKey : record => {
      return _.isObject(record) && Dialects.postgres.isPrimaryKey(record) && (_.has(record, 'extra') && _.startsWith(record.extra, 'nextval')
          && _.includes(record.extra, '_seq') && _.includes(record.extra, '::regclass'));
    },
    showTablesQuery : schema => {
      return "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + schema + "' AND table_type LIKE '%TABLE' AND table_name != 'spatial_ref_sys';";
    }
  };

  public static oracle = {
    showTablesQuery : schema => {
      // return "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + schema + "' AND table_type LIKE '%TABLE' AND table_name != 'spatial_ref_sys';";
      if (schema) {
        return 'SELECT owner as table_schema, table_name, 0 as lvl FROM all_tables where OWNER IN(SELECT USERNAME AS "schema_name" FROM ALL_USERS WHERE ORACLE_MAINTAINED = \'N\') AND OWNER = \'' + schema + '\' AND table_name != \'SEQUELIZEMETA\'';
      } else {
        return 'SELECT owner as table_schema, table_name, 0 as lvl FROM all_tables where OWNER IN(SELECT USERNAME AS "schema_name" FROM ALL_USERS WHERE ORACLE_MAINTAINED = \'N\') ' +
        'AND OWNER = (SELECT SYS_CONTEXT (\'USERENV\', \'SESSION_USER\') FROM DUAL) AND table_name != \'SEQUELIZEMETA\'';
      }
    },
    isSerialKey : record => {
      return false;
    },
    getIdentityKeys : async (tableName, sequelizeInstance) => {
      const showTablesSql = `select TABLE_NAME,COLUMN_NAME, COLUMN_NAME,GENERATION_TYPE,IDENTITY_OPTIONS from USER_TAB_IDENTITY_COLS WHERE TABLE_NAME='${tableName.toUpperCase()}'`;
      const res = await sequelizeInstance.query(showTablesSql, {
        raw: true
      });
      return res;
    }
    /*getForeignKeysQuery : (tableName, schemaName) => {
      return "SELECT \
      CONS.CONSTRAINT_NAME AS constraint_name, \
      CONS.TABLE_NAME AS source_table, \
      COLS.COLUMN_NAME AS source_column, \
      CONS_R.TABLE_NAME R_TABLE_NAME AS target_table, \
      COLS_R.COLUMN_NAME R_COLUMN_NAME AS target_column \
      CASE WHEN CONS.CONSTRAINT_TYPE  LIKE '%P%' THEN 'PRIMARY KEY' ELSE 'FOREIGN KEY' END AS constraint_type\
  FROM USER_CONSTRAINTS CONS \
      LEFT JOIN USER_CONS_COLUMNS COLS ON COLS.CONSTRAINT_NAME = CONS.CONSTRAINT_NAME \
      LEFT JOIN USER_CONSTRAINTS CONS_R ON CONS_R.CONSTRAINT_NAME = CONS.R_CONSTRAINT_NAME \
      LEFT JOIN USER_CONS_COLUMNS COLS_R ON COLS_R.CONSTRAINT_NAME = CONS.R_CONSTRAINT_NAME \
  WHERE CONS.CONSTRAINT_TYPE IN ('R','P') \
  ORDER BY CONS.TABLE_NAME, COLS.COLUMN_NAME";
    }*/
  };

  public static mssql = {
    getForeignKeysQuery : (tableName, schemaName) => {
      return "SELECT \
        ccu.table_name AS source_table, \
        ccu.constraint_name AS constraint_name, \
        ccu.column_name AS source_column, \
        kcu.table_name AS target_table, \
        kcu.column_name AS target_column, \
        tc.constraint_type AS constraint_type, \
        c.is_identity AS is_identity \
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc \
      INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu \
        ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME \
      LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc \
        ON ccu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME \
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu \
        ON kcu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY' \
      INNER JOIN sys.COLUMNS c \
        ON c.name = ccu.column_name \
        AND c.object_id = OBJECT_ID(ccu.table_name) \
      WHERE ccu.table_name = " + sequelize.Utils.addTicks(tableName, "'");
    },
    isForeignKey : record => {
      return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'FOREIGN KEY';
    },
    isPrimaryKey : record => {
      return _.isObject(record) && _.has(record, 'constraint_type') && record.constraint_type === 'PRIMARY KEY';
    },
    isSerialKey : record => {
      return _.isObject(record) && Dialects.mssql.isPrimaryKey(record) && (_.has(record, 'is_identity') && record.is_identity);
    }
  };
}

  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
/*require('sequelize/lib/dialects/sqlite/query-generator').getForeignKeysQuery = (tableName, schemaName) => {
  return 'PRAGMA foreign_key_list(' + tableName + ');';
},*/

/**
 * Override pour avoir les longueurs
 */
require('sequelize/lib/dialects/oracle/query-generator').describeTableQuery = (tableName, schema) => {
  //name, type, datalength (except number / nvarchar), datalength varchar, datalength number, nullable, default value, primary ?
  //TODO quand passage à oracledb V2 -> ajouter DATA_DEFAULT pour avoir la valeur par défaut
  return ['SELECT atc.COLUMN_NAME, atc.DATA_TYPE, atc.DATA_LENGTH, atc.CHAR_LENGTH, atc.DEFAULT_LENGTH, atc.DATA_PRECISION, atc.DATA_SCALE, atc.NULLABLE, ',
  'CASE WHEN ucc.CONSTRAINT_NAME  LIKE\'%PK%\' THEN \'PRIMARY\' ELSE \'\' END AS "PRIMARY" ',
  'FROM all_tab_columns atc ',
  'LEFT OUTER JOIN all_cons_columns ucc ON(atc.table_name = ucc.table_name AND atc.COLUMN_NAME = ucc.COLUMN_NAME ) ',
  schema ? `WHERE (atc.OWNER=UPPER('${schema}') OR atc.OWNER='${schema}') ` : 'WHERE atc.OWNER=(SELECT USER FROM DUAL) ',
  `AND (atc.TABLE_NAME=UPPER('${tableName}') OR atc.TABLE_NAME='${tableName}')`,
  'ORDER BY "PRIMARY", atc.COLUMN_NAME'].join('');
};

/**
 * Override pour gérer les longueurs
 */
require('sequelize/lib/dialects/oracle/query').prototype.handleDescribeQuery = (data, options) => {
  const result = {};
  let modelAttributes = [];
  if ('describeModelAttributes' in options) {
    //If we have the model attributes inside the options, we can use it to map the column names
    modelAttributes = Object.keys(options.describeModelAttributes);
  }
  data.rows.forEach(_result => {
    if (_result.Default) {
      _result.Default = _result.Default.replace("('", '').replace("')", '').replace(/'/g, '');
    }

    if (!(_result.COLUMN_NAME.toLowerCase() in result)) {
      let key = _result.COLUMN_NAME.toLowerCase();

      if (modelAttributes.length > 0) {
        for (let i = 0; i < modelAttributes.length; i++) {
          if (modelAttributes[i].toLowerCase() === key) {
            key = modelAttributes[i];
            i = modelAttributes.length;
          }
        }
      }
      let dataLength = 0;
      let dataScale = 0;

      if (_result.DATA_TYPE.toUpperCase() === 'NUMBER') {
        dataLength = _result.DATA_PRECISION;
        dataScale = _result.DATA_SCALE;
      } else if (_result.DATA_TYPE.toUpperCase().indexOf('VARCHAR') > -1) {
        dataLength = _result.CHAR_LENGTH;
      } else {
        dataLength = _result.DATA_LENGTH;
      }

      result[key] = {
        type: _result.DATA_TYPE.toUpperCase(),
        allowNull: (_result.NULLABLE === 'N' ? false : true),
        defaultValue: undefined,
        dataLength,
        dataScale,
        primaryKey: _result.PRIMARY === 'PRIMARY'
      };
    }
  });
  return result;
};
