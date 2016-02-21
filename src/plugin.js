'use strict';

var Package = require('./../package.json');
var path    = require('path');
var xmlrpc  = require('xmlrpc');

var Plugin  = require('maniajs-plugin').default;

/**
 * DediMania Plugin.
 *
 * @property {object} serverInfo
 * @property {number} serverInfo.ServerMaxRank
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

    this.runs = [];       // Holds checkpoint times.

    this.records =    []; // Holds fetched records and changed (the displaying state).
    this.newRecords = []; // Holds newly driven records. (queue to send to the dedimania server).
    this.playerInfo = []; // Holds info like max record limit and if banned, etc.

    // Server Record Limit
    this.serverInfo = {};
    this.displaylimit = 50;

    this.chatdisplay = true;
    this.chatannounce = true;

    this.host = 'dedimania.net';
    this.port = 8082;
    this.path = '/Dedimania';

    this.timerUpdate = null;

    // Widget
    this.widgetEnabled = true;
    this.widgetEntries = 16;
    this.widgetTopCount = 3;
    this.widgetWidth = 15.5;
    this.widgetHeight = ((1.8 * this.widgetEntries) + 3.2);
    this.widgetX = -64.2;
    this.widgetY = 28.2;

    this.sideSettings = {
      left: {
        icon: {
          x: 0.6,
          y: 0
        },
        title: {
          x: 3.2,
          y: -0.65,
          halign: 'left'
        },
        image_open: {
          x: -0.3,
          image: 'http://static.undef.name/ingame/records-eyepiece/edge-open-ld-dark.png'
        }
      },
      right: {
        icon: {
          x: 12.5,
          y: 0
        },
        title: {
          x: 12.4,
          y: -0.65,
          halign: 'right'
        },
        image_open: {
          x: 12.2,
          image: 'http://static.undef.name/ingame/records-eyepiece/edge-open-rd-dark.png'
        }
      }
    };

    this.widgetSettings = {
      manialinkid: 'DedimaniaRecords',
      actionid: 'OpenDedimaniaRecords',
      title: 'Dedimania Records',

      width: this.widgetWidth,
      height: this.widgetHeight,
      column_height: (this.widgetHeight - 3.1),
      widget_x: this.widgetX,
      widget_y: this.widgetY,
      background_width: (this.widgetWidth - 0.2),
      background_height: (this.widgetHeight - 0.2),
      border_width: (this.widgetWidth + 0.4),
      border_height: (this.widgetHeight + 0.6),
      column_width_name: (this.widgetWidth - 6.45),

      background_color: '3342',
      background_focus: '09F6',
      background_rank: '09F5',
      background_score: '09F3',
      background_name: '09F1',

      background_style: 'Bgs1',
      background_substyle: 'BgTitleGlow',
      border_style: 'Bgs1',
      border_substyle: 'BgTitleShadow',

      image_open_x: (this.widgetX < 0) ? this.sideSettings.right.image_open.x + (this.widgetWidth - 15.5) : this.sideSettings.left.image_open.x,
      image_open_y: -(this.widgetHeight - 3.18),
      image_open: (this.widgetX < 0) ? this.sideSettings.right.image_open.image : this.sideSettings.left.image_open.image,

      title_background_width: (this.widgetWidth - 0.8),
      title_style: 'BgsPlayerCard',
      title_substyle: 'BgRacePlayerName',
      title_x: (this.widgetX < 0) ? this.sideSettings.right.title.x + (this.widgetWidth - 15.5) : this.sideSettings.left.title.x,
      title_y: (this.widgetX < 0) ? this.sideSettings.right.title.y : this.sideSettings.left.title.y,
      title_halign: (this.widgetX < 0) ? this.sideSettings.right.title.halign : this.sideSettings.left.title.halign,

      icon_x: (this.widgetX < 0) ? this.sideSettings.right.icon.x + (this.widgetWidth - 15.5) : this.sideSettings.left.icon.x,
      icon_y: (this.widgetX < 0) ? this.sideSettings.right.icon.y : this.sideSettings.left.icon.y,
      icon_style: 'BgRaceScore2',
      icon_substyle: 'LadderRank',

      text_color: 'FFFF',

      top_width: this.widgetWidth - 0.8,
      top_height: (this.widgetTopCount * 1.8) + 0.2,
      top_style: 'BgsPlayerCard',
      top_substyle: 'BgCardSystem'
    };
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

      // UI
      this.recordsWidget = this.app.ui.build(this, 'recordswidget', 1);
      this.recordsWidget.global(this.widgetSettings);

      // Events
      this.server.on('map.begin',
        (params) => this.beginMap(params));
      this.server.on('map.end',
        (params) => this.endMap(params));

      this.server.on('player.connect', (params) => {
        let player = this.players.list[params.login];
        this.playerRecord(player);
        this.displayRecordsWidget(player);
      });

      // Open Session
      return this.openSession().then((sessionId) => {
        this.session = sessionId;

        this.getSession();

        return this.server.send().custom('GetCurrentMapInfo').exec();
      }).then((res) => {
        return this.loadRecords(res);
      }).then(() => {
        return this.displayRecords();
      }).then(() => {
        this.displayPersonalRecords();
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
    this.loadRecords(map)
      .then(() => {
        console.error('jkadfsadfhjskladfhjskldfhjksldsfhjkladfhjksladfhjsklhjklsjkadfsladhjksfladsfadsklfhjasdf');
        console.error('jkadfsadfhjskladfhjskldfhjksldsfhjkladfhjksladfhjsklhjklsjkadfsladhjksfladsfadsklfhjasdf');
        console.error('jkadfsadfhjskladfhjskldfhjksldsfhjkladfhjksladfhjsklhjklsjkadfsladhjksfladsfadsklfhjasdf');
        console.error('jkadfsadfhjskladfhjskldfhjksldsfhjkladfhjksladfhjsklhjklsjkadfsladhjksfladsfadsklfhjasdf');
        return this.displayRecords();
      })
      .then(() => {
        this.displayPersonalRecords();
      });

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

        var game = 'TA';
        if (this.server.currentMode() === 1) {
          game = 'Rounds';
        } else if (this.server.currentMode() === 2) {
          game = 'TA';

        } else {
          this.log.warn('Current mode not supported by Dedimania!');
          return reject(new Error('Current GameMode not supported!'));
        } // TODO: Scripted tm.


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

          if (! res) {
            this.records = [];
          }

          // Player Infos. (will have infos about max rank/banned).
          this.playerInfo = []; // Clear first.
          res.Players.forEach((player) => {
            this.playerInfo[player.Login] = player;
          });

          this.records = res.Records;
          this.serverInfo.ServerMaxRank = res.ServerMaxRank;
          this.serverInfo.AllowedGameModes = res.AllowedGameModes;

          try {
            this.records = this.records.sort((a, b) => a.Best - b.Best);
          } catch (err) {
            this.app.log.warn('Dedimania: Sorting error, ', err);
          }

          return resolve(this.records);
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




  displayPersonalRecords () {
    Object.keys(this.players.list).forEach((login) => {
      let player = this.players.list[login];
      this.displayTextualRecord(player);
      this.displayRecordsWidget(player);
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
    if (this.records.length > 0) {
      record = this.records.filter(function (rec) {
        return rec.Login == player.login;
      });
    }

    if (record.length == 1) {
      record = record[0];
      var recordIndex = (this.records.indexOf(record) + 1);
      text = '$0f3Your current Dedimania Record is: $fff' + recordIndex + '$0f3. with a time of $fff' + this.app.util.times.stringTime(record.Best) + '$0f3.';
    }

    this.server.send().chat(text, {destination: player.login}).exec();
  }






  /**
   * Display records widget for player.
   *
   * @param player
   */
  displayRecordsWidget(player) {
    if(!this.widgetEnabled) return;

    var records = [];
    var index = 1;
    var y = -3;

    // Check if player has a record on this map.
    var record = this.records.filter(function (rec) { return rec.Login == player.login; });
    var hasRecord = !(record.length == 0 || (this.records.indexOf(record[0]) + 1) > this.recordlimit);

    // Input the top of the widget with the best records
    this.records.slice(0, this.widgetTopCount).forEach((record) => {
      records.push({
        index: index,
        score: this.app.util.times.stringTime(record.Best),
        nickname: record.NickName,
        y: y,
        marked: false,
        player: (record.Login == player.login),
        top_y: (y + 0.35),
        top_width: this.widgetWidth - 0.8,
        top_style: 'BgsPlayerCard',
        top_substyle: 'BgCardSystem',
        playericon_box_x: (this.widgetSettings.widget_x < 0) ? this.widgetSettings.width : -2,
        playericon_x: (this.widgetSettings.widget_x < 0) ? (this.widgetSettings.width + 0.2) : -1.8,
        playericon_box_y: (y + 0.35),
        playericon_y: (y + 0.15),
        playericon: (this.widgetSettings.widget_x < 0) ? 'ShowLeft2' : 'ShowRight2'
      });

      y = y - 1.8;
      index++;
    });

    var listEnd = (this.records.length > this.recordlimit) ? this.recordlimit : this.records.length;
    var beginSlice = 0;
    var endSlice = 0;
    if(!hasRecord) {
      // Has no record, display last records.
      beginSlice = (listEnd - (this.widgetEntries - this.widgetTopCount) + 1);
      if(beginSlice < this.widgetTopCount) {
        beginSlice = this.widgetTopCount;
      }
      endSlice = listEnd;
    } else {
      var recordIndex = (this.records.indexOf(record[0]) + 1);
      if(recordIndex <= this.widgetTopCount) {
        beginSlice = this.widgetTopCount;
        endSlice = (this.widgetEntries);
      } else {
        var indexToTop = recordIndex - this.widgetTopCount;
        var indexToEnd = listEnd - recordIndex;
        var sliceSpace = (this.widgetEntries - this.widgetTopCount);

        var topTest = Math.round(sliceSpace / 2);
        if (indexToTop >= topTest && indexToEnd >= (this.widgetEntries - topTest)) {
          // Enough records on both sides
          beginSlice = (recordIndex - topTest);
          endSlice = (recordIndex + (sliceSpace - topTest));
        } else if(indexToTop < topTest) {
          beginSlice = this.widgetTopCount;
          endSlice = this.widgetEntries;
        } else if(indexToEnd < (this.widgetEntries - topTest)) {
          beginSlice = (listEnd - (this.widgetEntries - this.widgetTopCount));
          endSlice = listEnd;
        }
      }
    }

    index = (beginSlice + 1);
    this.records.slice(beginSlice, endSlice).forEach((record) => {
      records.push({
        index: index,
        score: this.app.util.times.stringTime(record.Best),
        nickname: record.NickName,
        y: y,
        player: (record.Login == player.login),
        marked: (record.Login == player.login),
        top_y: (y + 0.35),
        top_width: this.widgetWidth - 0.8,
        top_style: 'BgsPlayerCard',
        top_substyle: 'BgCardSystem',
        playericon_box_x: (this.widgetSettings.widget_x < 0) ? this.widgetSettings.width : -2,
        playericon_x: (this.widgetSettings.widget_x < 0) ? (this.widgetSettings.width + 0.2) : -1.8,
        playericon_box_y: (y + 0.35),
        playericon_y: (y + 0.15),
        playericon: (this.widgetSettings.widget_x < 0) ? 'ShowLeft2' : 'ShowRight2'
      });

      y = y - 1.8;
      index++;
    });

    if(!hasRecord) {
      records.push({
        index: '-',
        score: '--:--.---',
        nickname: player.nickname,
        y: y,
        marked: false
      });
    }

    // Set records and send ManiaLink.
    return this.recordsWidget.player(player.login, {records: records}).update();
  }
};
