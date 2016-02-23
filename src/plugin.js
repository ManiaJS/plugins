'use strict';

var Package = require('./../package.json');
var path = require('path');

var Plugin = require('maniajs-plugin').default;

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

      text_color: 'FFFF'
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
        Object.keys(this.players.list).forEach((login) => {
          let player = this.players.list[login];
          this.displayMapWidget(player);
        });
      });

      this.server.on('player.connect', (params) => {
        let player = this.players.list[params.login];
        this.displayMapWidget(player);
      });

      // UI
      this.mapWidget = this.app.ui.build(this, 'mapwidget', 1);
      this.mapWidget.global(this.widgetSettings);

      Object.keys(this.players.list).forEach((login) => {
        let player = this.players.list[login];
        this.displayMapWidget(player);
      });

      resolve();
    });
  }

  /**
   * Displays the karma widget to the player.
   *
   * @param player
   */
  displayMapWidget(player) {
    this.app.log.debug('Name: ' + this.maps.current.name + ', author: ' + this.maps.current.author + ', author time: ' + this.maps.current.author_time);
    
    var widgetOptions = {
      mapname: this.maps.current.name,
      author: this.maps.current.author,
      author_time: this.maps.current.author_time
    };
    this.mapWidget.player(player.login, widgetOptions).update();
  }
};
