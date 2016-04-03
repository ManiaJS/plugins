'use strict';

var Package = require('./../package.json');
var path    = require('path');

var async   = require('async');

var Plugin  = require('@maniajs/plugin').default;

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
      this.server.command.on('list', 0, (player, params) => {
        let plyr = this.players.list[player.login];
        this.displayList(plyr);
      });

      resolve();
    });
  }

  /**
   * Displays the map list to the player.
   *
   * @param player
   */
  displayList(player) {
    let cols = [
      {
        name: 'Name',
        field: 'name',
        width: 120,
        level: 0
      },
      {
        name: 'Author',
        field: 'author',
        width: 40,
        level: 0
      }
    ];
    var data = [];
    Object.keys(this.maps.list).forEach((uid) => {
      let map = this.maps.list[uid];
      data.push({
        name: map.name,
        author: map.author
      });
    });

    let list = this.app.ui.list('Maps on the server', player.login, cols, data);
    list.display();
  }
};
