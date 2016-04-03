
'use strict';

import program from 'commander';

import colors from 'colors/safe';
import stringFormat from 'string-template';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import semverRegex from 'semver-regex';

import Installation from './../installation';
import {plugins as defaultPlugins} from './../../template/default-plugins';

// Start CLI tool (commanderjs).
program
  .option('--install-version <version>', 'install custom ManiaJS version.')
  .parse(process.argv);

let versionToInstall = program.installVersion || null;
let folder = path.resolve(program.args.length ? program.args[0] : __dirname + '/');
let templateFolder = path.resolve(__dirname + '/../../template/');

// Check folder (if not exists, also okay, will create).
if (fs.existsSync(folder) && fs.readdirSync(folder).filter((f) => ! /^\..*/.test(f)).length !== 0) {
  console.log(colors.red('Error: Folder provided has already contents inside!'));
  process.exit(1);
}

function status (text) {
  console.log(colors.yellow.bold('->') + colors.white.bold(': ') + colors.green(text));
}

status('Preparing directory...');

if (! fs.existsSync(folder)) {
  try {
    fs.mkdirSync(folder);
  } catch (err) {
    console.log(colors.red('Error: Error when creating the folder. We can only make a subfolder of existing folder!'));
    process.exit(1);
  }
}

// Inform user and ask for keystroke to continue.
status('We are going to ask you a few questions about the setup.');
console.log();

var questions = [

  // MP Server Related.
  {
    type: 'list',
    name: 'game',
    message: 'Please select the game of the server',
    default: 'TrackMania',
    choices: ['TrackMania','ShootMania']
  },
  {
    type: 'input',
    name: 'serverHost',
    default: 'localhost',
    message: '[MP Server] What is the hostname of the dedicated server?',
    validate(input) {return input.length > 1 ? true : 'Should be valid hostname or IP address!';}
  },
  {
    type: 'input',
    name: 'serverPort',
    default: '5000',
    message: '[MP Server] What is the XML-RPC port of the dedicated server?',
    filter(input) {return parseInt(input);},
    validate(input) {return isNaN(parseInt(input)) || parseInt(input) < 1024 ? 'Should be a valid numeric port number and above 1024!' : true;}
  },
  {
    type: 'input',
    name: 'serverUser',
    default: 'SuperAdmin',
    message: '[MP Server] What is the Super Admin username?',
    validate(input) {return input.length > 1 ? true : 'Should be a valid username';}
  },
  {
    type: 'password',
    name: 'serverPassword',
    default: 'SuperAdmin',
    message: '[MP Server] What is the Super Admin password?',
    validate(input) {return input.length ? true : 'Should be a valid password';}
  },

  // Database Related.
  {
    type: 'list',
    name: 'dbType',
    default: 'MySQL',
    message: '[DB] Select your database engine to use',
    choices: [
      'MySQL',
      'MariaDB',
      'SQLite',
      new inquirer.Separator(),
      'Postgres',
      'MSSQL'
    ]
  },
  {
    type: 'input',
    name: 'dbName',
    default: 'maniajs',
    message: '[DB] Please enter the database/schema name (should be created already without tables)',
    validate(input) {return input.length ? true : 'Database name should be valid!';}
  },

  // DB !== sqlite
  {
    type: 'input',
    name: 'dbHost',
    default: 'localhost',
    message: '[DB] Please enter the database host',
    validate(input) {return input.length ? true : 'Database host should be valid!';},
    when(answers) {
      return answers.dbType && (answers.dbType === 'MySQL' || answers.dbType === 'MariaDB' || answers.dbType === 'Postgres' || answers.dbType === 'MSSQL');
    }
  },
  {
    type: 'input',
    name: 'dbPort',
    default: '3306',
    message: '[DB] Please enter the database port',
    filter(input) {return parseInt(input);},
    validate(input) {return isNaN(parseInt(input)) ? 'Should be a valid numeric port number and above 1024!' : true;},
    when(answers) {
      return answers.dbType && (answers.dbType === 'MySQL' || answers.dbType === 'MariaDB' || answers.dbType === 'Postgres' || answers.dbType === 'MSSQL');
    }
  },

  {
    type: 'input',
    name: 'dbUser',
    message: '[DB] Please enter the database user',
    validate(input) {return input.length ? true : 'User should be valid!';},
    when(answers) {
      return answers.dbType && (answers.dbType === 'MySQL' || answers.dbType === 'MariaDB' || answers.dbType === 'Postgres' || answers.dbType === 'MSSQL');
    }
  },
  {
    type: 'password',
    name: 'dbPass',
    default: '',
    message: '[DB] Please enter the database users password (or enter for none)',
    when(answers) {
      return answers.dbType && (answers.dbType === 'MySQL' || answers.dbType === 'MariaDB' || answers.dbType === 'Postgres' || answers.dbType === 'MSSQL');
    }
  },

  // DB == sqlite
  {
    type: 'input',
    name: 'dbStorage',
    default: './database.sqlite',
    message: '[DB] Location of database file (relative to installation directory or absolute)',
    validate(input) {
      return fs.existsSync(path.dirname(input)) && input.endsWith('.sqlite') ? true : 'Location of provided file should exists and should be a .sqlite file!';
    },
    when(answers) {return answers.dbType && answers.dbType === 'SQLite';}
  },


  // MasterAdmin
  {
    type: 'input',
    name: 'masterAdmin',
    message: 'Please enter your ManiaPlanet Player Login to give MasterAdmin rights to',
    validate(input) {
      return input.length ? true : 'You must provide your login in order to control ManiaJS at first boot!';
    }
  },


  // Default plugin set?
  {
    type: 'confirm',
    name: 'plugins',
    default: true,
    message: 'Enable the default plugins?'
  }
];

