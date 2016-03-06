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
 * @property {Plugin} plugin
 * @property {Dedimania} dedimania
 *
 * @property {[{Login: string, NickName: string, Best: number, Rank: number, MaxRank: number, Checks: string, Vote: number}]} records
 *  -- '5061,11062,15448,21236,24947,33762,39443,40380,44731,48880' = checks.
 */
module.exports.default = class Flow extends EventEmitter {
  constructor (parent) {
    super();

    this.plugin = parent;
    this.dedimania = parent.dedimania;

    // Holds records of map.
    this.records =    []; // Holds fetched records and changed (the displaying state).

    // Newly driven records in this round.
    this.newRecords = {}; // Indexed by login (because we have 1 update per player maximum).

    // Holds checkpoint runs.
    this.runs       = {}; // Indexed by login.
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
    var currentRecord = this.records.filter((rec) => rec.Login = player.login);
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

    // Server Rank and Player Rank checking.
    if ()
    console.log(player);
    console.log(playerInfo);
  }
};
