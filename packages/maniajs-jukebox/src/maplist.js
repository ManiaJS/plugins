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

    if(!params.length) {
      Object.keys(this.plugin.maps.list).forEach((uid) => {
        let map = this.plugin.maps.list[uid];
        data.push({
          uid: map.uid,
          name: map.name,
          author: map.author,
          karma: 0
        });
      });
    } else {
      let command = params.shift();
      switch(command) {
        case 'help':
          return this.plugin.server.send().chat('$fffUsage: /list [$eee<author>$fff]', {destination: player.login}).exec();
          break;
        default:
          Object.keys(this.plugin.maps.list).forEach((uid) => {
            let map = this.plugin.maps.list[uid];
            if(map.author == command) {
              data.push({
                uid: map.uid,
                name: map.name,
                author: map.author,
                karma: 0
              });
            }
          });
          break;
      }
    }

    let promise;

    if(this.app.plugins.hasOwnProperty('@maniajs/plugin-karma')) {
      cols.push({
        name: 'Karma',
        field: 'karma',
        width: 20,
        level: 0,
        sort: true
      });

      let mapper = (map) => {
        return this.app.plugins['@maniajs/plugin-karma'].getMapKarma(this.plugin.maps.list[map.uid]).then((karma) => {
          map.karma = karma;
          return map;
        });
      }

      promise = Promise.all(data.map(mapper));
    } else {
      promise = Promise.resolve(data);
    }

    promise.then((data) => {
      let list = this.app.ui.list('Maps on the server', player.login, cols, data);
      list.display();
      list.on('jukebox', (map) => {
        // Add to jukebox.
        this.plugin.jukebox.add(map.entry.uid, player).then(() => {
          this.plugin.server.send().chat(`$c70$<$fff${player.nickname}$>$c70 added map $c70$<$fff${map.entry.name}$>$c70 to the jukebox!`).exec();
        }).catch((err) => {
          this.plugin.server.send().chat(`Error: ${err.message}`, {destination: player.login}).exec();
        });
      });

      list.on('searchAuthor', (map) => {
        // Display list for author.
        this.display(player, [map.entry.author]);
      });
    });    
  }
};
