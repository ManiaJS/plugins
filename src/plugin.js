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

    // /help
    this.server.command.on('help', {
      level: 0,
      hide: false,
      text: 'Help command, shows all commands currently possible. Also see `/admin help` and `/commands`'
    }, (player, params) => {
      this.help(player, params, false);
    });

    // /admin help
    this.server.command.on('help', {
      level: 0,
      admin: true,
      hide: false,
      text: 'Admin help command, shows all commands currently possible. Also see `/help` and `/admin commands`'
    }, (player, params) => {
      this.help(player, params, true);
    });

    // /commands
    this.server.command.on('commands', {
      level: 0,
      hide: false,
      text: 'Open list with commands. Visual navigate through the list. Also see `/admin commands`!'
    }, (player, params) => {
      this.commandsList(player.login, false);
    });

    // /admin commands
    this.server.command.on('commands', {
      level: 0,
      admin: true,
      hide: false,
      text: 'Open list with admin commands. Visual navigate through the list. Also see `/commands`!'
    }, (player, params) => {
      this.commandsList(player.login, true);
    });

    return Promise.resolve();
  }

  /**
   * Help Command Fired.
   *
   * @param {{}} player
   * @param {{}} params
   * @param {boolean} adminCommands
   *
   * @returns {*}
   */
  help (player, params, adminCommands) {
    let details = this.players.list[player.login] || false;
    if (! details || ! details.info) return;

    var message = '$zCommands available: (/admin ...) $fff';
    let commands = Object.keys(this.server.command.commands);

    if (params.length > 0) {
      // Command help
      var key = params[0];

      if (adminCommands) {
        key = 'admin__' + key;
      }

      // Check if the command exists
      if (this.server.command.commands.hasOwnProperty(key)) {
        let command = this.server.command.commands[key];
        if (details.level >= command.level && !command.hide) {
          // Display help text
          return this.server.send().chat('$zHelp for \'' + key.replace('__', ' ') + '\': $fff' + command.text, {destination: player.login}).exec();
        }
      }
      return this.server.send().chat('Error, command help not found!', {destination: player.login}).exec();
    }

    // General command list
    commands.forEach((command) => {
      if (! this.server.command.commands.hasOwnProperty(command)) return;
      let options = this.server.command.commands[command];

      if (details.level >= options.level && ! options.hide && options.admin === adminCommands) {
        // Display in the message.
        message += command.substr(7) + ', ';
      }
    });

    return this.server.send().chat(message, {destination: player.login}).exec()
      .then(()=>this.server.send().chat('$zYou can also lookup specific command help by typing \'$fff/help [command]$g\'', {destination: player.login}).exec());
  }


  /**
   * Show List with commands and help text.
   *
   * @param {string} login
   * @param {boolean} adminCommands
   */
  commandsList(login, adminCommands) {
    let details = this.players.list[login] || false;
    if (! details || ! details.info) return;

    let cols = [
      {
        name: 'Command',
        field: 'name',
        width: 50
      },
      {
        name: 'Help Text',
        field: 'text',
        width: 140
      },
      {
        name: 'Level',
        field: 'level',
        width: 15,
        level: 1
      }
    ];
    var data = [];

    let commands = Object.keys(this.server.command.commands);

    commands.forEach((command) => {
      if (! this.server.command.commands.hasOwnProperty(command)) return;
      let options = this.server.command.commands[command];

      if (details.level >= options.level && options.admin === adminCommands && ! options.hide) {
        data.push({
          name:  '/' + options.command.replace('__', ' '),
          text:  options.text || '',
          level: options.level
        });
      }
    });

    let list = this.app.ui.list('Commands List', login, cols, data);
    list.display();

  }
};
