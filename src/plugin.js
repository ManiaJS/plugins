'use strict';

// Make our own plugin main interface an event emitter.
// This can be used to communicate and subscribe to others plugins events.
var EventEmitter = require('events').EventEmitter;

/**
 * Plugin Interface
 * @class Plugin
 *
 * @property {App} app App Context.
 * @property {Logger|{}} log Plugin Logging Instance (bunyan).
 * @property {[]} plugins
 * @property {ServerClient} server
 * @property {Players} players
 * @property {Maps} maps
 * @property {{}} models
 * @property {{}} config
 * @property {UIFacade} ui
 *
 */
module.exports.default = class extends EventEmitter {

  /**
   * Construct the plugin.
   */
  constructor() {
    super();

    // Will be injected by core
    this.app = null;

    this.plugins = null;
    this.server = null;
    this.players = null;
    this.maps = null;


    /**
     * Will hold the defined models for this plugin!
     *
     * @type {{}}
     */
    this.models = {};
  }

  /**
   * Inject Core App interface into the plugin.
   *
   * @param {App} app App context.
   * @param {object} config Plugin config.
   * @param {Logger|{}} log Child Logger.
   */
  inject(app, config, log) {
    this.app = app;
    this.config = config;
    this.log = log;

    this.server = app.server;

    // Expand app into separate parts.
    this.players = app.players;
    this.maps = app.maps;
    this.plugins = app.plugins;
    this.ui = app.ui;
  }
};
