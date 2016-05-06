'use strict';



module.exports.default = class Jukebox {
  constructor (plugin) {
    this.plugin = plugin;
    this.app = plugin.app;

    this.jukebox = [];
  }

  /**
   * Add a map to the jukebox. PushTop can be true to have it at the top.
   * @param {Map|string} mapEntry Map object (db) or UID string.
   * @param {boolean} [pushTop]
   */
  add (mapEntry, pushTop) {
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

      if (pushTop)
        this.jukebox.unshift(map);
      else
        this.jukebox.push(map);

      return Promise.resolve(map);
    });
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
