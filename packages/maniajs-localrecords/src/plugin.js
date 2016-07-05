'use strict';

var Package = require('./../package.json');
var path    = require('path');

var async   = require('async');

var Plugin  = require('@maniajs/plugin').default;

/**
 * LocalRecords Plugin.
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
    this.records = null;
    this.runs = [];

    this.recordlimit = 100;
    this.displaylimit = 50;
    this.chatdisplay = true;
    this.chatannounce = true;

    this.widgetEnabled = true;
    this.widgetEntries = 16;
    this.widgetTopCount = 3;
    this.widgetWidth = 15.5;
    this.widgetHeight = ((1.8 * this.widgetEntries) + 3.2);
    this.widgetX = 49.2;
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
      manialinkid: 'LocalRecords',
      actionid: 'OpenLocalRecords',
      title: 'Local Records',

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
      if(this.config) {
        this.setupConfig();
      }

      // UI
      this.recordsWidget = this.app.ui.build(this, 'recordswidget', 1);
      this.recordsWidget.global(this.widgetSettings);
      this.recordsWidget.on('OpenLocalRecords', (data) => {
        let player = this.players.list[data.login];
        this.displayList(player);
      });

      // Event
      this.server.on('map.begin',
        (params) => this.beginMap(params));

      this.server.on('player.connect', (params) => {
        let player = this.players.list[params.login];
        this.playerRecord(player);
        this.displayRecordsWidget(player);
      });

      this.server.on('trackmania.player.finish',
        (params) => this.playerFinish(params));

      this.server.on('trackmania.player.checkpoint',
        (params) => this.playerCheckpoint(params));

      this.server.command.on('records', 'List of Local Records', (player) => this.displayList(player));

      this.loadRecords(this.maps.current).then(() => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Set up all configuration options.
   */
  setupConfig() {
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

    if(this.config.hasOwnProperty('widgetenabled' && this.config.widgetenabled != '')) {
      this.widgetEnabled = this.config.widgetenabled;
    }

    if(this.config.hasOwnProperty('widgetentries') && this.config.widgetentries != '') {
      this.widgetEntries = this.config.widgetentries;
      this.widgetHeight = ((1.8 * this.widgetEntries) + 3.2);
    }

    if(this.config.hasOwnProperty('widgettopcount') && this.config.widgettopcount != '') {
      this.widgetTopCount = this.config.widgettopcount;
    }

    if(this.config.hasOwnProperty('widgetwidth') && this.config.widgetwidth != '') {
      this.widgetWidth = this.config.widgetwidth;
    }

    if(this.config.hasOwnProperty('widgetx') && this.config.widgetx != '') {
      this.widgetX = this.config.widgetx;
    }

    if(this.config.hasOwnProperty('widgety') && this.config.widgety != '') {
      this.widgetY = this.config.widgety;
    }
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
          if(this.records.length < this.recordlimit) {
            localRecords += ' (' + this.records.length + '): ';
          }
          else {
            localRecords += ' (' + this.recordlimit + '): ';
          }

          for (var recordPos = 0; (recordPos < 10 && recordPos < this.records.length && recordPos < this.recordlimit); recordPos++) {
            localRecords += '$fff' + (recordPos + 1) + '$39f. $<$fff' + this.records[recordPos].Player.nickname + '$>$39f [$fff' + this.app.util.times.stringTime(this.records[recordPos].score) + '$39f] ';
          }
        } else {
          localRecords += ': $fffno records yet.';
        }

        this.server.send().chat(localRecords).exec();

        Object.keys(this.players.list).forEach((login) => {
          let player = this.players.list[login];
          this.playerRecord(player);
        });

        Object.keys(this.players.list).forEach((login) => {
          let player = this.players.list[login];
          this.displayRecordsWidget(player);
        });
      }
    });
  }

  /**
   * Function will return the local record for map.
   *
   * @param map
   *
   * @returns {Promise}
   */
  getMapRecord(map) {
    let Player = this.app.models.Player;

    return this.models.LocalRecord.findOne({
      where: {
        MapId: map.id
      },
      order: [
        ['score', 'ASC']
      ],
      include: [Player]
    });
  }

  /**
   * Function will return the personal record for map.
   *
   * @param map
   * @param player
   *
   * @returns {Promise}
   */
  getPersonalMapRecord(map, player) {
    let Player = this.app.models.Player;

    return this.models.LocalRecord.findOne({
      where: {
        MapId: map.id,
        PlayerId: player.id
      },
      include: [Player]
    });
  }

  /**
   * Displays the local record for the player.
   *
   * @param player
   */
  playerRecord(player) {
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

    this.server.send().chat(text, {destination: player.login}).exec();
  }

  /**
   * Displays the records list to the player.
   *
   * @param player
   */
  displayList(player) {
    let cols = [
      {
        name: '#',
        field: 'index',
        width: 10,
        level: 0
      },
      {
        name: 'Nickname',
        field: 'nickname',
        width: 120,
        level: 0
      },
      {
        name: 'Time',
        field: 'time',
        width: 40,
        level: 0
      }
    ];
    var data = [];
    for (var recordPos = 0; (recordPos < this.records.length && recordPos < this.recordlimit); recordPos++) {
      data.push({
        index: (recordPos + 1),
        nickname: this.records[recordPos].Player.nickname,
        time: this.app.util.times.stringTime(this.records[recordPos].score)
      });
    }

    let list = this.app.ui.list('Local Records on ' + this.maps.current.name, player.login, cols, data);
    list.display();
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
    var playerRecord = this.records.filter(function (rec) { return rec.PlayerId == player.id; });
    var hasRecord = !(playerRecord.length == 0 || (this.records.indexOf(playerRecord[0]) + 1) > this.recordlimit);

    // Input the top of the widget with the best records
    this.records.slice(0, this.widgetTopCount).forEach((record) => {
      records.push({
        index: index,
        score: this.app.util.times.stringTime(record.score),
        scorecolor: (record.Player.login == player.login) ? '0F3F' : 'FF0F',
        nickname: record.Player.nickname,
        y: y,
        marked: false,
        player: (record.Player.login == player.login),
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
      var recordIndex = (this.records.indexOf(playerRecord[0]) + 1);
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
      var scorecolor = 'FFFF';
      if(!hasRecord) {
        scorecolor = 'F00F';
      } else {
        if(record.Player.login == player.login) {
          scorecolor = '0F3F';
        } else {
          if(record.score < playerRecord[0].score) {
            scorecolor = 'F00F';
          } else {
            scorecolor = '888F';
          }
        }
      }

      records.push({
        index: index,
        score: this.app.util.times.stringTime(record.score),
        scorecolor: scorecolor,
        nickname: record.Player.nickname,
        y: y,
        player: (record.Player.login == player.login),
        marked: (record.Player.login == player.login),
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
        scorecolor: 'FFFF',
        nickname: player.nickname,
        y: y,
        marked: false
      });
    }

    // Set records and send ManiaLink.
    return this.recordsWidget.player(player.login, {records: records}).update();
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
      var updateWidget = false;

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

            updateWidget = true;

            if(newIndex <= this.displaylimit)
              this.server.send().chat(improvedRecordText).exec();
            else if(newIndex <= this.recordlimit)
              this.server.send().chat(improvedRecordText, {destination: login}).exec();
          }
        } else if(time == record[0].score) {
          if(this.chatannounce) {
            var equalledIndex = (this.records.indexOf(record[0]) + 1);
            var equalledRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 equalled his/her $fff' + equalledIndex + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(record[0].score) + '$0f3...';

            updateWidget = true;

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
          MapId: this.maps.current.id,
          PlayerId: player.id
        });
        newRecord.checkpoints = this.runs[login]? this.runs[login] : '';

        this.records.push(newRecord);
        newRecord.Player = player;
        this.records = this.records.sort((a, b) => a.score - b.score);

        if(this.chatannounce) {
          var newRecordIndex = (this.records.indexOf(newRecord) + 1);
          var newRecordText = '$0f3$<$fff' + player.nickname + '$>$0f3 drove the $fff' + newRecordIndex + '$0f3. Local Record, with a time of $fff' + this.app.util.times.stringTime(newRecord.score) + '$0f3!';

          if(newRecordIndex <= this.displaylimit)
            this.server.send().chat(newRecordText).exec();
          else if(newRecordIndex <= this.recordlimit)
            this.server.send().chat(newRecordText, {destination: login}).exec();
        }

        updateWidget = true;
        newRecord.save();
      }

      if(updateWidget) {
        console.log('Update each...');
        async.each(Object.keys(this.players.list), (login, callback) => {
          let player = this.players.list[login];
          this.displayRecordsWidget(player)
            .then(() => callback())
            .catch((err) => callback(err));
        }, (err) => {
          console.log('Update DONE!');
        });
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
};
