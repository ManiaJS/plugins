'use strict';

// Make our own plugin main interface an event emitter.
// This can be used to communicate and subscribe to others plugins events.
import { EventEmitter } from 'events';

/**
 * Plugin Interface
 * @class Plugin
 */
export default class extends EventEmitter {

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
   */
  inject(app, config) {
    this.app = app;
    this.config = config;

    this.server = app.server;

    // Expand app into separate parts.
    this.players = app.players;
    this.maps = app.maps;
  }
}
