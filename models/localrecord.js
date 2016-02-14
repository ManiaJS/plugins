'use strict';

export default function (sequelize, DataTypes) {
  let LocalRecord = sequelize.define('LocalRecord', {
    mapId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: DataTypes.INTEGER,
    checkpoints: DataTypes.STRING
  }, {
    tableName: 'localrecord',
    charset: 'utf8'
  });

  LocalRecord.hasOne(sequelize.model('Map'));
  LocalRecord.hasOne(sequelize.model('Player'));

  return LocalRecord;
}