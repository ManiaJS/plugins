'use strict';

// Make our own plugin main interface an event emitter.
// This can be used to communicate and subscribe to others plugins events.
var EventEmitter = require('events').EventEmitter;

/**
 * Plugin Interface
 * @class Plugin
 * @type {Plugin}
 *
 * @property {App} app App Context.
 * @property {Logger|{}} log Plugin Logging Instance (bunyan).
 * @property {[]} plugins
 * @property {ServerClient} server
 * @property {Players} players
 * @property {Maps} maps
 * @property {{}} models
 * @property {{}} config
 * @property {{}} settings
 * @property {UIFacade} ui
 *
 * @property {{modes: number[], game: string[]}} game
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

    /**
     * Game Requirements.
     * @type {{modes: number[], game: string[]}}
     */
    this.game = {
      modes: [],
      games: ['trackmania', 'shootmania']
    }
  }

  /**
   * Inject Core App interface into the plugin.
   *
   * @param {{}} props Injectable properties.
   */
  inject(props) {
    this.app = props.app;
    this.config = props.config;
    this.log = props.log;

    this.server = props.app.server;

    // Expand app into separate parts.
    this.players = props.app.players;
    this.maps = props.app.maps;
    this.plugins = props.app.plugins;
    this.ui = props.app.ui;
    this.models = props.app.models[this.name] || {};

    this.settings = props.settingStore || null;
  }
};

/**
 * Export alias of BasePlugin class.
 * @type {Plugin}
 * @class Plugin
 */
module.exports.BasePlugin = module.exports.default;
