'use strict';

module.exports = function (sequelize, DataTypes) {
  let LocalRecord = sequelize.define('LocalRecord', {
    /*mapId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },*/
    score: DataTypes.INTEGER,
    checkpoints: DataTypes.STRING
  }, {
    tableName: 'localrecord',
    charset: 'utf8'
  });

  LocalRecord.belongsTo(sequelize.model('Map'));
  LocalRecord.belongsTo(sequelize.model('Player'));

  return LocalRecord;
}