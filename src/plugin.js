'use strict';

var Package     = require('./../package.json');
var path        = require('path');

var Plugin      = require('maniajs-plugin').default;

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
    this.dependencies = [];
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    // Event
    this.server.on('player.connect', (params) => {
      this.playerConnect(params);
    });
    this.server.on('player.disconnect', (params) => {
      this.playerDisconnect(params);
    });

    // Commands
    this.server.command.on('hi', 'Say hi to the players. You can also do like /hi [login] for saying hi to one specific player', (player, params) => {
      this.sayHi(player, params);
    });


    this.fake = [];
    this.server.command.on('fake', 'connect fake player', (player, params) => {
      for (var i = 0; i < 220; i++) {
        this.server.send().custom('ConnectFakePlayer').exec()
          .then((login) => {
            fake.append(login);
          });
      }
    });
    this.server.command.on('unfake', 'disconnect fake player', (player, params) => {
      this.server.send().custom('DisconnectFakePlayer', ['*']).exec();
    });

    return Promise.resolve();
  }


  playerConnect(player) {
    let detail = this.players.list[player.login] || false;

    if (detail) {
      // Send after a small delay so the connected player could also see.
      setTimeout(() => {
        this.server.send().chat('Welcome ' + detail.nickname + '$z$fff to the server!').exec();
      }, 50);
    }
  }

  playerDisconnect(player) {
    let detail = this.players.list[player.login] || false;

    if (detail) {
      this.server.send().chat('Player ' + detail.nickname + '$z$fff disconnected!').exec();
    }
  }

  sayHi(player, params) {
    let details = this.players.list.hasOwnProperty(player.login) && this.players.list[player.login].info ? this.players.list[player.login] : false;
    if (! details) return;

    if (params.length > 0) {
      // To specific player. Lookup the player.
      let targetLogin = params[0];
      let targetDetails = this.players.list.hasOwnProperty(targetLogin) && this.players.list[targetLogin].info ? this.players.list[targetLogin] : false;
      if (! targetDetails) {
        // Show error, player not found.
        return this.server.send().chat('Error, player not found!', {destination: player.login}).exec();
      }
      return this.server.send().chat('$i$f62Player $>$i$f62' + details.nickname + '$>$z$s$i$f62 says Hi to $>$i$f62' + targetDetails.nickname + '$>$s$z$i$f62').exec();
    }
    return this.server.send().chat('$i$f62Player $>$i$f62' + details.nickname + '$>$z$s$i$f62 says Hi!').exec();
  }
};
