'use strict';

module.exports = function (sequelize, DataTypes) {
  let Karma = sequelize.define('Karma', {
    score: DataTypes.INTEGER
  }, {
    tableName: 'karma',
    charset: 'utf8'
  });

  Karma.belongsTo(sequelize.model('Map'));
  Karma.belongsTo(sequelize.model('Player'));

  return Karma;
};