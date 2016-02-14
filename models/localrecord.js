'use strict';

export default function (sequelize, DataTypes) {
  let LocalRecord = sequelize.define('LocalRecord', {
    MapId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: sequelize.model('Map'),
        key: 'id'
      }
    },
    PlayerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: sequelize.model('Player'),
        key: 'id'
      }
    },
    Score: DataTypes.INTEGER,
    Checkpoints: DataTypes.STRING
  });

  return LocalRecord;
}