/**
 * Dedimania Widget
 * @author Tom Valk <tomvalk@lt-box.info>
 * @date 06-03-16
 */
'use strict';

/**
 * Widget Logic.
 *
 * @class Widget
 * @type {Widget}
 *
 * @property {App} app
 * @property {Plugin} plugin
 * @property {Flow} flow
 */
module.exports.default = class Widget {

  constructor (parent) {
    this.plugin = parent;
    this.app    = {};
    this.flow   = {};

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
   * Called at init.
   */
  init(ui) {
    this.app = this.plugin.app;
    this.flow = this.plugin.flow;

    // Init widget UI component.
    this.recordsWidget = ui;
    this.recordsWidget.global(this.widgetSettings);
  }

  /**
   * Hide for all players.
   */
  hideAll() {
    if (!this.widgetEnabled) return;
    this.recordsWidget.hide();
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
    var record = this.flow.records.filter(function (rec) { return rec.Login == player.login; });
    var hasRecord = !(record.length == 0 || (this.flow.records.indexOf(record[0]) + 1) > this.plugin.recordlimit);

    // Input the top of the widget with the best records
    this.flow.records.slice(0, this.widgetTopCount).forEach((record) => {
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

    var listEnd = (this.flow.records.length > this.plugin.recordlimit) ? this.plugin.recordlimit : this.flow.records.length;
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
      var recordIndex = (this.flow.records.indexOf(record[0]) + 1);
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
    this.flow.records.slice(beginSlice, endSlice).forEach((record) => {
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
