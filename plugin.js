'use strict';

import { EventEmitter } from 'events';

/**
 * Plugin Interface
 * @class Plugin
 */
export default class {

  /**
   * Construct the plugin.
   */
  constructor() {
    // Will be replaced by core
    this.app = null;
    this.plugins = null;
    this.server = null;
    this.players = null;
    this.maps = null;

    // Make our own plugin main interface an event emitter.
    // This can be used to communicate and subscribe to others plugins events.
    EventEmitter.call(this);
  }
}
