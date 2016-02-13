'use strict';

import { EventEmitter } from 'events';

/**
 * Plugin Interface
 * @class
 */
export default class {

  /**
   * Construct the plugin.
   * @param {object} plugin
   */
  constructor(plugin) {
    // Process the plugin information. (Verify should be done by the core).
    this.plugin = plugin;

    // App will be replaced with the app context of the core.
    this.app = null;

    // Make our own plugin main interface an event emitter.
    // This can be used to communicate and subscribe to others plugins events.
    EventEmitter.call(this);
  }
}
