/**
 * Holds Connection and does stuff with the Dedimania API.
 *
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */

import * as xmlrpc from '@maniajs/xmlrpc';
import {EventEmitter} from 'events';

import * as util from 'util';
import * as os from 'os';
import * as Package from 'pjson';

import Plugin from '../plugin';

/**
 * Dedimania Logic.
 *
 */
export class DedimaniaClient extends EventEmitter {

  private plugin: Plugin;

  constructor (options) {
    super();

    this.plugin = options.plugin;
  }


  public async init() {
    console.log('INIT DEDICLIENT');
    console.log('INIT DEDICLIENT');
    console.log('INIT DEDICLIENT');
    return;
  }
}