inquirer.prompt(questions, (answers) => {
  answers.dbType = answers.dbType.toLowerCase();
  answers.game = answers.game.toLowerCase();
  answers.dbStorage = answers.dbStorage || '';
  answers.dbHost = answers.dbHost || '';
  answers.dbPort = answers.dbPort || 3306;
  answers.dbUser = answers.dbUser || '';
  answers.dbPass = answers.dbPass || '';

  status('Writing configuration file...');
  let configTemplate = fs.readFileSync(templateFolder + '/config-' + (answers.plugins ? 'plugins' : 'noplugins') + '.yaml', 'utf8');
  let config = stringFormat(configTemplate, answers);
  fs.writeFileSync(folder + '/' + 'config.yaml', config, 'utf8');
  console.log();


  status('Installing ManiaJS...');
  fs.copySync(templateFolder + '/maniajs.js', folder + '/maniajs.js');
  fs.copySync(templateFolder + '/package.json', folder + '/package.json');


  function mjsFormatter(v) {
    let original = semverRegex().exec(v)[0];
    let p = original.split('.');
    if (p.length === 3) {
      p[1] = 'x';
      p[2] = 'x';
    }
    let nw = p.join('.');
    return v.replace(original, nw);
  }

  function pluginFormatter(v) {
    let original = semverRegex().exec(v)[0];
    let p = original.split('.');
    if (p.length === 3) {
      p[2] = 'x';
    } else if (p.length === 2) {
      p[1] = 'x';
    }
    let nw = p.join('.');
    return v.replace(original, nw);
  }

  let pkg = JSON.parse(fs.readFileSync(folder + '/package.json', 'utf8'));
  let installation = new Installation(folder);
  installation.load().then(() => {

    return installation.install([
      {
        name: 'maniajs', version: versionToInstall || 'latest', formatter: function (v) {
        return mjsFormatter(v);
      }
      }]);
  }).then((data) => {

    status('Installing plugins...');

    if (answers.plugins) {
      var install = [];
      Object.keys(defaultPlugins).forEach((pluginName) => {
        let version = defaultPlugins[pluginName];
        install.push({
          name: pluginName, version: version, formatter: function (v) {
            return pluginFormatter(v);
          }
        });
      });
      return installation.install(install);
    } else {
      return Promise.resolve(false);
    }
  }).then((plgs) => {
    status('Init completed!');
    process.exit(0);

  }).catch((err) => {
    console.log(colors.red('Error: Error with executing npm tasks. Details:'));
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  });
});
