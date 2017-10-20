
const chai = require('chai');
const expect = chai.expect;
const helpers = require('./helpers');
const dialect = helpers.getTestDialect();

// const dialects = require('../lib/dialects');
import * as dialects from '../dialects/dialects';
const _ = require('lodash');

// tslint:disable:no-unused-expression
describe(helpers.getTestDialectTeaser('sequelize-auto dialects'), function() {
  describe('getForeignKeysQuery', () => {

    it('postgres', done => {
      const query = dialects.Dialects.postgres.getForeignKeysQuery('mytable', 'mydatabase');
      expect(query).to.include('WHERE o.conrelid = (SELECT oid FROM pg_class WHERE relname = \'mytable\' LIMIT 1)');
      done();
    });

    it('mssql', done => {
      const query = dialects.Dialects.mssql.getForeignKeysQuery('mytable', 'mydatabase');
      expect(query).to.include('WHERE ccu.table_name = ' + helpers.Sequelize.Utils.addTicks('mytable', "'"));
      done();
    });
  });

  describe('isForeignKey', () => {
    it('mysql', done => {
      expect(dialects.Dialects.mysql.isForeignKey(null)).to.be.false;
      expect(dialects.Dialects.mysql.isForeignKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.mysql.isForeignKey({extra: 'auto_increment'})).to.be.false;
      expect(dialects.Dialects.mysql.isForeignKey({extra: 'foreign_key'})).to.be.true;
      done();
    });

    it('postgres', done => {
      expect(dialects.Dialects.postgres.isForeignKey(null)).to.be.false;
      expect(dialects.Dialects.postgres.isForeignKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.postgres.isForeignKey({contype: 't'})).to.be.false;
      expect(dialects.Dialects.postgres.isForeignKey({contype: 'f'})).to.be.true;
      done();
    });
  });

  describe('isPrimaryKey', () => {
    it('mysql', done => {
      expect(dialects.Dialects.mysql.isPrimaryKey(null)).to.be.false;
      expect(dialects.Dialects.mysql.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.mysql.isPrimaryKey({constraint_name: 'index'})).to.be.false;
      expect(dialects.Dialects.mysql.isPrimaryKey({constraint_name: 'PRIMARY'})).to.be.true;
      done();
    });

    it('sqlite', done => {
      expect(dialects.Dialects.sqlite.isPrimaryKey(null)).to.be.false;
      expect(dialects.Dialects.sqlite.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.sqlite.isPrimaryKey({primaryKey: false})).to.be.false;
      expect(dialects.Dialects.sqlite.isPrimaryKey({primaryKey: true})).to.be.true;
      done();
    });

    it('postgres', done => {
      expect(dialects.Dialects.postgres.isPrimaryKey(null)).to.be.false;
      expect(dialects.Dialects.postgres.isPrimaryKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.postgres.isPrimaryKey({contype: 'f'})).to.be.false;
      expect(dialects.Dialects.postgres.isPrimaryKey({contype: 'p'})).to.be.true;
      done();
    });
  });

  describe('isSerialKey', () => {
    it('mysql', done => {
      expect(dialects.Dialects.mysql.isSerialKey(null)).to.be.false;
      expect(dialects.Dialects.mysql.isSerialKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.mysql.isSerialKey({extra: 'primary'})).to.be.false;
      expect(dialects.Dialects.mysql.isSerialKey({extra: 'auto_increment'})).to.be.true;
      done();
    });

    it('postgres', done => {
      expect(dialects.Dialects.postgres.isSerialKey(null)).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({some: 'value'})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({extra: 'primary'})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({contype: 'i'})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({contype: 'p'})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({contype: 'p', extra: null})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({contype: 'p', extra: 'primary'})).to.be.false;
      expect(dialects.Dialects.postgres.isSerialKey({contype: 'p', extra: 'nextval(table_seq::regclass)'})).to.be.true;
      done();
    });
  });
});
