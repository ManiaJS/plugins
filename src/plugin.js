'use strict';

import * as Package from './../package.json';
import * as path from 'path';

import Plugin from 'maniajs-plugin';

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

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];

    // Plugin properties
    this.records = null;
    this.runs = [];

    this.recordlimit = 100;
    this.displaylimit = 50;
    this.chatdisplay = true;
    this.chatannounce = true;
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      if(this.config) {
        if(this.config.hasOwnProperty('recordlimit') && this.config.recordlimit != '') {
          this.recordlimit = this.config.recordlimit;
        }

        if(this.config.hasOwnProperty('displaylimit') && this.config.displaylimit != '') {
          this.displaylimit = this.config.displaylimit;
        }

        if(this.config.hasOwnProperty('chatdisplay') && this.config.chatdisplay != '') {
          this.chatdisplay = this.config.chatdisplay;
        }

        if(this.config.hasOwnProperty('chatannounce') && this.config.chatannounce != '') {
          this.chatannounce = this.config.chatannounce;
        }
      }

      // Event
      this.server.on('map.begin',
        (params) => this.beginMap(params));

      this.server.on('trackmania.player.finish',
        (params) => this.playerFinish(params));

      this.server.on('trackmania.player.checkpoint',
        (params) => this.playerCheckpoint(params));

      this.loadRecords(this.maps.current).then(() => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Function called on map start: empties run overview and loads/displays Local Records.
   * @param map
   */
  beginMap(map) {
    this.runs = [];

    this.loadRecords(map);
  }

  /**
   * Function will display the local records based on the current map (does not use map input).
   *
   * @param map
   *
   * @returns {Promise}
   */
  loadRecords(map) {
    this.app.log.debug('New map: ' + this.maps.current.name + ' by ' + this.maps.current.author);
    this.server.send().chat('New map: ' + this.maps.current.name + '$z$s by ' + this.maps.current.author).exec();

    let Player = this.app.models.Player;

    return this.models.LocalRecord.findAll({
      where: {
        MapId: this.maps.current.id
      },
      include: [Player]
    }).then((records) => {
      this.records = records.sort((a, b) => a.score - b.score);

      if(this.chatdisplay) {
        var localRecords = '$39fLocal Records on $<$fff' + this.maps.current.name + '$>$39f';

        if(this.records.length > 0) {
          localRecords += ' (' + this.records.length + '): ';
          for (var recordPos = 0; (recordPos < 10 && recordPos < this.records.length && recordPos < this.recordlimit); recordPos++) {
            localRecords += '$fff' + (recordPos + 1) + '$39f. $<$fff' + this.records[recordPos].Player.nickname + '$>$39f [$fff' + this.app.util.times.stringTime(this.records[recordPos].score) + '$39f] ';
          }
        } else {
          localRecords += ': $fffno records yet.';
        }

        this.server.send().chat(localRecords).exec();

        Object.keys(this.players.list).forEach((login) => {
          let player = this.players.list[login];
          var record = this.records.filter(function (rec) {
            return rec.PlayerId == player.id;
          });
          var text = '$0f3You do not have a Local Record on this map.';

          if (record.length == 1) {
            record = record[0];
            var recordIndex = (this.records.indexOf(record) + 1);
            if (recordIndex <= this.recordlimit) {
              text = '$0f3Your current Local Record is: $fff' + recordIndex + '$0f3. with a time of $fff' + this.app.util.times.stringTime(record.score) + '$0f3.';
            }
          }

          this.server.send().chat(text, {destination: login}).exec();
        });
      }
    });
  }

  /**
   * Function registers when a player finished and updates/inserts a local record if it's his/her best new time.
   *
   * @param finish
   */
  playerFinish(finish) {
    let login = finish.login;
    let time = finish.timeOrScore;

    if(time > 0) {
      let player = this.players.list[login];
      var record = this.records.filter(function (rec) { return rec.PlayerId == player.id; });

      if (record.length == 1) {
        // Already has a local record
        if(time < record[0].score) {
          var previousTime = record[0].score;
          var previousIndex = (this.records.indexOf(record[0]) + 1);

          record[0].score = time;
          if(this.runs[login]) {
            record[0].checkpoints = this.runs[login];
          } else {
            record[0].checkpoints = '';
          }
          record[0].save();

          this.records = this.records.sort((a, b) => a.score - b.score);

          if(this.chatannounce) {
            var newIndex = (this.records.indexOf(record[0]) + 1);

            var improvedRecordText = '';
            if(newIndex < previousIndex) {
              improvedRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 gained the $fff' + (newIndex) + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) +
                  '$0f3 ($fff' + (previousIndex) + '$0f3. $fff' + this.app.util.times.stringTime(previousTime) + '$0f3/$fff-' + this.app.util.times.stringTime((previousTime - record[0].score)) + '$0f3)!';
            } else {
              improvedRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 improved his/her $fff' + (newIndex) + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) +
                  '$0f3 ($fff' + this.app.util.times.stringTime(previousTime) + '$0f3/$fff-' + this.app.util.times.stringTime((previousTime - record[0].score)) + '$0f3).';
            }

            if(newIndex <= this.displaylimit)
              this.server.send().chat(improvedRecordText).exec();
            else if(newIndex <= this.recordlimit)
              this.server.send().chat(improvedRecordText, {destination: login}).exec();
          }
        } else if(time == record[0].score) {
          if(this.chatannounce) {
            var equalledIndex = (this.records.indexOf(record[0]) + 1);
            var equalledRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 equalled his/her $fff' + equalledIndex + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$0f3...';

            if(equalledIndex <= this.displaylimit)
              this.server.send().chat(equalledRecordText).exec();
            else if(equalledIndex <= this.recordlimit)
              this.server.send().chat(equalledRecordText, {destination: login}).exec();
          }
        }
      } else {
        // Does not have a local record yet
        var newRecord = this.models.LocalRecord.build({
          score: time,
          Map: this.maps.current,
          Player: player,
          MapId: this.maps.current.id,
          PlayerId: player.id
        });

        newRecord.checkpoints = this.runs[login]? this.runs[login] : '';

        this.records.push(newRecord);
        this.records = this.records.sort((a, b) => a.score - b.score);

        if(this.chatannounce) {
          var newRecordIndex = (this.records.indexOf(newRecord) + 1);
          var newRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 drove the $fff' + newRecordIndex + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(newRecord.score) + '$0f3!';

          if(newRecordIndex <= this.displaylimit)
            this.server.send().chat(newRecordText).exec();
          else if(newRecordIndex <= this.recordlimit)
            this.server.send().chat(newRecordText, {destination: login}).exec();
        }

        newRecord.save();
      }
    }
  }

  /**
   * Function registers when a player passes a checkpoint and saves this in the current runs.
   * playerId: 0,
   * login: 1,
   * timeOrScore: 2,
   * curLap: 3,
   * checkpoint: 4
   *
   * @param checkpoint
   */
  playerCheckpoint(checkpoint) {
    let login = checkpoint.login;

    if(checkpoint.checkpoint == 0) {
      this.runs[login] = checkpoint.timeOrScore;
    } else {
      if(this.runs[login]) {
        this.runs[login] += ',' + checkpoint.timeOrScore;
      }
    }
  }
}
