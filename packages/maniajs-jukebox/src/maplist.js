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

    if(!params.length) {
      this.displayGeneral(player, cols);
    } else {
      let command = params.shift();
      switch(command) {
        case 'help':
          return this.plugin.server.send().chat('$fffUsage: /list [$eee<author>$fff]', {destination: player.login}).exec();
          break;
        case 'records':
          this.displayWithRecord(player, cols);
          break;
        default:
          this.displayByAuthor(player, cols, command);
          break;
      }
    }  
  }

  /**
   * Display general list (name, author, karma).
   * @param {Player} player
   * @param cols
   */
  displayGeneral(player, cols) {
    var data = [];
    Object.keys(this.plugin.maps.list).forEach((uid) => {
      let map = this.plugin.maps.list[uid];
      data.push({
        uid: map.uid,
        name: map.name,
        author: map.author
      });
    });

    this.displayIncludeKarma(data).then((result) => {
      cols.push({
        name: 'Karma',
        field: 'karma',
        width: 20,
        level: 0,
        sort: true
      });

      this.displayList(player, cols, result);
    });
  }

  /**
   * Display general list (name, author, karma) for maps by author.
   * @param {Player} player
   * @param cols
   * @param author
   */
  displayByAuthor(player, cols, author) {
    var data = [];
    Object.keys(this.plugin.maps.list).forEach((uid) => {
      let map = this.plugin.maps.list[uid];
      if(map.author.indexOf(author) > -1) {
        data.push({
          uid: map.uid,
          name: map.name,
          author: map.author
        });
      }
    });

    this.displayIncludeKarma(data).then((result) => {
      cols.push({
        name: 'Karma',
        field: 'karma',
        width: 20,
        level: 0,
        sort: true
      });

      this.displayList(player, cols, result);
    });
  }

  /**
   * Display list with local record (name, author, record) for all maps.
   * @param {Player} player
   * @param cols
   */
  displayWithRecord(player, cols) {
    var data = [];
    Object.keys(this.plugin.maps.list).forEach((uid) => {
      let map = this.plugin.maps.list[uid];
      data.push({
        uid: map.uid,
        name: map.name,
        author: map.author
      });
    });

    this.displayIncludeRecord(data).then((result) => {
      cols.push({
        name: 'Record',
        field: 'record',
        width: 50,
        level: 0,
        sort: true
      });

      this.displayList(player, cols, result);
    });
  }

  /**
   * Add karma to the list.
   * @param data
   *
   * returns {Promise}
   */
  displayIncludeKarma(data) {
    if(this.app.plugins.hasOwnProperty('@maniajs/plugin-karma')) {
      let mapper = (map) => {
        return this.app.plugins['@maniajs/plugin-karma'].getMapKarma(this.plugin.maps.list[map.uid]).then((karma) => {
          map.karma = karma;
          return map;
        });
      };

      return Promise.all(data.map(mapper));
    } else {
      return Promise.resolve(data);
    }
  }

  /**
   * Add local record to the list.
   * @param data
   *
   * returns {Promise}
   */
  displayIncludeRecord(data) {
    if(this.app.plugins.hasOwnProperty('@maniajs/plugin-localrecords')) {
      let mapper = (map) => {
        return this.app.plugins['@maniajs/plugin-localrecords'].getMapRecord(this.plugin.maps.list[map.uid]).then((record) => {
          map.record = (this.app.util.times.stringTime(record.score) + ' ($<' + record.Player.nickname + '$>)');
          return map;
        });
      }

      return Promise.all(data.map(mapper));
    } else {
      return Promise.resolve(data);
    }
  }

  /**
   * Set ManiaLink and display on screen.
   * @param {Player} player
   * @param cols
   * @param data
   */
  displayList(player, cols, data) {
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
  }
};
