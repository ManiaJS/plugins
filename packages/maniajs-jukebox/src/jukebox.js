'use strict';



module.exports.default = class Jukebox {
  constructor (plugin) {
    this.plugin = plugin;
    this.app = plugin.app;

    this.jukebox = [];
  }

  endmap (params) {
    if (! this.jukebox.length)
      return;

    let map = this.jukebox.shift();

    this.plugin.server.send().custom('SetNextMapIdent', [map.uid]).exec().then(() => {
      this.plugin.server.send().chat(`$c70Next map will be $c70$<$fff${map.name}$>$c70 as jukeboxed by $c70$<$fff${map.jukeAuthor}$>$c70.`).exec();
    }).catch((err) => {
      console.error(err, err.stack);
    });
  }

  /**
   * Add a map to the jukebox. PushTop can be true to have it at the top.
   * @param {Map|string} mapEntry Map object (db) or UID string.
   * @param {Player} player Player object.
   * @param {boolean} [pushTop]
   */
  add (mapEntry, player, pushTop) {
    pushTop = pushTop || false;

    var promise;
    if (typeof mapEntry === 'string') {
      promise = this.app.models.Map.findOne({where: {
        uid: mapEntry
      }});
    } else {
      promise = Promise.resolve(mapEntry);
    }

    return promise.then((map) => {
      // TODO: Permission check.
      // TODO: Rate check.

      if (this._inJukebox (map)) {
        return Promise.reject(new Error('Map already in jukebox!'));
      }
      map.jukeAuthor = player.nickname;

      if (pushTop)
        this.jukebox.unshift(map);
      else
        this.jukebox.push(map);

      return Promise.resolve(map);
    });
  }

  /**
   * Remove map from jukebox.
   * @param {string} map Map UID.
   * @return {boolean}
   */
  remove (map) {
    let count = this.jukebox.length;
    this.jukebox = this.jukebox.filter((jukeMap) => {
      return jukeMap.uid !== map;
    });
    return this.jukebox.length !== count;
  }

  /**
   * Clear Jukebox.
   * @return {boolean}
   */
  clear () {
    this.jukebox = [];
    return true;
  }

  /**
   * List jukebox.
   * @param {Player} player
   * @param params
   */
  list (player, params) {
    let cols = [
      {
        name: 'Name',
        field: 'name',
        width: 100,
        level: 0
      },
      {
        name: 'Author',
        field: 'author',
        width: 40,
        level: 0
      },
      {
        name: 'Jukeboxed by',
        field: 'jukeAuthor',
        width: 40,
        level: 0
      },
      {
        name: '',
        field: 'canRemove',
        width: 5,
        button: true,
        event: 'remove'
      }
    ];
    let data = this.getListData(player);
    let list = this.app.ui.list('Maps on the server', player.login, cols, data);
    list.display();

    list.on('remove', (entry) => {
      if (this.remove (entry.entry.uid)) {
        this.plugin.server.send().chat(`$c70$<$fff${player.nickname}$>$c70 removed map $c70$<$fff${entry.entry.name}$>$c70 from the jukebox!`).exec();
        list.close();
        this.list(player, []);
      }
    });
  }

  getListData(player) {
    let data = [];
    this.jukebox.forEach((juke) => {
      let row = {
        uid: juke.uid,
        name: juke.name,
        author: juke.author,
        jukeAuthor: juke.jukeAuthor
      };
      if (juke.jukeAuthor === player.nickname || player.level > 1) row.canRemove = true;
      data.push(row);
    });
    return data;
  }

  /**
   * Check if map is already in jukebox.
   * @param map
   * @private
   * @returns {boolean}
   */
  _inJukebox (map) {
    return this.jukebox.filter((m) => map.uid === m.uid).length > 0;
  }
};
