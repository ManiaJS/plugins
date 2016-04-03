/**
 * ADMIN COMMANDS - PLAYER(S)
 */
'use strict';


/**
 * Player Commands.
 *
 * @class
 */
module.exports.default = class {
  constructor (plugin) {
    this.plugin = plugin;
  }

  /**
   * Register all the player commands.
   *
   * @param {object}   manager
   * @param {function} manager.on
   */
  register (manager) {

    /**
     * /admin players
     * Full player list, of the well known players (from database).
     */
    manager.on('players', {
      admin: true,
      level: 1,
      text: 'Display list with all known players of the server.'
    }, (player, params) => this._playerlist(player, params));

    /**
     * /admin kick [login/id from /admin players]
     */
    manager.on('kick', {
      admin: true,
      level: 1,
      text: 'Kick player by login, or by id in a list.'
    }, (player, params) => this._kick(player, params));


    //TODO
    manager.on('ban', {
      admin: true,
      level: 2,
      text: 'Ban a player with login or by id from /admin list'
    }, (player, params) => this._ban(player, params));

    manager.on('unban', {
      admin: true,
      level: 2,
      text: 'Unban a player with login or by id from /admin list'
    }, (player, params) => this._unban(player, params));

    manager.on('forcespec', {
      admin: true,
      level: 1,
      text: 'Force player with login to spectator.'
    }, (player, params) => this._forcespec(player, params));

    manager.on('forceplay', {
      admin: true,
      level: 1,
      text: 'Force player with login to play.'
    }, (player, params) => this._forceplay(player, params));

    manager.on('mute', {
      admin: true,
      level: 1,
      text: 'Mute player, this will block the player from using the chat and several commands.'
    }, (player, params) => this._mute(player, params));

    manager.on('unmute', {
      admin: true,
      level: 1,
      text: 'Unmute player.'
    }, (player, params) => this._unmute(player, params));

    manager.on('addfake', {
      admin: true,
      level: 3,
      text: 'Add fake players (bots).'
    }, (player, params) => this._addfake(player, params));

    manager.on('removefake', {
      admin: true,
      level: 3,
      text: 'Remove fake player, /admin removefake [login] or ignore the login, and disconnect all fake players.'
    }, (player, params) => this._removefake(player, params));


    manager.on('balance', {
      admin: true,
      level: 1,
      text: 'Force the autobalance to balance the teams.'
    }, (player, params) => this._balance(player, params));
  }


  /**
   * /admin players
   *
   * @param player
   * @param params
   * @private
   */
  _playerlist (player, params) {
    let login = player.login;

    let cols = [
      {
        name: 'ID',
        field: 'id',
        width: 30
      },
      {
        name: 'Nickname',
        field: 'nickname',
        width: 100
      },
      {
        name: 'Login',
        field: 'login',
        width: 70
      },
      {
        name: '',
        field: false,
        width: 10,
        button: true,
        style: 'Icons64x64_1',
        substyle: 'Check',
        event: 'ban'
      }// TODO: Add more cols for managing player.
    ];

    var data = [];
    this.plugin.app.models['Player'].findAll().then((players) => {
      if (! players) {
        return;
      }

      players.forEach((p) => {
        data.push({
          id: p.get('id'),
          nickname: p.get('nickname'),
          login: p.get('login')
        });
      });

      let list = this.plugin.app.ui.list('All Known Players', player.login, cols, data);

      // TODO: Add actions to the list events.

      list.display();
    });
  }


  /**
   * /admin kick [login/id from list]
   *
   * @param player
   * @param params
   * @private
   */
  _kick (player, params) {
    if (params.length === 0) {
      return this.plugin.server.send().chat('$F66Syntax Error:$z $fff$n/admin kick [login/id]$z Login or ID from /players!', {destination: player.login}).exec();
    }

    let login = params[0];
    let id =    parseInt(params[0]);

    let reason = params[1] || 'no reason given';

    // Try to kick by login first.
    if (this.plugin.players.list.hasOwnProperty(login) && this.plugin.players.list[login].info) {
      this.plugin.server.send().custom('Kick', [login, reason]).exec().then(() => {
        return this.plugin.server.send().chat('$5A0Player \'' + this.plugin.players.list[login].nickname + '\'$z$5A0 has been kicked. \'' + reason + '\'').exec();
      });
    } else {
      return this.plugin.server.send().chat('$F66Player with login \'' + login + '\' is not found, make sure the player is known on the server.', {destination: player.login}).exec();
    }

    // TODO: Kick by ID from list.
  }


  /**
   * Connect Fake Player(s).
   *
   * @param player
   * @param params
   * @returns {*|Array|{index: number, input: string}}
   * @private
   */
  _addfake (player, params) {
    if (params.length === 0) {
      return this.plugin.server.send().chat('$F66Syntax Error:$z $fff$n/admin addfake [number of fakes]$z', {destination: player.login}).exec();
    }

    let number = parseInt(params[0]);

    // Connect players (* number).
    for (var i = 0; i < number; i++) {
      this.plugin.server.send().custom('ConnectFakePlayer').exec();
    }
  }

  /**
   * Disconnect all fake players.
   *
   * @param player
   * @param params
   * @private
   */
  _removefake (player, params) {
    this.plugin.server.send().custom('DisconnectFakePlayer',['*']).exec();
  }
};
