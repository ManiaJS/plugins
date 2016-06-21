'use strict';

var Package = require('./../package.json');

var Plugin  = require('@maniajs/plugin').default;

let Maplist = require('./maplist').default;
let Jukebox = require('./jukebox').default;

/**
 * Jukebox and maplist Plugin.
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
    this.game.games = ['trackmania', 'shootmania'];
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

      // List command.
      this.server.command.on('jukebox', 0, (playerObject, params) => {
        if (! params.length) {
          return this.server.send().chat('$fffUsage: /jukebox [$eeelist, clear$fff]', {destination: playerObject.login}).exec();
        }

        let player = this.players.list[playerObject.login];
        switch (params.shift()) {
          case 'list':
            this.jukebox.list(player, params);
            break;
          case 'clear':
            if (playerObject.level > 2) {
              this.jukebox.clear();
              this.server.send().chat(`$c70$<$fff${playerObject.nickname}$>$c70 cleared the jukebox!`).exec();
            } else {
              this.server.send().chat('$fffYou don\'t have the right permission to use this command!', {destination: playerObject.login}).exec();
            }
            break;
          default:
            return this.server.send().chat('$fffUsage: /jukebox [$eeelist, clear$fff]', {destination: playerObject.login}).exec();
        }
      });

      this.server.on('match.end', (params) => {
        this.jukebox.endmap(params);
      });

      resolve();
    });
  }
};
