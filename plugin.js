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
    // Make our own plugin main interface an event emitter.
    // This can be used to communicate and subscribe to others plugins events.
    EventEmitter.call(this);
  }
}
