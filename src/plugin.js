'use strict';

var Package     = require('./../package.json');

var Plugin      = require('maniajs-plugin').default;

/**
 * Help Plugin.
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
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {

    // Commands
    this.server.command.on('help', {
      level: 0,
      hide: false,
      text: 'Open the help window, shows all commands currently possible.'
    }, (player, params) => {
      this.help(player, params);
    });

    return Promise.resolve();
  }

  /**
   * Help Command Fired.
   *
   * @param {{}} player
   * @param {{}} params
   *
   * @returns {*}
   */
  help (player, params) {
    let details = this.players.list[player.login] || false;
    if (! details || ! details.info) return;

    var message = '$zCommands available: $fff';
    let commands = Object.keys(this.server.command.commands);

    if (params.length > 0) {
      // Command help
      let key = params[0];

      // Check if the command exists
      if (this.server.command.commands.hasOwnProperty(key)) {
        let command = this.server.command.commands[key];
        if (details.level >= command.level && !command.hide) {
          // Display help text
          return this.server.send().chat('$zHelp for \'' + key + '\': $fff' + command.text, {destination: player.login}).exec();
        }
      }
      return this.server.send().chat('Error, command help not found!', {destination: player.login}).exec();
    }

    // General command list
    commands.forEach((command) => {
      if (! this.server.command.commands.hasOwnProperty(command)) return;
      let options = this.server.command.commands[command];

      if (details.level >= options.level && ! options.hide && ! options.admin) {
        // Display in the message.
        message += command + ', ';
      }
    });

    return this.server.send().chat(message, {destination: player.login}).exec()
      .then(()=>this.server.send().chat('$zYou can also lookup specific command help by typing \'$fff/help [command]$g\'', {destination: player.login}).exec());
  }
};
