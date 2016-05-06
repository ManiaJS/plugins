'use strict';

var Package = require('./../package.json');

var Plugin  = require('@maniajs/plugin').default;

let Maplist = require('./maplist').default;
let Jukebox = require('./jukebox').default;

/**
 * Jukebox Plugin.
 */
module.exports.default = class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];

    // Game Requirements
    this.game.games = ['trackmania']; // Only for trackmania
    this.game.modes = [1, 2, 3, 4, 5]; // rounds,timeattack,team,laps,cup
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Init subclasses
      this.maplist = new Maplist(this);
      this.jukebox = new Jukebox(this);

      // List command.
      this.server.command.on('list', 0, (playerObject, params) => {
        let player = this.players.list[playerObject.login];
        this.maplist.display(player, params);
      });

      resolve();
    });
  }
};
