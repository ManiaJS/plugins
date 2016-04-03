'use strict';

var Package = require('./../package.json');
var path = require('path');

var Plugin = require('@maniajs/plugin').default;

/**
 * Karma Plugin.
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
    this.votes = null;
    this.plusVotes = 0;
    this.minVotes = 0;

    this.widgetEnabled = true;
    this.widgetWidth = 15.5;
    this.widgetHeight = 11;
    this.widgetX = 49.2;
    this.widgetY = 39.2;

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
      manialinkid: 'Karma',
      actionid: 'OpenKarma',
      title: 'Map Karma',

      positiveaction: 'votePositive',
      negativeaction: 'voteNegative',

      width: this.widgetWidth,
      height: this.widgetHeight,
      column_height: (this.widgetHeight - 3.1),
      widget_x: this.widgetX,
      widget_y: this.widgetY,
      background_width: (this.widgetWidth - 0.2),
      background_height: (this.widgetHeight - 0.2),
      border_width: (this.widgetWidth + 0.4),
      border_height: (this.widgetHeight + 0.6),

      background_color: '3342',
      background_focus: '09F6',
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
      icon_style: 'Icons128x128_1',
      icon_substyle: 'NewTrack'
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
      // Event
      this.server.on('map.begin',
        (params) => this.loadVotes(params));

      this.server.on('player.connect', (params) => {
        let player = this.players.list[params.login];
        this.displayVotes(player);
        this.displayKarmaWidget(player);
      });

      this.server.command.on('whokarma', 'List of Karma Votes', (player) => this.displayList(player));

      // UI
      this.karmaWidget = this.app.ui.build(this, 'karmawidget', 1);
      this.karmaWidget.global(this.widgetSettings);
      this.karmaWidget.on('OpenKarma', (data) => {
        let player = this.players.list[data.login];
        this.displayList(player);
      });

      this.server.command.on('++', 0, (player, params) => this.votePositive(player, false));
      this.server.command.on('--', 0, (player, params) => this.voteNegative(player, false));
      this.server.on('player.chat', (params) => {
        let player = this.players.list[params.login];
        if(params.text == '++') {
          this.votePositive(player, false);
        } else if(params.text == '--') {
          this.voteNegative(player, false);
        }
      });

      this.karmaWidget.on('votePositive', (data) => {
        let player = this.players.list[data.login];
        this.votePositive(player, true);
      });

      this.karmaWidget.on('voteNegative', (data) => {
        let player = this.players.list[data.login];
        this.voteNegative(player, true);
      });

      this.loadVotes(this.maps.current).then(() => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Function will display the map karma based on the current map (does not use map input).
   *
   * @param map
   *
   * @returns {Promise}
   */
  loadVotes(map) {
    let Player = this.app.models.Player;

    return this.models.Karma.findAll({
      where: {
        MapId: this.maps.current.id
      },
      include: [Player]
    }).then((votes) => {
      this.votes = votes;
      this.plusVotes = 0;
      this.minVotes = 0;

      this.votes.forEach((vote) => {
        if(vote.score == 1) {
          this.plusVotes++;
        } else if(vote.score == -1) {
          this.minVotes++;
        }
      });

      Object.keys(this.players.list).forEach((login) => {
        let player = this.players.list[login];
        this.displayVotes(player);
        this.displayKarmaWidget(player);
      });
    });
  }

  /**
   * Display list of karma votes to the player.
   *
   * @param player
   */
  displayList(player) {
    let cols = [
      {
        name: 'Nickname',
        field: 'nickname',
        width: 120,
        level: 0
      },
      {
        name: 'Vote',
        field: 'vote',
        width: 40,
        level: 0
      }
    ];
    var data = [];
    var votes = this.votes.sort((a, b) => b.score - a.score);
    for (var vote = 0; vote < votes.length; vote++) {
      data.push({
        nickname: votes[vote].Player.nickname,
        vote: (votes[vote].score == 1) ? '++' : '--'
      });
    }

    let list = this.app.ui.list('Karma Votes on ' + this.maps.current.name, player.login, cols, data);
    list.display();
  }

  /**
   * Displays the current karma in the chat for the player.
   *
   * @param player
   */
  displayVotes(player) {
    var plusPercentage = parseFloat(((this.plusVotes/this.votes.length) * 100)).toFixed(1);
    if(isNaN(plusPercentage))
      plusPercentage = 0;

    var minPercentage = parseFloat(((this.minVotes/this.votes.length) * 100)).toFixed(1);
    if(isNaN(minPercentage))
      minPercentage = 0;

    var chatKarma = '$ff0Current map karma: $fff' + (this.plusVotes - this.minVotes);
    chatKarma += '$ff0 [$fff' + this.votes.length + '$ff0 votes, ++: $fff' + this.plusVotes + '$ff0 ($fff' + plusPercentage + '%$ff0)';
    chatKarma += ' --: $fff' + this.minVotes + '$ff0 ($fff' + minPercentage + '%$ff0)]';

    var playerVote = this.votes.filter(function (vote) {
      return vote.PlayerId == player.id;
    });

    if(playerVote.length == 1) {
      var vote = playerVote[0];

      chatKarma += ' {Your vote: $fff';
      if(vote.score == 1)
        chatKarma += '++';
      else if(vote.score == -1)
        chatKarma += '--';
      chatKarma += '$ff0}';
    } else {
      chatKarma += ' {Your vote: $fffnone$ff0}';
    }

    this.server.send().chat(chatKarma, {destination: player.login}).exec();
  }

  /**
   * Displays the karma widget to the player.
   *
   * @param player
   */
  displayKarmaWidget(player) {
    var votebars = [];
    if(this.votes.length > 0) {
      for(var i = 0; i < Math.round((this.plusVotes / this.votes.length) * 10); i++) {
        votebars.push({
          color: 'green',
          x: (1.5 + (i * 1.2))
        });
      }
      for(var i = Math.round((this.plusVotes / this.votes.length) * 10); i < 10; i++) {
        votebars.push({
          color: 'red',
          x: (1.5 + (i * 1.2))
        });
      }
    } else {
      for (var i = 0; i < 10; i++) {
        votebars.push({
          color: 'grey',
          x: (1.5 + (i * 1.2))
        });
      }
    }

    var currentKarma = (this.plusVotes - this.minVotes);
    var karma = (currentKarma < 0) ? '$f00' : '$0f0+';
    karma += currentKarma;

    var karmaPercentage = parseFloat(((this.plusVotes/this.votes.length) * 100)).toFixed(1);
    if(isNaN(karmaPercentage))
      karmaPercentage = 0;

    var widgetOptions = {
      votebars: votebars,
      positivevotes: this.plusVotes,
      negativevotes: this.minVotes,
      karmapercentage: karmaPercentage,
      karma: karma,
      positive: false,
      negative: false
    };

    var playerVote = this.votes.filter(function (vote) {
      return vote.PlayerId == player.id;
    });

    if(playerVote.length == 1) {
      var vote = playerVote[0];

      if(vote.score == 1)
        widgetOptions.positive = true;
      else if(vote.score == -1)
        widgetOptions.negative = true;
    }

    this.karmaWidget.player(player.login, widgetOptions).update();
  }

  /**
   * Lets the player vote ++ on the current map.
   *
   * @param player
   */
  votePositive(player, widget) {
    var playerVote = this.votes.filter(function (vote) {
      return vote.PlayerId == player.id;
    });

    var voteResult = '$ff0';
    if(playerVote.length == 1 && playerVote[0].score == 1) {
      if(widget) {
        voteResult += 'Removed your $fff++$ff0 vote!';
        this.votes.splice(this.votes.indexOf(playerVote[0]), 1);
        playerVote[0].destroy();
        this.plusVotes--;
      } else {
        voteResult += 'You already voted $fff++$ff0 on this map!';
      }
    } else if(playerVote.length == 1 && playerVote[0].score == -1) {
      voteResult += 'Succesfully changed your vote from $fff--$ff0 to $fff++$ff0!';
      playerVote[0].score = 1;
      playerVote[0].save();

      this.minVotes--;
      this.plusVotes++;
    } else {
      voteResult += 'Succesfully voted $fff++$ff0 on this map!';

      var newVote = this.models.Karma.build({
        score: 1,
        MapId: this.maps.current.id,
        PlayerId: player.id
      });

      newVote.save();
      newVote.Player = player;
      newVote.Map = this.maps.current;
      this.votes.push(newVote);
      this.plusVotes++;
    }

    this.server.send().chat(voteResult, {destination: player.login}).exec();

    if(!widget)
      this.displayVotes(player);

    Object.keys(this.players.list).forEach((login) => {
      let player = this.players.list[login];
      this.displayKarmaWidget(player);
    });
  }

  /**
   * Lets the player vote -- on the current map.
   *
   * @param player
   */
  voteNegative(player, widget) {
    var playerVote = this.votes.filter(function (vote) {
      return vote.PlayerId == player.id;
    });

    var voteResult = '$ff0';
    if(playerVote.length == 1 && playerVote[0].score == -1) {
      if(widget) {
        voteResult += 'Removed your $fff--$ff0 vote!';
        this.votes.splice(this.votes.indexOf(playerVote[0]), 1);
        playerVote[0].destroy();
        this.minVotes--;
      } else {
        voteResult += 'You already voted $fff--$ff0 on this map!';
      }
    } else if(playerVote.length == 1 && playerVote[0].score == 1) {
      voteResult += 'Succesfully changed your vote from $fff++$ff0 to $fff--$ff0!';
      playerVote[0].score = -1;
      playerVote[0].save();

      this.plusVotes--;
      this.minVotes++;
    } else {
      voteResult += 'Succesfully voted $fff--$ff0 on this map!';

      var newVote = this.models.Karma.build({
        score: -1,
        Map: this.maps.current,
        Player: player,
        MapId: this.maps.current.id,
        PlayerId: player.id
      });

      this.votes.push(newVote);
      newVote.save();
      this.minVotes++;
    }

    this.server.send().chat(voteResult, {destination: player.login}).exec();

    if(!widget)
      this.displayVotes(player);

    Object.keys(this.players.list).forEach((login) => {
      let player = this.players.list[login];
      this.displayKarmaWidget(player);
    });
  }
};
