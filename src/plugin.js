'use strict';

var Package = require('./../package.json');

var Plugin  = require('maniajs-plugin').default;

var PlayerCommands = require('./player').default;

/**
 * ManiaJS Admin Plugin.
 *
 * @property {object} serverInfo
 * @property {number} serverInfo.ServerMaxRank
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
    this.game.games = [];
    this.game.modes = [];

    // Plugin Specific Variables
    this.components = [
      new PlayerCommands(this)
    ];
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Register Commands..
      this.registerCommands();

      return resolve();
    });
  }

  registerCommands () {
    // Internal.
    this.server.command.on('setadmin', {admin: true, level: 3}, (player, params) => {
      this.handleSetAdmin(player, params);
    });

    // Components, register the commands.
    this.components.forEach((component) => {
      component.register(this.server.command); // Register commands.
    });
  }


  /**
   * Set Admin Rights. /admin setadmin [login] [type]
   *
   * @param player
   * @param params
   * @returns {Array|{index: number, input: string}|*}
   */
  handleSetAdmin (player, params) {
    if (params.length !== 2 || (params[1] !== 'admin' && params[1] !== 'master' && params[1] !== 'operator')) {
      return this.server.send().chat('$F66Syntax Error:$z $fff$n/admin setadmin [login] [type]$z Type: admin, master, operator or player (reset), Login must be a login of a player!', {destination: player.login}).exec();
    }
    let type = params[1];
    let login = params[0];

    if (login === player.login) {
      return this.server.send().chat('$F66Can\'t apply this command to yourself!', {destination: player.login}).exec();
    }

    // Fetch Player from database (destionation player).
    this.app.models['Player'].findOne({where: { login: login }}).then((destinationPlayer) => {
      if (! destinationPlayer) {
        return this.server.send().chat('$F66Player with login \'' + login + '\' is not found, make sure the player is known on the server.', {destination: player.login}).exec();
      }

      var level = 0;
      switch(type) {
        case 'player'  : level = 0; break;
        case 'operator': level = 1; break;
        case 'admin'   : level = 2; break;
        case 'master'  : level = 3; break;
      }

      // Set Level
      destinationPlayer.set('level', level).save().then(() => {
        // Send Message to admin
        this.server.send().chat('$5A0Player \'' + destinationPlayer.login +  '\' has been added as \'' + type + '\'!', {destination: player.login}).exec();

        // Update if the destination is in our player list.
        if (this.players.list.hasOwnProperty(destinationPlayer.login)) {
          this.players.list[destinationPlayer.login].level = level;

          // Send public message when online
          this.server.send().chat('$5A0Player \'' + destinationPlayer.login +  '\' has been added as \'' + type + '\'!').exec(); // TODO: Message formatting.
        }
      });
    });
  }

};
