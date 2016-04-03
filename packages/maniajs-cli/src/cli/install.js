
'use strict';

import program from 'commander';

program
  .option('-f, --force', 'Force installation of package')
  .parse(process.argv);

let packages = program.args;

if (! packages.length) {
  console.error('No packages to install!');
  process.exit(1);
}

// TODO: Inspect if current folder is a maniajs initted dir!
console.log('Not yet implemented!');
