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
    // TODO: Should include '@maniajs/plugin-localrecords' as dependency, but this causes a fatal error.
    this.dependencies = [/*'@maniajs/plugin-localrecords'*/];
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

    return Promise.resolve();
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
    this.app.plugins['@maniajs/plugin-localrecords'].getPersonalMapRecord(this.maps.list[this.maps.current.uid], player).then((personalRecord) => {
      let checkpoints = personalRecord.checkpoints.split(',');
      let currentCheckpoint = checkpoint.timeOrScore;
      let recordCheckpoint = checkpoints[checkpoint.checkpoint];
      let difference = (currentCheckpoint - recordCheckpoint);
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
      this.cpWidget.player(player.login, {difference: text}).update();
    });
  }
};
