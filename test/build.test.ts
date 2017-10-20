import { AutoSequelize } from '../lib/index';
'use strict';
const exec = require('child_process').exec;
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const helpers = require('./helpers');
const dialect = helpers.getTestDialect();
const testConfig = require('./config');
const _ = require('lodash');
const lib = require('../index');

describe(helpers.getTestDialectTeaser('sequelize-auto build'), function() {
  after(function(done) {
    helpers.clearDatabase(this.sequelize, done);
  });

  before(function(done) {
    const self = this;

    helpers.initTests({
      dialect,
      beforeComplete: sequelize => {
        self.sequelize = sequelize,
        self.User      = self.sequelize.define('User', {
          username:  { type: helpers.Sequelize.STRING },
          touchedAt: { type: helpers.Sequelize.DATE, defaultValue: helpers.Sequelize.NOW },
          aNumber:   { type: helpers.Sequelize.INTEGER },
          bNumber:   { type: helpers.Sequelize.INTEGER },

          validateTest: {
            type: helpers.Sequelize.INTEGER,
            allowNull: true
          },
          validateCustom: {
            type: helpers.Sequelize.STRING,
            allowNull: false
          },

          dateAllowNullTrue: {
            type: helpers.Sequelize.DATE,
            allowNull: true
          },

          defaultValueBoolean: {
            type: helpers.Sequelize.BOOLEAN,
            defaultValue: true
          }
        }),

        self.HistoryLog = self.sequelize.define('HistoryLog', {
          someText:  { type: helpers.Sequelize.STRING },
          aNumber:   { type: helpers.Sequelize.INTEGER },
          aRandomId: { type: helpers.Sequelize.INTEGER }
        }),

        self.ParanoidUser = self.sequelize.define('ParanoidUser', {
          username: { type: helpers.Sequelize.STRING }
        }, {
          paranoid: true
        }),

        self.ParanoidUser.belongsTo(self.User);
      },
      onComplete: () => {
        self.sequelize.sync().then(() => {
          done();
        }, done);
      }
    });
  });

  const setupModels = (self, callback) => {
    const options = _.extend({
      spaces: true,
      indentation: 2,
      logging: false,
      directory: testConfig.directory,
      dialect: helpers.getTestDialect()
    }, testConfig[helpers.getTestDialect()], self.sequelize.config);

    const autoSequelize = new lib.AutoSequelize(self.sequelize.config.database, self.sequelize.config.username, self.sequelize.config.password, options);

    autoSequelize.build(err => {
      callback(err, autoSequelize);
    });
  };

  // tslint:disable:no-unused-expression
  describe('should be able to build', function() {
    it('the models', function(done) {
      const self = this;

      setupModels(self, function(err, autoSequelize) {
        expect(err).to.be.null;
        expect(autoSequelize).to.include.keys(['tables', 'foreignKeys']);
        expect(autoSequelize.tables).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers']);

        if (helpers.getTestDialect() === 'sqlite') {
          expect(autoSequelize.foreignKeys).to.have.keys(['ParanoidUsers']);
          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['UserId']);
        } else {
          expect(autoSequelize.foreignKeys).to.have.keys(['Users', 'HistoryLogs', 'ParanoidUsers']);
          expect(autoSequelize.foreignKeys.Users).to.include.keys('id');
          expect(autoSequelize.foreignKeys.Users.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.Users.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.Users.id.isSerialKey).to.be.true;

          expect(autoSequelize.foreignKeys.HistoryLogs).to.include.keys('id');
          expect(autoSequelize.foreignKeys.HistoryLogs.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.HistoryLogs.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.HistoryLogs.id.isSerialKey).to.be.true;

          expect(autoSequelize.foreignKeys.ParanoidUsers).to.include.keys(['id', 'UserId']);
          expect(autoSequelize.foreignKeys.ParanoidUsers.id).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isPrimaryKey', 'isSerialKey']);
          expect(autoSequelize.foreignKeys.ParanoidUsers.id.isPrimaryKey).to.be.true;
          expect(autoSequelize.foreignKeys.ParanoidUsers.id.isSerialKey).to.be.true;
        }

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId).to.include.keys(['source_schema', 'source_table', 'source_column', 'target_schema', 'target_table', 'target_column', 'isForeignKey']);

        expect(autoSequelize.foreignKeys.ParanoidUsers.UserId.isForeignKey).to.be.true;

        done();
      });
    });
  });
});
