'use strict';

import * as Package from './package.json';
import * as path from 'path';

import Plugin from 'maniajs-plugin';

var util = require('util');

/**
 * LocalRecords Plugin.
 */
export default class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;
    this.currentMap = null;
    this.records = null;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Event
      this.server.on('map.begin', (map) => {
        this.models['Map'].findOne({
          where: {
            Uid: map.map.UId
          }
        }).then((map) => {
          this.currentMap = map.get({plain: true});
          this.app.log.debug('New map: ' + this.currentMap.Name + ' by ' + this.currentMap.Author);
          this.server.send().chat('New map: ' + this.currentMap.Name + '$z$s by ' + this.currentMap.Author).exec();

          this.models['LocalRecord'].findAll({
            where: {
              MapId: this.currentMap.id
            }
          }).then((records) => {
            this.records = [];
            records.forEach((record) => {
              this.records.push(record.get({plain: true}));
            });

            var localRecords = '$39fLocal Records on $fff' + this.currentMap.Name + '$z$s$39f: ';
            var recordPos = 1;
            this.records.forEach((record) => {
              this.models['Player'].findOne({
                where: {
                  id: this.currentMap.id
                }
              }).then((player) => {
                localRecords = localRecords + '$fff' + recordPos + '$39f. $fff' + player.NickName + '$z$s$39f [$fff' + record.Score + '$39f] ';
                recordPos++;
              });
            });

            this.server.send().chat(localRecords).exec();
            console.log(util.inspect(this.records, false, null));
          });
        });
      });

      this.server.on('player.chat', (data) => {
        if(data.command && data.text == '/skip') {
          this.server.send().chat("$fffSkipping map...").exec();
          this.server.send().skip().exec();
        }
      });
    });
  }
}
