/**
 * Player Drive Flow
 *
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */
'use strict';

var EventEmitter = require('events').EventEmitter;

var async = require('async');
var fs = require('fs');

/**
 * Flow
 * @class Flow
 * @type {Flow}
 *
 * @property {boolean} active
 *
 * @property {Plugin} plugin
 * @property {Dedimania} dedimania
 *
 * @property {[string, {Login: string, Best: number, Checks: string, VReplay: string, Top1GReplay: string}]} newRecords
 * @property {[{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}]} records
 *  -- '5061,11062,15448,21236,24947,33762,39443,40380,44731,48880' = checks.
 */
module.exports.default = class Flow extends EventEmitter {
  constructor (parent) {
    super();

    this.active = false; // Active for current map.

    this.plugin = parent;
    this.dedimania = parent.dedimania;

    // Holds records of map.
    this.records =    []; // Holds fetched records and changed (the displaying state).

    // Newly driven records in this round.
    this.newRecords = []; // Holds new driven records.

    // Holds checkpoint runs.
    this.runs       = {}; // Indexed by login.

    // TODO: Move to config.
    this.displayLimit = 50;
  }

  init () {
    this.newRecords = [];
    this.runs       = {};
  }

  /**
   * Update records from dedimania.
   *
   * @param {[{}]} records
   */
  setRecords (records) {
    this.records = records;
  }

  /**
   * Called at map start (will allow to cleanup).
   */
  reset () {
    // TODO: Cleanup
    this.runs = {};
  }

  /**
   * Map Start - .
   */
  start () {

  }

  /**
   * Map End - Submitting recs to dedimania.
   */
  end () {
    // Lock for new records (would be impossible, but to be sure to not alter after end map call).
    this.active = false;
    this.dedimania.sendRecords(this.newRecords);
    // TODO: Promise then, clear newRecords.
  }

  /**
   * Check if map is allowed!
   * @returns {Promise}
   */
  mapCheck () {
    // Validate if map is valid for dedimania records!
    return new Promise((resolve, reject) => {
      this.plugin.server.send().custom('GetCurrentMapInfo').exec().then((map) => {
        if (map.AuthorTime < 6200 || map.NbCheckpoints < 2) {
          this.active = false;
          return resolve(false);
        }
        this.active = true;
        return   resolve(true);
      }).catch(() => {
        this.active = false;
        resolve(false);
      });
    });
  }

  /**
   * On Checkpoint
   *
   * @param {{login: string}} player
   * @param {number} time
   */
  checkpoint (player, time) {
    let maxCheckpoints = this.dedimania.game.map.NbCheckpoints;

    if (! this.runs.hasOwnProperty(player.login)) {
      this.runs[player.login] = [];
    }
    if ((this.runs[player.login].length + 1) === maxCheckpoints) {
      //return;
    }
    if (time === 0) {
      this.runs[player.login] = [time];
    }else{
      this.runs[player.login].push(time);
    }
  }

  /**
   * On Finish
   *
   * @param {{login: string}} player
   * @param {number} time
   */
  finish (player, time) {
    if (time === 0) {
      this.runs[player.login] = []; // Reset runs.
    }

    // Search for existing record.
    /** @var {[{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}]|{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}|boolean} currentRecord */
    var currentRecord = this.records.filter((rec) => rec.Login === player.login);
        currentRecord = currentRecord[0] || false;

    var type;
    let login = player.login;
    let run = this.runs[login] || false;

    if (! run) return; // Stop when no run is given!

    if (currentRecord) {
      // Already has one record. Check if improved...
      if (currentRecord.Best > time) {
        // IMPROVED TIME!
        type = 'improve';
      } else if (currentRecord.Best === time) {
        // EQUAL TIME! but can be different checkpoint times! So add to queue
        type = 'equal';
      } else if (currentRecord.Best < time) {
        // SLOWER, NO ACTION
        return;
      }
    } else {
      // NEW TIME!
      type = 'new';
    }
    // Start validating and processing...
    this.process(type, login,  run, time, currentRecord);
  }

  /**
   * Process the record change.
   *
   * @param {string} type Could be 'improve', 'equal' and 'new'
   * @param {string} login Player Login.
   * @param {[number]} run Players Run (checkpoint times).
   * @param {number} time Finish Time.
   * @param {{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}|boolean} current Current record, false for none.
   */
  process (type, login, run, time, current) {
    let player = this.plugin.players.list[login] || false;
    let playerInfo = this.dedimania.playerData[login] || false;
    if (! player || ! playerInfo) return;
    // < 6 seconds is not a valid ded record, server won't handle it!
    if (time < 6000) return;
    if (! type) return; // No improved, equal or new record!!

    // Check if dedimania is active.
    if (! this.active || ! this.dedimania.game.server.ServerMaxRank) {
      this.plugin.log.debug('Current map not allowed, or server rank not known!');
      return false;
    }

    let serverRank = parseInt(this.dedimania.game.server.ServerMaxRank);
    let playerRank = parseInt(playerInfo.MaxRank);
    let recordRank = parseInt(current ? current.MaxRank : 0);

    if (isNaN(serverRank) || isNaN(playerRank) || isNaN(recordRank)) {
      this.plugin.log.debug('Server, player or record max rank is NAN! Could not be parsed!!');
      return false;
    }

    var maxRank = 0;

    // Checking biggest max rank.
    if (serverRank > playerRank) {
      maxRank = serverRank;
    } else {
      maxRank = playerRank;
    }

    // Check the played rank, estimate the position(rank) of the time driven.
    var newPosition = -1;
    this.records.forEach((rec, idx) => {
      if (rec.Best > time && newPosition === -1) {
        newPosition = rec.Rank;
      }
    });
    if (newPosition === -1) {
      // Last one :/
      newPosition = this.records.length + 1;
    }

    if (newPosition === -1 || newPosition > maxRank) {
      this.plugin.log.debug('Drove time, would be rank ('+newPosition+'), but is higher then the maxrank ('+maxRank+')!');
      return;
    }
    this.plugin.log.debug('Drove record rank: ' + newPosition + '. Adding to send queue.');

    // Make new record.
    /** @type {{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}} **/
    let record = {
      Login: login,
      NickName: player.nickname,
      Best: time,
      Rank: newPosition,
      MaxRank: maxRank,
      Checks: run.join(','),
      Vote: -1
    };

    /** @type {{Login: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}} **/
    let changeRecord = {
      Login: login,
      Best: time,
      Checks: run.join(',')
    };

    // First remove old record if still exists in this.records
    let currentPosition = current ? current.Rank : -1;

    if (current) {
      let idx = this.records.indexOf(current);
      if (idx !== -1) delete this.records[idx];
    }

    // Add to local dedi list.
    this.records.push(record);

    // Sort.
    this.records = this.records.sort((a, b) => a.Best - b.Best);
    // Update rankings of each record.
    this.records.forEach((rec, idx) => {
      if (rec.Rank !== (idx+1)) rec.Rank = (idx+1);
    });

    // If player has something in queue, remove it.
    let currentQueue = this.newRecords.filter((r) => r.Login === login);
    if (currentQueue && currentQueue.length === 1) {
      delete this.newRecords[this.newRecords.indexOf(currentQueue[0])];
    }

    // Add to queue
    this.newRecords.push(changeRecord);

    // Sort Queue on best time
    this.newRecords.sort((a,b) => a.Best - b.Best);

    // Update ghost and virtual replays in send queue.
    this.updateRecordReplays().then(() => {
      // Update dedimania widget
      this.plugin.widget.updateAll();

      // Craft drove message.
      var recordText = '';
      if (type === 'equal') {
        recordText = '$0f3$<$fff' + player.nickname + '$>$0f3 equalled his/her $fff' + newPosition + '$0f3. Dedimania Record, with a time of $fff' + this.plugin.app.util.times.stringTime(time) + '$0f3...';
      }
      if (type === 'improve') {
        if (newPosition < currentPosition) {
          recordText = '$0f3$<$fff' + player.nickname + '$>$0f3 gained the $fff' + newPosition + '$0f3. Dedimania Record, with a time of $fff' + this.plugin.app.util.times.stringTime(time) +
            '$0f3 ($fff' + currentPosition + '$0f3. $fff' + this.plugin.app.util.times.stringTime(current.Best) + '$0f3/$fff-' + this.plugin.app.util.times.stringTime((current.Best - time)) + '$0f3)!';
        }else{
          recordText = '$0f3$<$fff' + player.nickname + '$>$0f3 improved his/her $fff' + newPosition + '$0f3. Dedimania Record, with a time of $fff' + this.plugin.app.util.times.stringTime(time) +
            '$0f3 ($fff' + currentPosition + '$0f3. $fff' + this.plugin.app.util.times.stringTime(current.Best) + '$0f3/$fff-' + this.plugin.app.util.times.stringTime((current.Best - time)) + '$0f3)!';
        }
      }
      if (type === 'new') {
        recordText = '$0f3$<$fff' + player.nickname + '$>$0f3 drove the $fff' + newPosition + '$0f3. Dedimania Record, with a time of $fff' + this.plugin.app.util.times.stringTime(time) + '$0f3!';
      }

      // Send chat message.
      if(newPosition <= this.displayLimit)
        this.plugin.server.send().chat(recordText).exec();
      else
        this.plugin.server.send().chat(recordText, {destination: login}).exec();
    }).catch((err) => {
      // We will cancel the driven dedimania record!
      delete this.newRecords[this.newRecords.indexOf(changeRecord)];
      delete this.records[this.records.indexOf(record)];

      // Resort and recalculate.
      this.records = this.records.sort((a, b) => a.Best - b.Best);
      this.newRecords.sort((a,b) => a.Best - b.Best);
      this.records.forEach((rec, idx) => {
        if (rec.Rank !== (idx+1)) rec.Rank = (idx+1);
      });

    });
  }

  /**
   * Update records (new records) and give the top1 a ghost replay, and others VReplay if not already defined.
   * @returns Promise<> promise, sends resolve on success, reject on failure. Reject is never good! It can resolve in dedimania loss!!
   */
  updateRecordReplays() {
    return new Promise((resolve, reject) => {
      // Iterate through all new records.
      async.eachSeries(this.newRecords, (record, callback) => {
        if (! record) {
          return callback(); // Skip when record is invalid.
        }

        // Index of current one.
        let idx = this.newRecords.indexOf(record);

        // Check if top1 record
        var file;
        var process;

        // Get position of record.
        var rank;
        try {
          rank = this.records.filter((r) => {
            return r.Login && record.Login && r.Best && record.Best
                && r.Login === record.Login && r.Best === record.Best;
          });
          rank = rank.length === 1 ? rank[0].Rank : 1;
        } catch (err) {
          this.plugin.log.warn(err);
          this.plugin.log.debug(record);
          this.plugin.log.debug(this.records);
          return callback(); // Skip this record on failure.
        }

        if (rank === 1 && ! record.Top1GReplay) {
          // Yep. Lets get the Ghost!
          file = 'ManiaJS/Ghost.' + Date.now() + '_' + idx + '_' + record.Best + '.Replay.Gbx';
          process = this.plugin.server.send().custom('SaveBestGhostsReplay', [record.Login, file]).exec();
        } else {
          process = Promise.resolve(false);
        }

        // Run the promise given.
        process.then((ghostSaved) => {
          if (ghostSaved) {
            return new Promise((resolve, reject) => {
              fs.readFile(this.plugin.server.paths.data + '/Replays/' + file, (err, buffer) => {
                if (err) return reject(err);
                return resolve(buffer);
              });
            });
          }
          return Promise.resolve(false);
        }).then((ghostContent) => {
          if (ghostContent) {
            // Top1GReplay is given, we just read it from filesystem!
            record.Top1GReplay = (new Buffer(ghostContent, 'binary')).toString('base64'); // From Buffer instance.
          } else {
            record.Top1GReplay = null;
          }

          if (! record.VReplay) {
            // Get VReplay from server.
            return this.plugin.server.send().custom('GetValidationReplay', [record.Login]).exec();
            //return this.plugin.server.send().custom('system.multicall', [[{methodName: 'GetValidationReplay', params: [record.Login]}]]).exec();
          }
          return Promise.resolve(false);
        }).then((validationReplay) => {
          if (validationReplay) {
            record.VReplay = validationReplay.toString('base64');
          } else {
            record.VReplay = null;
          }

          return callback();
        }).catch((err) => {
          this.plugin.log.error(err);
          return callback(err);
        });


      }, (err) => {
        // Should  be ready now...
        if (err) return reject(err);
        resolve();
      });
    });
  }
};
