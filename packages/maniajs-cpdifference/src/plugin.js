'use strict';

var Package     = require('./../package.json');
var path    = require('path');

var async   = require('async');

var Plugin      = require('@maniajs/plugin').default;

/**
 * LocalRecords Plugin.
 */
module.exports.default = class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;
    this.records = null;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = ['@maniajs/plugin-localrecords'];
    this.players = [];
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    this.cpWidget = this.app.ui.build(this, 'cpwidget', 1);
    this.cpWidget.global({
      manialinkid: 'CPDifference',
      widget_x: -3.65,
      widget_y: 21
    });

    this.server.on('trackmania.player.checkpoint',
      (params) => this.playerCheckpoint(params));

    this.server.on('player.connect', (params) => {
      let player = this.players.list[params.login];
      this.loadPlayerSetting(player);
    });

    this.server.on('player.disconnect', (params) => {
      delete this.players[params.login];
    });

    Object.keys(this.players.list).forEach((login) => {
      let player = this.players.list[login];
      this.loadPlayerSetting(player);
    });

    this.server.command.on('cpdifference', 'Change your CP Difference setting', (player, params) => this.setPlayerSettingCommand(player, params));
    this.server.command.on('cps', 'Change your CP Difference setting', (player, params) => this.setPlayerSettingCommand(player, params));

    return Promise.resolve();
  }

  /**
   * Loads CP Difference setting for player into the local playerlist.
   *
   * @param player
   */
  loadPlayerSetting(player) {
    this.settings.get('cpDifference', player.id).then((setting) => {
      if(! setting) {
        this.setPlayerSetting(player, 'own');
      } else {
        this.players[player.login] = setting.value;
      }
    });
  }

  /**
   * Saves CP Difference setting for player.
   *
   * @param player
   * @param setting
   */
  setPlayerSetting(player, setting) {
    this.players[player.login] = setting;
    this.settings.set('cpDifference', player.id, setting);
  }

  /**
   * Allows player to update their CP Difference setting.
   *
   * @param player
   * @param params
   */
  setPlayerSettingCommand(player, params) {
    switch(params[0]) {
      case 'own':
        this.setPlayerSetting(player, 'own');
        this.server.send().chat('$fffSet CP Difference to use own record (or last local in case of no record).', {destination: player.login}).exec();
        break;
      case 'local':
        this.setPlayerSetting(player, 'local');
        this.server.send().chat('$fffSet CP Difference to use first local record.', {destination: player.login}).exec();
        break;
      case 'dedi':
        this.setPlayerSetting(player, 'dedi');
        this.server.send().chat('$fffSet CP Difference to use first dedimania record.', {destination: player.login}).exec();
        break;
      case 'help':
      default:
        let ownBold = '';
        let localBold = '';
        let dediBold = '';

        switch(this.players[player.login]) {
          case 'own':
            ownBold = '$o';
            break;
          case 'local':
            localBold = '$o';
            break;
          case 'dedi':
            dediBold = '$o';
            break;
        }
        this.server.send().chat('$fffUsage: /cpdifference (or /cps) [$eee' + ownBold + 'own (or last)' + ownBold + ', ' + localBold + 'local' + localBold + ', ' + dediBold + 'dedi' + dediBold + '$fff]', {destination: player.login}).exec();
        break;
    }
  }

  /**
   * Function registers when a player passes a checkpoint and saves this in the current runs.
   * playerId: 0,
   * login: 1,
   * timeOrScore: 2,
   * curLap: 3,
   * checkpoint: 4
   *
   * @param checkpoint
   */
  playerCheckpoint(checkpoint) {
    let player = this.players.list[checkpoint.login];
    if(this.players[player.login] == 'own') {
      this.app.plugins['@maniajs/plugin-localrecords'].getPersonalMapRecord(this.maps.list[this.maps.current.uid], player).then((personalRecord) => {
        if(personalRecord.rank != null) {
          let checkpoints = personalRecord.checkpoints.split(',');
          let currentCheckpoint = checkpoint.timeOrScore;
          let recordCheckpoint = checkpoints[checkpoint.checkpoint];

          this.displayUI(player, 'personal', currentCheckpoint, recordCheckpoint);
        } else {
          this.playerCheckpointLastRecord(player, checkpoint);
        }
      }).catch(() => {
        this.playerCheckpointLastRecord(player, checkpoint);
      });
    } else if(this.players[player.login] == 'local') {
      this.app.plugins['@maniajs/plugin-localrecords'].getMapRecord(this.maps.list[this.maps.current.uid]).then((localRecord) => {
        let checkpoints = localRecord.checkpoints.split(',');
        let currentCheckpoint = checkpoint.timeOrScore;
        let recordCheckpoint = checkpoints[checkpoint.checkpoint];

        this.displayUI(player, 'local', currentCheckpoint, recordCheckpoint);
      });
    }
  }

  /**
   * Function requests last record to be displayed.
   *
   * @param player
   * @param checkpoint
   */
  playerCheckpointLastRecord(player, checkpoint) {
    this.app.plugins['@maniajs/plugin-localrecords'].getLastMapRecord(this.maps.list[this.maps.current.uid]).then((lastRecord) => {
      let checkpoints = lastRecord.checkpoints.split(',');
      let currentCheckpoint = checkpoint.timeOrScore;
      let recordCheckpoint = checkpoints[checkpoint.checkpoint];

      this.displayUI(player, 'last', currentCheckpoint, recordCheckpoint);
    });
  }

  /**
   * Display UI to the player.
   *
   * @param player
   * @param recordType
   * @param current
   * @param comparison
   */
  displayUI(player, recordType, current, comparison) {
    let difference = (current - comparison);
    let improve = false;

    let text = '';
    if(difference < 0) {
      improve = true;
      difference *= -1;

      text += '$00C-';
    } else {
      text += '$C00+';
    }

    text += this.app.util.times.stringTime(difference);

    this.cpWidget.timeout = 2000;
    this.cpWidget.player(player.login, {difference: text, recordType: recordType}).update();
  }
};
