/// <reference path="./../typings/index.d.ts" />
import * as Package from 'pjson';
import * as path from 'path';

import {BasePlugin} from '@maniajs/plugin';
import {DedimaniaClient} from './logic/DedimaniaClient';

/*var Dedimania = require('./logic/dedimania').default;
var Widget    = require('./logic/widget').default;
var Flow      = require('./logic/flow').default;
*/

export default class Plugin extends BasePlugin {

  public dedimania: DedimaniaClient;
  public widget;
  public flow;

  constructor () {
    super();

    // Package info and directory.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];

    // Game Requirements
    this.game.games = ['trackmania']; // Only for trackmania
    this.game.modes = [1, 2, 3, 4, 5]; // rounds,timeattack,team,laps,cup

    // Init logic components
    this.dedimania = new DedimaniaClient({
      host: 'dedimania.net',
      port: 8081,
      path: '/Dedimania',
      debug: true,
      plugin: this
    });
  }

  public async init() {
    // Verify configuration.
    if (! this.config || ! this.config.hasOwnProperty('login') || ! this.config.hasOwnProperty('dedimaniacode')
      || ! this.config.login || ! this.config.dedimaniacode) {
      throw new Error('Dedimania Plugin needs server login and dedimaniacode in the config file!');
    }

    await this.dedimania.init();
    
    console.log('JAJAJJAJAJ');
    console.log('JAJAJJAJAJ');
    console.log('JAJAJJAJAJ');
  }
}
