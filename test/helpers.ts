const Sequelize = require('sequelize');
const path = require('path');
const config = require(path.join(__dirname, 'config'));
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

// tslint:disable:object-literal-shorthand
module.exports = {
  Sequelize,

  initTests: function(options) {
    const sequelize = this.createSequelizeInstance(options);

    this.clearDatabase(sequelize, function() {
      if (options.context) {
        options.context.sequelize = sequelize;
      }

      if (options.beforeComplete) {
        options.beforeComplete(sequelize);
      }

      if (options.onComplete) {
        options.onComplete(sequelize);
      }
    });
  },

  createSequelizeInstance: function(options) {
    options = options || {};

    options.dialect = options.dialect || 'mysql';
    options.logging = (options.hasOwnProperty('logging') ? options.logging : false);

    const sequelizeOptions = {
      logging: options.logging,
      dialect: options.dialect,
      host:    config[options.dialect].host,
      port:    config[options.dialect].port
    };

    if (config[options.dialect] && config[options.dialect].storage) {
      sequelizeOptions['storage'] = config[options.dialect].storage;
    }

    if (process.env.DIALECT === 'postgres-native') {
      sequelizeOptions['native'] = true;
    }

    return new Sequelize(
      config[options.dialect].database,
      config[options.dialect].username,
      config[options.dialect].password,
      sequelizeOptions
    );
  },

  clearDatabase: function(sequelize, callback) {

    const success = () => {
      fs.readdir(config.directory, (err, files) => {
        if (err || ! files || files.length < 1) {
          return callback && callback();
        }

        files.forEach(file => {
          const stat = fs.statSync(config.directory + '/' + file);
          if (stat.isFile()) {
            fs.unlinkSync(config.directory + '/' + file);
          }
        });
        // tslint:disable-next-line:no-unused-expression
        callback && callback();
      });
    };

    sequelize.getQueryInterface().dropAllTables().then(success, error);

    function error(err) {
      throw err;
    }
  },

  getSupportedDialects: function() {
    return fs.readdirSync(path.join(__dirname, '../..', 'node_modules', 'sequelize', 'lib', 'dialects')).filter(function(file) {
      return ((file.indexOf('.js') === -1) && (file.indexOf('abstract') === -1));
    });
  },

  getTestDialect: function() {
    let envDialect = process.env.DIALECT || 'mysql';

    if (envDialect === 'postgres-native') {
      envDialect = 'postgres';
    }

    if (this.getSupportedDialects().indexOf(envDialect) === -1) {
      throw new Error('The dialect you have passed is unknown. Did you really mean: ' + envDialect);
    }

    return envDialect;
  },

  getTestDialectTeaser: function(moduleName) {
    let dialect = this.getTestDialect();

    if (process.env.DIALECT === 'postgres-native') {
      dialect = 'postgres-native';
    }

    return '[' + dialect.toUpperCase() + '] ' + moduleName;
  },

  checkMatchForDialects: function(dialect, value, expectations) {
    if (expectations.hasOwnProperty(dialect)) {
      expect(value).toMatch(expectations[dialect]);
    } else {
      throw new Error('Undefined expectation for "' + dialect + '"!');
    }
  }
};
