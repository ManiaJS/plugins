/**
 * ADMIN COMMANDS - MAP
 */
'use strict';


/**
 * Map Commands.
 *
 * @class
 */
module.exports.default = class {
  constructor (plugin) {
    this.plugin = plugin;
  }

  /**
   * Register all the commands.
   *
   * @param {object}   manager
   * @param {function} manager.on
   */
  register (manager) {
    this.server = this.plugin.server;

    /**
     * /admin skip
     * Skips current map.
     */
    manager.on('skip', {
      admin: true,
      level: 1,
      text: 'Skip current map, and directly go to the next one.'
    }, (player, params) => this._skip(player, params));

    /**
     * /admin restart
     * Restart current map.
     */
    manager.on('restart', {
      admin: true,
      level: 1,
      text: 'Restart current map.'
    }, (player, params) => this._restart(player, params));

    /**
     * /admin replay
     * Rejuke current map.
     */
    manager.on('replay', {
      admin: true,
      level: 1,
      text: 'Replay current map, add to the jukebox.'
    }, (player, params) => this._replay(player, params));

    /**
     * /admin endround
     * End Round.
     */
    manager.on('endround', {
      admin: true,
      level: 2,
      text: 'End current round.'
    }, (player, params) => this._endround(player, params));

    /**
     * /admin savemaps
     * Save matchsettings list to disk!
     */
    manager.on('savemaps', {
      admin: true,
      level: 2,
      text: 'Save maplist to matchsettings configuration.'
    }, (player, params) => this._savemaplist(player, params));
  }

  _skip (player, params) {
    this.server.send().chat("$fffSkipping map...").exec();
    this.server.send().custom('NextMap').exec();
  }

  _restart (player, params) {
    this.server.send().chat("$fffRestarting map...").exec();
    this.server.send().custom('RestartMap').exec();
  }

  _endround (player, params) {
    this.server.send().chat('$fffEnd round...').exec();
    this.server.send().custom('ForceEndRound').exec();
  }

  _replay (player, params) {
    // TODO: Add support for maniajs-jukebox
    if (this.plugin.maps.current.uid) {
      this.server.send().custom('SetNextMapIdent', [this.plugin.maps.current.uid]).exec();
      this.server.send().chat('$fffCurrent map will be replayed!').exec();
    }
  }

  _savemaplist (player, params) {
    // TODO.
  }
};
