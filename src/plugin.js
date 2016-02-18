'use strict';

import * as Package from './../package.json';
import * as path from 'path';

import Plugin from 'maniajs-plugin';

/**
 * LocalRecords Plugin.
 */
export default class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;
    this.records = null;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Event
      this.server.on('player.connect', (params) => {
        this.playerConnect(params);
      });
      this.server.on('player.disconnect', (params) => {
        this.playerDisconnect(params);
      });


      // Commands
      this.server.command.on('welcome', 1, (player, params) => {
        this.server.send().chat('Welcome command!').exec();
      });

      // UI
      this.sampleUi = this.app.ui.build(this, 'sample');

      resolve();
    });
  }


  playerConnect(player) {
    let detail = this.players.list[player.login] || false;

    if (detail) {
      this.server.send().chat('Welcome ' + detail.nickname + '$z$fff to the server!').exec();
    }

    let data = {
      test: 'Welc' + player.login
    };

    this.sampleUi.player(player.login, data).update();
  }

  playerDisconnect(player) {
    let detail = this.players.list[player.login] || false;

    if (detail) {
      this.server.send().chat('Player ' + detail.nickname + '$z$fff disconnected!').exec();
    }
  }
}
