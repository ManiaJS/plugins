'use strict';

var Package = require('./../package.json');
var path    = require('path');
var xmlrpc  = require('xmlrpc');

var Plugin  = require('maniajs-plugin').default;

var Dedimania = require('./logic/dedimania').default;
var Widget    = require('./logic/widget').default;
var Flow      = require('./logic/flow').default;

/**
 * DediMania Plugin.
 *
 * @property {Dedimania} dedimania
 * @property {object} serverInfo
 * @property {number} serverInfo.ServerMaxRank
 *
 * @property {Widget} widget
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

    // Game Requirements
    this.game.games = ['trackmania']; // Only for trackmania
    this.game.modes = [1, 2, 3, 4, 5]; // rounds,timeattack,team,laps,cup

    // Plugin properties
    this.client = null;
    this.session = null;

    this.newRecords = []; // Holds newly driven records. (queue to send to the dedimania server).
    this.playerInfo = []; // Holds info like max record limit and if banned, etc.

    // Server Record Limit
    this.serverInfo = {};
    this.displaylimit = 50;

    this.chatdisplay = true;
    this.chatannounce = true;

    // Dedimania Logic
    this.dedimania = new Dedimania({
      host: 'dedimania.net',
      port: 8081,
      path: '/Dedimania',
      debug: true
    });

    // Widget Logic
    this.widget = new Widget(this);

    // Game Flow Logic
    this.flow =   new Flow(this);


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

      // Set the dedimania stuff.
      this.dedimania.config = this.config;
      this.dedimania.app = this.app;
      // UI
      this.widget.init(this.app.ui.build(this, 'recordswidget', 1));
      // Flow
      this.flow.init();



      // Events
      this.server.on('map.begin',
        (params) => { this.beginMap(params) });
      this.server.on('map.end',
        (params) => { this.endMap(params) });

      this.server.on('player.connect',
        (params) => { this.playerConnect(params) });
      this.server.on('player.disconnect',
        (params) => { this.playerDisconnect(params) });

      this.server.on('trackmania.player.finish',
        (params) => { this.playerFinish(params) });

      this.server.on('trackmania.player.checkpoint',
        (params) => { this.playerCheckpoint(params) });


      // Open session.
      this.dedimania.open().then(()=>{
        return this.dedimania.start();
      }).then(()=> {
        this.dedimania.getRecords();

        // Start timer.
        this.timerUpdate = setInterval(() => {
          this.dedimania.updatePlayers();
        }, 240000); // 4 minutes.
      });



      // Fetch records event.
      this.dedimania.on('fetched', (records) => {
        this.flow.setRecords(records);

        // Dispaly Records
        this.displayRecords();
        this.displayPersonalRecords();
      });

      return resolve();
    });
  }


  /**
   * Begin Map callback.
   * @param map
   */
  beginMap(map) {
    this.runs = [];

    // Dedimania Logic. Update Map.
    this.dedimania.game.map = map;
    // Load records. This will fire the done event.
    this.dedimania.getRecords();// will trigger ui after fetched

    // Reset, new map loaded!
    this.flow.reset();
    this.flow.start();

    // Set timer.
    this.timerUpdate = setInterval(() => {
      this.dedimania.updatePlayers();
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

    // Send records to dedimania
    this.flow.end();
  }

  playerConnect(params) {
    let player = this.players.list[params.login];

    // Send to dedimania
    this.dedimania.sendConnect(player);

    // Load records pane and text
    this.displayTextualRecord(player);
    this.widget.displayRecordsWidget(player);
  }

  playerDisconnect(params) {
    let player = this.players.list[params.login];

    // Send disconnect
    this.dedimania.sendDisconnect(player);

    // Cleanup
    // TODO;
  }

  /**
   * Function registers when a player finished and updates/inserts a local record if it's his/her best new time.
   *
   * @param {{login: string, timeOrScore: number}} finish
   */
  playerFinish(finish) {
    let login = finish.login;
    let player = this.players.list[login];
    let time = finish.timeOrScore;

    if (time > 0 && player && this.dedimania.playerData.hasOwnProperty(login)) {
      this.flow.finish(player, time);
    }

    return;

    if(time > 0) {
      let player = this.players.list[login];
      var record = this.flow.records.filter(function (rec) { return rec.PlayerId == player.id; });

      if (record.length == 1) {
        // Already has a local record
        if(time < record[0].score) {
          var previousTime = record[0].score;
          var previousIndex = this.flow.records.indexOf(record[0]);

          record[0].score = time;
          if(this.runs[login]) {
            record[0].checkpoints = this.runs[login];
          } else {
            record[0].checkpoints = '';
          }
          record[0].save();

          this.flow.records = this.flow.records.sort((a, b) => a.score - b.score);
          var newIndex = this.flow.records.indexOf(record[0]);

          var improvedRecordText = '';
          if(newIndex < previousIndex) {
            improvedRecordText = '$090$<$fff' + player.nickname + '$>$090 gained the $fff' + (newIndex + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090 ($fff' + (previousIndex + 1) + '$090. $fff' + this.app.util.times.stringTime(previousTime) + '$090)!';
          } else {
            improvedRecordText = '$090$<$fff' + player.nickname + '$>$090 improved his/her $fff' + (newIndex + 1) + '$090., with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090 ($fff' + this.app.util.times.stringTime(previousTime) + '$090).';
          }
          this.server.send().chat(improvedRecordText).exec();
        } else if(time == record[0].score) {
          var equalledRecordText = '$090$<$fff' + player.nickname + '$>$090 equalled his/her $fff' + (this.flow.records.indexOf(record[0]) + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$090...';
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

        this.flow.records.push(newRecord);
        this.flow.records = this.flow.records.sort((a, b) => a.score - b.score);
        var newRecordText = '$090$<$fff' + player.nickname + '$>$090 drove the $fff' + (this.flow.records.indexOf(newRecord) + 1) + '$090. Local Record, with a time of $fff' + this.app.util.times.stringTime(newRecord.score) + '$090!';
        this.server.send().chat(newRecordText).exec();

        newRecord.save();
      }
    }
  }

  /**
   * Function registers when a player passes a checkpoint and saves this in the current runs.
   * playerId
   * login
   * timeOrScore
   * curLap
   * checkpoint
   *
   * @param {{login: string, timeOrScore: number}} params
   */
  playerCheckpoint(params) {
    let login = params.login;
    let player = this.players.list[login];
    let time = params.timeOrScore;

    if (player) {
      this.flow.checkpoint (player, time);
    }
  }










  displayRecords() {
    if (this.flow.records) {
      var text = '$39fDedimania Records on $<$fff' + this.maps.current.name + '$>$39f (' + (this.flow.records.length - 1) + '): ';

      for(var recordPos = 0; (recordPos < 5 && recordPos < this.flow.records.length); recordPos++) {
        text += '$fff' + (recordPos + 1) + '$39f. $<$fff' + this.flow.records[recordPos].NickName + '$>$39f [$fff' + this.app.util.times.stringTime(this.flow.records[recordPos].Best) + '$39f] ';
      }

      this.server.send().chat(text).exec();
    }
  }




  displayPersonalRecords () {
    Object.keys(this.players.list).forEach((login) => {
      let player = this.players.list[login];
      this.displayTextualRecord(player);
      this.widget.displayRecordsWidget(player);
    });
  }

  /**
   * Displays the dedimania record for the player.
   *
   * @param player
   */
  displayTextualRecord (player) {
    var text = '$0f3You do not have a Dedimania Record on this map.';

    var record = [];
    if (this.flow.records.length > 0) {
      record = this.flow.records.filter(function (rec) {
        return rec.Login == player.login;
      });
    }

    if (record.length == 1) {
      record = record[0];
      var recordIndex = (this.flow.records.indexOf(record) + 1);
      text = '$0f3Your current Dedimania Record is: $fff' + recordIndex + '$0f3. with a time of $fff' + this.app.util.times.stringTime(record.Best) + '$0f3.';
    }

    this.server.send().chat(text, {destination: player.login}).exec();
  }
};
