'use strict';



module.exports.default = class Jukebox {
  constructor (plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }
};
