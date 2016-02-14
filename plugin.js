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
        this.app.log.debug('New map: ' + this.maps.current.name + ' by ' + this.maps.current.author);
        this.server.send().chat('New map: ' + this.maps.current.name + '$z$s by ' + this.maps.current.author).exec();

        let Player = this.app.models.Player;
        this.models['LocalRecord'].findAll({
          where: {
            MapId: this.maps.current.id
          },
          include: [Player]
        }).then((records) => {
          this.records = records.sort((a, b) => a.score - b.score);

          var localRecords = '$39fLocal Records on $fff' + this.maps.current.name + '$z$s$39f: ';

          for(var recordPos = 1; (recordPos < 11 && recordPos < this.records.length); recordPos++) {
            localRecords += '$fff' + recordPos + '$39f. $fff' + this.records[(recordPos - 1)].Player.nickname + '$z$s$39f [$fff' + this.app.util.times.stringTime(this.records[(recordPos - 1)].score) + '$39f] ';
          }

          this.server.send().chat(localRecords).exec();

          this.app.players.list.forEach((player) => {
            var record = this.records.filter(function(rec) { return rec.playerId = player.id; });
            var yourRecord = record? '$090Your current Local Record is: $fff' + this.records.indexOf(record) + '$090. with a time of $fff' + this.app.util.times.stringTime(record.score) + '$090.' : '$090You currently do not have a Local Record on this map.';
            this.server.send().chat(yourRecord);
          });
        });
      });

      this.server.on('player.chat', (data) => {
        if(data.command && data.text == '/skip') {
          this.server.send().chat("$fffSkipping map...").exec();
          this.server.send().skip().exec();
        }
      });

      resolve();
    });
  }
}
