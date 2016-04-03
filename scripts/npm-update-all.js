'use strict';
let exec = require('child_process').exec;
let fs = require('fs');
let path = require('path');
let async = require('async');
require('colors');

let packageList = fs.readdirSync(`${__dirname}/../packages/`);

console.log(`Start updating ${packageList.length} packages...`.green);

async.eachSeries(packageList, function (packageName, callback) {
  console.log(`Updating ${packageName} subpackage...`.yellow);

  let packagePath = path.resolve(`${__dirname}/../packages/${packageName}/`);
  let process = exec('npm update', {
    cwd: packagePath
  }, function (err, stdout, stderr) {
    if (err) return callback(err);
    callback();
  });
}, function (err) {
  if (err) {
    console.log('Error with updating!'.red);
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  }
  console.log('Update of all packages is done!'.green);
});
