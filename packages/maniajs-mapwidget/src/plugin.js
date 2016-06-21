'use strict';

var Package = require('./../package.json');
var path = require('path');

var Plugin = require('@maniajs/plugin').default;

/**
 * MapWidget Plugin.
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

    // Could be 'playing', 'podium' and 'inactive'.
    this.state = 'playing';

    // Plugin properties
    this.votes = null;
    this.plusVotes = 0;
    this.minVotes = 0;

    this.widgetEnabled = true;
    this.widgetWidth = 15.5;
    this.widgetHeight = 8.9;
    this.widgetX = 49.2;
    this.widgetY = 48.2;

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
      manialinkid: 'CurrentMap',
      title: 'Current Map',

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
      icon_substyle: 'Challenge',

      text_color: 'FFFF',

      mapname: '',
      author: '',
      author_time: ''
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
      this.server.on('map.begin', (params) => {
        this.state = 'playing';
        this.displayMapWidgetToAllPlayers();
      });

      // Will be when the podium is visible!
      this.server.on('match.end', (params) => {
        this.state = 'podium';
        this.displayMapWidgetToAllPlayers();
      });

      this.server.on('player.connect', (params) => {
        this.mapWidget.player (params.login, {});
        this.mapWidget.update();
      });

      // UI
      this.mapWidget = this.app.ui.build(this, 'mapwidget', 1);
      this.mapWidget.global(this.widgetSettings);
      this.displayMapWidgetToAllPlayers();

      resolve();
    });
  }

  /**
   * Displays the karma widget to all players.
   */
  displayMapWidgetToAllPlayers() {
    var mapPromise;

    if (this.state === 'playing') {
      this.widgetSettings.title = 'Current Map';
      mapPromise = this.server.send().custom('GetCurrentMapInfo').exec();
    } else if (this.state === 'podium') {
      this.widgetSettings.title = 'Next Map';
      mapPromise = this.server.send().custom('GetNextMapInfo').exec();
    } else {
      return;
    }
    mapPromise.then((map) => {
      this.widgetSettings.mapname = map.Name;
      this.widgetSettings.author = map.Author;
      
      if (this.app.config.config.server.game === 'shootmania') {
        this.widgetSettings.author_time = '';
      } else {
        this.widgetSettings.author_time = this.app.util.times.stringTime(map.AuthorTime);
      }

      this.mapWidget.global(this.widgetSettings).update();
    });
  }
};
