

export interface IOptionalParams {

  /**
   * Function that returns the list of available keys in the class
   */
  getOptionalsCodes : () => string[];

  /**
   * Function that permits the modification of the tableName for model definition
   */
  sequelizeDefineTableName : (tableName) => string;

  treatReferences : (foreignKey) => string;
}
