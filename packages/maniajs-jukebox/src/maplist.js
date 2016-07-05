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
        width: 100,
        level: 0,
        sort: true,
        event: 'jukebox'
      },
      {
        name: 'Author',
        field: 'author',
        width: 30,
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
          karma: 0,
          record: 0
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
                karma: 0,
                record: 0
              });
            }
          });
          break;
      }
    }

    let karmaPromise;
    let startTime = Date.now();
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

      karmaPromise = Promise.all(data.map(mapper));
    } else {
      karmaPromise = Promise.resolve(data);
    }

    let recordPromise;
    if(this.app.plugins.hasOwnProperty('@maniajs/plugin-localrecords')) {
      cols.push({
        name: 'Record',
        field: 'record',
        width: 50,
        level: 0,
        sort: true
      });

      let mapper = (map) => {
        return this.app.plugins['@maniajs/plugin-localrecords'].getMapRecord(this.plugin.maps.list[map.uid]).then((record) => {
          map.record = (this.app.util.times.stringTime(record.score) + ' ($<' + record.Player.nickname + '$>)');
          return map;
        });
      }

      recordPromise = Promise.all(data.map(mapper));
    } else {
      recordPromise = Promise.resolve(data);
    }

    Promise.all([karmaPromise, recordPromise]).then(() => {
      let endTime = Date.now();

      console.log('Start: ' + startTime + ', end: ' + endTime + ' => difference: ' + (endTime - startTime));

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
