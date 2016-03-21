/**
 * Holds Connection and does stuff with the Dedimania API.
 *
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */
'use strict';

var xmlrpc = require('maniajs-xmlrpc');
var EventEmitter = require('events').EventEmitter;

/**
 * Dedimania Logic.
 *
 * @class Dedimania
 * @type {Dedimania}
 *
 * @property {App} app
 * @property {Client} client XML RPC Client.
 * @property {{dedimaniacode: string, login: string}} config
 *
 * @property {object} game
 * @property {object} game.server
 * @property {number} game.server.ServerMaxRank
 *
 * @property {{string: {Login: string, MaxRank: number, Banned: boolean, OptionsEnabled: boolean, ToolOption: string, online: boolean}}} playerData
 */
module.exports.default = class Dedimania extends EventEmitter {
  constructor (options) {
    super();
    this.app = {};

    options = options || {};

    this.host = options.host || 'dedimania.net';
    this.port = options.port || 8082;
    this.debug = options.debug || false;
    this.path  = options.path || '/Dedimania';

    // Holds game info, will be observed.
    this.game = {
      map:    {},
      server: {}
    };

    // Holds session info's
    this.session = null;

    // Holds player's dedimania metadata (such as banned, max records etc).
    this.playerData = {}; // Indexed by login!

    // Holds config
    this.config = {};

    // XML RPC Client
    this.client = xmlrpc.createClient({
      host: this.host,
      port: this.port,
      path: this.path,
      gzip: true,
      keepAlive: (10 * 60 * 1000)
    });
  }

  /**
   * Start Dedimania Logic.
   * @returns {Promise.<{}>}
   */
  start () {
    return this.app.server.send().custom('GetCurrentMapInfo').exec()
      .then((map) => {
        this.game.map = map;
      });
  }

  /**
   * Open Session to Dedimania.
   * @returns {Promise<string>}
   */
  open () {
    if (! this.config.dedimaniacode || ! this.config.login) {
      return Promise.reject(new Error('We have no config yet!'));
    }

    return new Promise((resolve, reject) => {
      // Title ID
      let packmask = this.app.server.titleId.substr(2);
      // TODO: Multienvi. + scripted

      this.client.methodCall('dedimania.OpenSession', [{
        Game: 'TM2',
        Login: this.app.server.login,
        Code: this.config.dedimaniacode,
        Path: this.app.server.path,
        Packmask: packmask,
        ServerVersion: this.app.server.version,
        ServerBuild: this.app.server.build,
        Tool: 'ManiaJS',
        Version: this.app.version,
        ServerIP: this.app.server.ip,
        ServerPort: this.app.server.ports.port
      }], (err, res) => {
        if (err || res.Error !== '') {
          this.app.log.fatal(err || res.Error);
          return reject(err || res.Error);
        }
        this.session = res.SessionId;

        if (this.config.debug) {
          this.app.log.debug('Got session from dedimania');
        }

        return resolve(res.SessionId);
      })

    });
  }

  /**
   * Get SessionId back as string.
   *
   * @returns {Promise<string>}
   * @private
   */
  _session() {
    if (! this.session) {
      return this.open();
    }
    return Promise.resolve(this.session);
  }

  /**
   * Get records for map (optional is current map).
   * @param {{UId: string, Name: string, Environnement: string, Author: string, NbCheckpoints: number, NbLaps: number}} [map]
   * @returns {Promise<[{}]>}
   */
  getRecords(map) {
    return new Promise((resolve, reject) => {
      this._session().then((sessionId) => {

        var game = 'TA';
        if (this.app.server.currentMode() === 1) {
          game = 'Rounds';
        } else if (this.app.server.currentMode() === 2) {
          game = 'TA';

        } else {
          this.app.log.warn('Current mode not supported by Dedimania!');
          return reject(new Error('Current GameMode not supported!'));
        } // TODO: Scripted tm.

        this.client.methodCall('dedimania.GetChallengeRecords', [sessionId, this._map(), game, this._server(), this._players()], (err, res) => {
          if (err) {
            return reject(err);
          }
          if (! res) {
            this.emit('fetched', []);
            return resolve(); // Mostly because mode is incorrect. So then we are skipping!
          }

          let records = res.Records;
          this.game.server.ServerMaxRank = res.ServerMaxRank;
          this.game.server.AllowedGameModes = res.AllowedGameModes;

          // Parse player details
          if (res.Players) {
            res.Players.forEach((pl) => {
              if (! this.playerData.hasOwnProperty(pl.Login)) {
                this.playerData[pl.Login] = pl;
              }
              this.playerData[pl.Login].Banned = pl.MaxRank == '0';
              this.playerData[pl.Login].MaxRank = pl.MaxRank;

              this.playerData[pl.Login].online = true;
            });
          }

          this.emit('fetched', records);
          return resolve();
        });
      });
    });
  }

  /**
   * Update Player and Server info's (call every 4/5 minutes after begin map).
   * @returns {Promise}
   */
  updatePlayers() {
    return new Promise((resolve, reject) => {
      var session;
      var server;
      var votes = {};
      var players = this._players();

      this._session().then((sessionId) => {
        session = sessionId;
        return this.app.server.getServerOptions();
      }).then((options) => {
        server = this._server(options);

        votes.UId = this.app.maps.current.uid;
        votes.GameMode = 'TA'; // TODO

        // TODO: Parse script name.

        // Send update to dedimania
        this.client.methodCall('dedimania.UpdateServerPlayers', [session, server, votes, players], (err, res) => {
          if (err) {
            return reject(err);
          }
          if (!res) {
            return reject(new Error('Update players failed, got false back!'));
          }
          return resolve();
        });
      }).catch((err) => {
        return reject(err);
      });
    })
  }

  /**
   * Send Records, Handle update of the records at the server.
   * Only call it at the END of a map!
   * 
   * @param {[{Login: string, Best: number, Checks: string}]} updates
   */
  sendRecords (updates) {
    // Prepare by defining send parameters.
    /** @type {{UId:string,Name:string,Environment:string,Author:string,NbCheckpoints:number,NbLaps:number}} **/
    var sendMap = {};
    /** @type {string} **/
    var sendGameMode = (this.app.server.currentMode() === 1 ? 'Rounds' : 'TA');
    /** @type {[{Login:string,Best:number,Checks:string}]} **/
    var sendTimes = [];
    /** @type {{VReplay:string,VReplayChecks:string,Top1GReplay:string}} **/
    var sendReplays = {};

    // Parse and prepare records to send.
    updates.forEach((rec) => {
      console.error(rec);
    });
  }


  /**
   * Send Connect to dedimania. And fetch player info and data.
   *
   * @param {{}} dbPlayer
   * @returns {Promise}
   */
  sendConnect (dbPlayer) {
    return new Promise((resolve, reject) => {
      var session;

      this._session().then((sessionId) => {
        session = sessionId;
        return this.app.players.details(dbPlayer);
      }).then((player) => {
        this.client.methodCall('dedimania.PlayerConnect', [session, player.Login, player.NickName, player.Path, player.IsSpectator], (err, res) => {
          if (err) {
            if (this.debug) {
              this.app.log.debug(err);
            }
            return reject(err);
          }

          // Parse player infos.
          this.playerData[player.Login] = res;

          // Set online flag, players marked with online=false will be removed at next map change.
          this.playerData[player.Login].online = true;

          return resolve(res);
        });

        return resolve();
      });
    });
  }

  /**
   * Send Disconnect to dedimania. And prepare for cleanup.
   *
   * @param {{}} player
   * @returns {Promise}
   */
  sendDisconnect (player) {
    return new Promise((resolve, reject) => {
      var session;

      this._session().then((sessionId) => {
        session = sessionId;

        this.client.methodCall('dedimania.PlayerDisconnect', [session, player.login, ''], (err, res) => {
          if (err) {
            if (this.debug) {
              this.app.log.debug(err);
            }
            return reject(err);
          }

          // Set online flag to false! (WILL BE REMOVED NEXT MAP CHANGE).
          if (this.playerData.hasOwnProperty(player.login)) {
            this.playerData[player.login].online = false;
          }

          return resolve(res);
        });
      });
    });
  }










  /**
   * Format Players in right format.
   *
   * @returns {Array}
   * @private
   */
  _players() {
    let players = [];
    for (let login in this.app.players.list) {
      if (! this.app.players.list.hasOwnProperty(login)) continue;
      if (! this.app.players.list[login].info)           continue;
      let player = this.app.players.list[login];

      players.push({
        Login: player.login,
        IsSpec: player.info && player.info.isSpectator ? true : false,
        Vote: -1 // TODO: Vote
      });
    }
    return players;
  }

  /**
   * Format Map in right format.
   *
   * @param [map]
   *
   * @returns {{UId: (*|string), Name: (*|string), Environment: string, Author: (*|string), NbCheckpoints: (*|number), NbLaps: (*|number)}}
   * @private
   */
  _map(map) {
    map = map || this.game.map;
    return {
      UId: map.UId,
      Name: map.Name,
      Environment: map.Environnement,
      Author: map.Author,
      NbCheckpoints: map.NbCheckpoints,
      NbLaps: map.NbLaps
    };
  }

  /**
   * Format Server in right format.
   *
   * @param {{}} [options]
   * @returns {{SrvName: (*|string), Comment: *, Private: boolean, MaxPlayers: *, NumPlayers: *, MaxSpecs: *, NumSpecs: *}}
   * @private
   */
  _server(options) {
    options = options || this.app.server.options;
    return {
      SrvName: options.Name,
      Comment: options.Comment,
      Private: options.Password.length > 0,
      MaxPlayers: options.CurrentMaxPlayers,
      NumPlayers: this.app.players.countPlayers(),
      MaxSpecs: options.CurrentMaxSpectators,
      NumSpecs: this.app.players.countSpectators()
    };
  }
};