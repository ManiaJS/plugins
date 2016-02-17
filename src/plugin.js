'use strict';

var Package = require('./../package.json');
var path = require('path');
var xmlrpc = require('xmlrpc');

var Plugin = require('maniajs-plugin').default;

/**
 * DediMania Plugin.
 */
module.exports.default = class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];

    // Plugin properties
    this.client = null;
    this.session = null;

    this.runs = [];       // Holds checkpoint times.

    this.records =    []; // Holds fetched records and changed (the displaying state).
    this.newRecords = []; // Holds newly driven records. (queue to send to the dedimania server).
    this.playerInfo = []; // Holds info like max record limit and if banned, etc.

    this.host = 'dedimania.net';
    this.port = 8082;
    this.path = '/Dedimania';


    this.timerUpdate = null;
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Verify config
      if ( ! this.config || ! this.config.hasOwnProperty('login') || this.config.login === ''
        || ! this.config.hasOwnProperty('dedimaniacode') || this.config.dedimaniacode === '') {
        return reject(new Error('Dedimania plugin needs a server login and dedimania code!'));
      }

      // Create XMLRPC client
      this.client = xmlrpc.createClient({
        host: this.host,
        port: this.port,
        path: this.path
      });

      // Events
      this.server.on('map.begin',
        (params) => this.beginMap(params));
      this.server.on('map.end',
        (params) => this.endMap(params));

      // Open Session
      return this.openSession().then((sessionId) => {
        this.session = sessionId;

        this.getSession();

        return this.server.send().custom('GetCurrentMapInfo').exec();
      }).then((res) => {
        this.loadRecords(res);
        return resolve();
      }).catch((err) => {
        this.app.log.error(err);
        return reject(err);
      });
    });
  }

  /**
   * Open Session to Dedimania.
   *
   * @returns {Promise}
   */
  openSession() {
    return new Promise((resolve, reject) => {

      // Title ID
      let packmask = this.app.server.titleId.substr(2);
      // TODO: Multienvi.

      this.client.methodCall('dedimania.OpenSession', [{
        Game: 'TM2',
        Login: this.server.login,
        Code: this.config.dedimaniacode,
        Path: this.server.path,
        Packmask: packmask,
        ServerVersion: this.server.version,
        ServerBuild: this.server.build,
        Tool: 'ManiaJS',
        Version: this.app.version + '-' + this.version,
        ServerIP: this.server.ip,
        ServerPort: this.server.ports.port
      }], (err, res) => {
        if (err || res.Error !== '') {
          return reject(err || res.Error);
        }
        this.app.log.debug('Got session from dedimania');
        return resolve(res.SessionId);
      })

    });
  }

  /**
   * Get Session ID, will check the session first.
   *
   * @returns {Promise}
   */
  getSession() {
    if (! this.session) {
      return this.openSession();
    }
    return new Promise((resolve, reject) => {
      this.client.methodCall('dedimania.CheckSession', [this.session], (err, res) => {
        if (err) {
          return reject(err);
        }

        // We need to remake a session.
        if (! res) {
          return this.openSession();
        }
        return resolve(this.session);
      });
    });
  }

  updatePlayers() {
    let server = {};
    let votes = {};
    let players = [];
    var session = null;

    return this.getSession().then((sessionId) => {
      session = sessionId;
      return this.server.getServerOptions();
    }).then((options) => {
      server.SrvName = options.Name;
      server.Comment = options.Comment;
      server.Private = options.Password.length > 0;
      server.MaxPlayers = options.CurrentMaxPlayers;
      server.NumPlayers = this.players.countPlayers();
      server.MaxSpecs = options.CurrentMaxSpectators;
      server.NumSpecs = this.players.countSpectators();

      return this.server.send().custom('GetScriptName').exec();
    }).then((script) => {
      votes.UId = this.maps.current.uid;
      votes.GameMode = 'TA';

      // TODO: Parse script name.

      // Players
      for (let login in this.players.list) {
        if (!this.players.list.hasOwnProperty(login)) continue;
        if (!this.players.list[login].info)           continue;
        let player = this.players.list[login];

        players.push({
          Login: player.login,
          IsSpec: player.info && player.info.isSpectator ? true : false,
          Vote: -1 // TODO: Vote
        });
      }

      // Send update.
      return new Promise((resolve, reject) => {
        this.client.methodCall('dedimania.UpdateServerPlayers', [session, server, votes, players], (err, res) => {
          if (err) {
            return reject(err);
          }

          // We need to remake a session.
          if (!res) {
            return reject(new Error('Update players failed, got false back!'));
          }
          return resolve();
        });
      });
    }).then(() => {
      this.app.log.debug('Dedimania: Update Players Done!');
    }).catch((err) => {
      this.app.log.warn('Dedimania: Update Player failed: ', err);
    });
  }

  /**
   * Begin Map callback.
   * @param map
   */
  beginMap(map) {
    this.runs = [];

    // Load Dedimania Records
    this.loadRecords(map);

    // Set timer.
    this.timerUpdate = setInterval(() => {
      this.updatePlayers();
    }, 240000); // 4 minutes.
  }

  /**
   * End Map callback.
   * @param map
   */
  endMap(map) {
    // Clear Interval
    if (this.timerUpdate) {
      clearInterval(this.timerUpdate);
    }
  }

  /**
   * Function will display the local records based on the current map (does not use map input).
   *
   * @param map
   */
  loadRecords(map) {
    return new Promise((resolve, reject) => {
      this.getSession().then((session) => {
        let sendMap = {
          UId: map.UId,
          Name: map.Name,
          Environment: map.Environnement,
          Author: map.Author,
          NbCheckpoints: map.NbCheckpoints,
          NbLaps: map.NbLaps
        };

        let game = 'TA';
        // TODO: Script.

        let options = this.server.options;
        let server = {
          SrvName: options.Name,
          Comment: options.Comment,
          Private: options.Password.length > 0,
          MaxPlayers: options.CurrentMaxPlayers,
          NumPlayers: this.players.countPlayers(),
          MaxSpecs: options.CurrentMaxSpectators,
          NumSpecs: this.players.countSpectators()
        };

        let players = [];

        // Players
        for (let login in this.players.list) {
          if (!this.players.list.hasOwnProperty(login)) continue;
          if (!this.players.list[login].info)           continue;
          let player = this.players.list[login];

          players.push({
            Login: player.login,
            IsSpec: player.info && player.info.isSpectator ? true : false,
            Vote: -1 // TODO: Vote
          });
        }

        // Send
        this.client.methodCall('dedimania.GetChallengeRecords', [session, sendMap, game, server, players], (err, res) => {
          if (err) {
            console.error(err.stack);
            return reject(err);
          }

          console.log(res);

          if (! res) {
            this.records = [];
          }

          this.records = res.Records;
          try {
            this.records = this.records.sort((a, b) => a.Best - b.Best);
            this.displayRecords();
          } catch (err) {
            this.app.log.warn('Dedimania: Sorting error, ', err);
          }
        });

      });
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
          var previousIndex = this.records.indexOf(record[0]);

          record[0].score = time;
          if(this.runs[login]) {
            record[0].checkpoints = this.runs[login];
          } else {
            record[0].checkpoints = '';
          }
          record[0].save();

          this.records = this.records.sort((a, b) => a.score - b.score);
          var newIndex = this.records.indexOf(record[0]);

          var improvedRecordText = '';
          if(newIndex < previousIndex) {
            improvedRecordText = '$090$<$fff' + player.nickname + '$>$090 gained the $fff' + (newIndex + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090 ($fff' + (previousIndex + 1) + '$090. $fff' + this.app.util.times.stringTime(previousTime) + '$090)!';
          } else {
            improvedRecordText = '$090$<$fff' + player.nickname + '$>$090 improved his/her $fff' + (newIndex + 1) + '$090., with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090 ($fff' + this.app.util.times.stringTime(previousTime) + '$090).';
          }
          this.server.send().chat(improvedRecordText).exec();
        } else if(time == record[0].score) {
          var equalledRecordText = '$090$<$fff' + player.nickname + '$>$090 equalled his/her $fff' + (this.records.indexOf(record[0]) + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090...';
          this.server.send().chat(equalledRecordText).exec();
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
        var newRecordText = '$090$<$fff' + player.nickname + '$>$090 drove the $fff' + (this.records.indexOf(newRecord) + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(newRecord.score) + '$090!';
        this.server.send().chat(newRecordText).exec();

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



  displayRecords() {
    if (this.records) {
      var text = '$39fDedimania Records on $<$fff' + this.maps.current.name + '$>$39f (' + (this.records.length - 1) + '): ';

      for(var recordPos = 0; (recordPos < 5 && recordPos < this.records.length); recordPos++) {
        text += '$fff' + (recordPos + 1) + '$39f. $<$fff' + this.records[recordPos].NickName + '$>$39f [$fff' + this.app.util.times.stringTime(this.records[recordPos].Best) + '$39f] ';
      }

      this.server.send().chat(text).exec();
    }
  }
};
