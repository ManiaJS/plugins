/**
 * Installation Utilities Class.
 */
'use strict';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as async from 'async';
import {exec} from 'child_process';
import colors from 'colors/safe';
import pkgFetcher from 'package-json';

/**
 * Installation Class.
 * @class Installation
 * @type {Installation}
 */
export default class Installation {
  location;
  pkg;
  npm;

  constructor (location) {
    this.location = path.resolve(location);

    if (! fs.existsSync(location)) {
      throw new Error('Location doesn\'t exists!');
    }
    if (! fs.existsSync(location + path.sep + 'package.json')) {
      throw new Error('Location given is no valid package folder.');
    }
    if (! fs.existsSync(location + path.sep + 'maniajs.js')) {
      throw new Error('Location has no maniajs.js file.');
    }

    // Try to load package.
    this.pkg = JSON.parse(fs.readFileSync(location + path.sep + 'package.json'));

    if (this.pkg.name !== 'maniajs-server') {
      throw new Error('Package in location given is invalid!');
    }
  }

  /**
   * Load NPM Package.
   * @returns {Promise}
   */
  load () {
    return Promise.resolve(this);
  }

  /**
   * Install Module in location.
   * @param {[{}|string]} modules
   * @returns {Promise}
   */
  install (modules) {
    return new Promise((resolve, reject) => {
      async.each(modules, (m, callback) => {
        var fetcher;
        if (typeof m === 'string') {
          // Recent version. Fetch current version.
          fetcher = pkgFetcher(m, 'latest');
        } else {
          if (m.version) {
            fetcher = pkgFetcher(m.name, m.version);
          } else {
            fetcher = pkgFetcher(m.name, 'latest');
          }
        }

        fetcher.catch((err) => callback(err));
        fetcher.then((pkg) => {
          var version = pkg.version;

          if (typeof m !== 'string' && typeof m.formatter === 'function') {
            version = m.formatter(version);
          }
          this.pkg.dependencies[pkg.name] = version;
          callback();
        });
      }, (err) => {
        if (err) return reject(err);

        // Save package.json to disk
        this.savePackage();

        // Right here we want to execute NPM.
        let process = exec('npm install', {
          cwd: this.location
        }, (err2, stdout, stderr) => {
          if (err2 || stderr) {
            return reject(err2 || new Error(stderr));
          }
          return resolve();
        });
        process.stdout.on('data', (msg) => {
          console.log(colors.grey(msg));
        });
      });
    });
  }


  savePackage () {
    fs.writeFileSync(this.location + path.sep + 'package.json', JSON.stringify(this.pkg, null, '  '), 'utf8');
  }
}
