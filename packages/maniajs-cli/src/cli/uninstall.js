
'use strict';

import program from 'commander';

program
  .option('-f, --force', 'Force uninstall of package')
  .parse(process.argv);

let packages = program.args;

if (! packages.length) {
  console.error('No packages to uninstall!');
  process.exit(1);
}

// TODO: Inspect if current folder is a maniajs initted dir!
console.log('Not yet implemented!');
