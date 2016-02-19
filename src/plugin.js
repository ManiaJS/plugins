'use strict';

import * as Package from './../package.json';
import * as path from 'path';

import Plugin from 'maniajs-plugin';

/**
 * Karma Plugin.
 */
export default class extends Plugin {

  constructor() {
    super();

    // Set the package stuff into the plugin context.
    this.name = Package.name;
    this.version = Package.version;
    this.directory = __dirname;

    // Add dependencies, enter module full id's (mostly npm package names) here.
    this.dependencies = [];

    // Plugin properties
    this.votes = null;
    this.currentScore = 0;
    this.plusVotes = 0;
    this.minVotes = 0;
  }

  /**
   * Init will be run once the plugin can register everything at the core.
   * From this point the {this.app} and all other injected variables are available.
   *
   * @return {Promise} The init should ALWAYS return a promise, the core will wait until the promise has been resolved!
   */
  init() {
    return new Promise((resolve, reject) => {
      // Event
      this.server.on('map.begin',
        (params) => this.loadVotes(params));

      this.server.command.on('skip', 1, (player, params) => {
        this.server.send().chat("$fffSkipping map...").exec();
        this.server.send().skip().exec();
      });

      this.loadVotes(this.maps.current).then(() => {
        resolve();
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * Function will display the map karma based on the current map (does not use map input).
   *
   * @param map
   *
   * @returns {Promise}
   */
  loadVotes(map) {
    let Player = this.app.models.Player;

    return this.models.Karma.findAll({
      where: {
        MapId: this.maps.current.id
      },
      include: [Player]
    }).then((votes) => {
      this.votes = votes;

      this.votes.forEach((vote) => {
        if(vote.score == 1) {
          this.plusVotes++;
          this.currentScore++;
        } else if(vote.score == -1) {
          this.minVotes++;
          this.currentScore--;
        }
      });

      Object.keys(this.players.list).forEach((login) => {
        let player = this.players.list[login];
        this.displayVotes(player);
      });
    });
  }

  /**
   * Displays the current karma in the chat for the player.
   *
   * @param player
   */
  displayVotes(player) {
    var chatKarma = '$ff0Current map karma: $fff' + this.currentScore;
    chatKarma += '$ff0 [++: $fff' + this.plusVotes + '$ff0 ($fff' + Math.round(((this.plusVotes/this.votes.length) * 100)) + '$ff0)';
    chatKarma += ' --: $fff' + this.minVotes + '$ff0 ($fff' + Math.round(((this.minVotes/this.votes.length) * 100)) + '$ff0)]';

    var playerVote = this.votes.filter(function (vote) {
      return vote.PlayerId == player.id;
    });

    if(playerVote.length == 1) {
      var vote = playerVote[0];

      chatKarma += ' {Your vote: $fff';
      if(vote.score == 1)
        chatKarma += '++';
      else if(vote.score == -1)
        chatKarma += '--';
      chatKarma += '$ff0}';
    }

    this.server.send().chat(chatKarma, {destination: player.login}).exec();
  }
}
