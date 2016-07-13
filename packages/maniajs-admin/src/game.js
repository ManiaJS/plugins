/**
 * ADMIN COMMANDS - GAME ITSELF
 */
'use strict';


/**
 * Game Commands.
 *
 * @class
 */
module.exports.default = class {
  constructor (plugin) {
    this.plugin = plugin;
  }

  /**
   * Register all the player commands.
   *
   * @param {object}   manager
   * @param {function} manager.on
   */
  register (manager) {

    /**
     * /admin players
     * Full player list, of the well known players (from database).
     */
    manager.on('setmode', {
      admin: true,
      level: 3,
      text: 'Set GameMode, rounds/ta/team/laps/cup/stunts'
    }, (player, params) => this._setMode(player, params));
  }


  /**
   * /admin setmode
   *
   * @param player
   * @param params
   * @private
   */
  _setMode (player, params) {
    let mapping = {
      rounds: 1,
      ta: 2,
      team: 3,
      laps: 4,
      cup: 5,
      stunts: 6
    };

    if (params.length === 0 || ! mapping.hasOwnProperty(params[0])) {
      return this.plugin.server.send().chat('$F66Syntax Error:$z $fff$n/admin setmode [rounds/ta/team/laps/cup/stunts]$z', {destination: player.login}).exec();
    }

    return Promise.all([
      this.plugin.server.send()
        .custom('SetGameMode', [mapping[params[0]]]).exec(),
      this.plugin.server.send()
        .chat(`$5A0Next game mode will be ${params[0]} and will be active from next map!`).exec()
    ]);
  }
};
