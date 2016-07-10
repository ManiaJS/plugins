/**
 * Dedimania Widget
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */

import Plugin from '../plugin';

/**
 * Widget Logic.
 *
 * @class Widget
 * @type {Widget}
 *
 * @property {App} app
 * @property {Plugin} plugin
 * @property {Flow} flow
 */
export class Widget {

  private plugin: Plugin;

  constructor (plugin) {
    this.plugin = plugin;
  }

  public async init() {
    
  }
}
