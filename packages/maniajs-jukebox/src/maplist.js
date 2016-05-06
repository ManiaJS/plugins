'use strict';

module.exports.default = class Maplist {
  constructor (plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  /**
   * Display List for player with optional parameters.
   * @param {Player} player
   * @param params
   */
  display (player, params) {
    let cols = [
      {
        name: 'Name',
        field: 'name',
        width: 120,
        level: 0,
        sort: true,
        event: 'jukebox'
      },
      {
        name: 'Author',
        field: 'author',
        width: 40,
        level: 0,
        sort: true,
        event: 'searchAuthor'
      }
    ];
    var data = [];
    Object.keys(this.plugin.maps.list).forEach((uid) => {
      let map = this.plugin.maps.list[uid];
      data.push({
        name: map.name,
        author: map.author
      });
    });

    let list = this.app.ui.list('Maps on the server', player.login, cols, data);
    list.display();
    list.on('jukebox', (map) => {
      console.log('jukebox map: ', map);
    });
  }
};
