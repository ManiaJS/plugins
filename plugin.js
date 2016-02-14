'use strict';

import * as Package from './package.json';
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
      this.app.server.on('player.connect', this.playerConnect);
      this.app.server.on('player.disconnect', this.playerDisconnect);

      resolve();
    });
  }


  playerConnect(player) {
    let detail = this.app.players.list[player.login] || false;

    if (detail) {
      this.app.server.send().chat('Welcome ' + detail.nickname + '$z to the server!').exec();
    }
  }

  playerDisconnect(player) {
    let detail = this.app.players.list[player.login] || false;

    console.log(detail);
    if (detail) {
      this.app.server.send().chat('Player ' + detail.nickname + '$z disconnected!').exec();
    }
  }
}
