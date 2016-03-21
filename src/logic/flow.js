/**
 * Player Drive Flow
 *
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */
'use strict';

var EventEmitter = require('events').EventEmitter;

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
 * @property {[string, {Login: string, Best: number, Checks: string}]} newRecords
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
    this.newRecords = {}; // Indexed by login (because we have 1 update per player maximum).

    // Holds checkpoint runs.
    this.runs       = {}; // Indexed by login.

    // TODO: Move to config.
    this.displayLimit = 50;
  }

  init () {
    this.newRecords = {};
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
    if (! this.runs.hasOwnProperty(player.login)) {
      this.runs[player.login] = [];
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
    if (time === 0) return;

    // Search for existing record.
    // console.log(this.records);
    /** @var {[{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}]|{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}|boolean} currentRecord */
    var currentRecord = this.records.filter((rec) => rec.Login === player.login);
        currentRecord = currentRecord[0] || false;

    var type;
    let login = player.login;
    let run = this.runs[login] || false;

    console.log(this.runs);
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
    if (this.records.length === 0) {
      newPosition = 1;
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
    console.log(current);
    console.log(this.records.indexOf(current));

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

    // Add to queue
    this.newRecords[login] = changeRecord;

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
  }
};
