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
          return this.plugin.server.send().chat('$fffUsage: /list [$eee<author>, karma <+, -, #>, records, personal, nofinish, best, worst$fff]', {destination: player.login}).exec();
          break;
        case 'karma':
          let karma = params.shift();
          this.displayByKarma(player, cols, karma);
          break;
        case 'personal':
          this.displayWithPersonalRecord(player, cols, 'personal');
          break;
        case 'nofinish':
          this.displayWithPersonalRecord(player, cols, 'nofinish');
          break;
        case 'best':
          this.displayWithPersonalRecord(player, cols, 'best');
          break;
        case 'worst':
          this.displayWithPersonalRecord(player, cols, 'worst');
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

      this.displayList('Maps on the server', player, cols, result);
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

      this.displayList('Maps on the server by ' + author, player, cols, result);
    });
  }

  /**
   * Display general list (name, author, karma) by karma.
   * @param {Player} player
   * @param cols
   * @param karma
   */
  displayByKarma(player, cols, karma) {
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

      let titleAddition;

      if(karma == undefined || karma == '+' || karma == '++') {
        data = result.sort((a, b) => b.karma - a.karma);
        titleAddition = 'ordered by karma (DESC)';
      } else if(karma == '-' || karma == '--') {
        data = result.sort((a, b) => a.karma - b.karma);
        titleAddition = 'ordered by karma (ASC)';
      } else if(karma < 0) {
        data = result.filter((a) => a.karma <= karma);
        data = data.sort((a, b) => a.karma - b.karma);
        titleAddition = 'with karma <= ' + karma;
      } else if(karma >= 0) {
        data = result.filter((a) => a.karma >= karma);
        data = data.sort((a, b) => b.karma - a.karma);
        titleAddition = 'with karma >= ' + karma;
      }

      this.displayList('Maps on the server ' + titleAddition, player, cols, data);
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

      this.displayList('Maps on the server with local record', player, cols, result);
    });
  }

  /**
   * Display list with personal record (name, author, record) for all maps.
   * @param {Player} player
   * @param cols
   */
  displayWithPersonalRecord(player, cols, command) {
    var data = [];
    Object.keys(this.plugin.maps.list).forEach((uid) => {
      let map = this.plugin.maps.list[uid];
      data.push({
        uid: map.uid,
        name: map.name,
        author: map.author
      });
    });

    this.displayIncludePersonalRecord(data, player).then((result) => {
      let title;
      if(command == 'nofinish') {
        data = result.filter((a) => a.personalrecord == 'none');
        title = 'Maps on the server with no personal time';
      } else {
        cols.push({
          name: 'Personal Record',
          field: 'personalrecord',
          width: 50,
          level: 0,
          sort: true
        });

        data = result.filter((a) => a.personalrecord != 'none');

        if(command == 'personal') {
          title = 'Maps on the server with personal record';
        } else if(command == 'best') {
          data = data.sort((a, b) => { 
            if(a.personalrank != null && b.personalrank != null)
              return a.personalrank - b.personalrank;
            if(a.personalrank == null)
              return 1;
            if(b.personalrank == null)
              return -1;
          });
          title = 'Maps on the server with personal record (best)';
        } else if(command == 'worst') {
          data = data.sort((a, b) => { 
            if(a.personalrank != null && b.personalrank != null)
              return b.personalrank - a.personalrank;
            if(b.personalrank == null)
              return 1;
            if(a.personalrank == null)
              return -1;
          });
          title = 'Maps on the server with personal record (worst)';
        }
      }

      this.displayList(title, player, cols, data);
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
   * Add local record to the list.
   * @param data
   *
   * returns {Promise}
   */
  displayIncludePersonalRecord(data, player) {
    if(this.app.plugins.hasOwnProperty('@maniajs/plugin-localrecords')) {
      let mapper = (map) => {
        return this.app.plugins['@maniajs/plugin-localrecords'].getPersonalMapRecord(this.plugin.maps.list[map.uid], player).then((record) => {
          map.personalrecord = this.app.util.times.stringTime(record.score);
          map.personalrank = record.rank;

          if(record.rank != null) {
           map.personalrecord += ' (' + record.rank + ')';
          }
          return map;
        }).catch(() => {
          map.personalrecord = 'none';
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
   * @param title
   * @param {Player} player
   * @param cols
   * @param data
   */
  displayList(title, player, cols, data) {
    let list = this.app.ui.list(title, player.login, cols, data);
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
