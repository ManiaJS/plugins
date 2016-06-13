'use strict';

module.exports = {
  default: {
    tsconfig: true

  }
};

let t = {
  files: [
    {
      src: ['src/*/**.ts', 'src/*.ts'],
      dest: 'lib'
    },
    // { src: 'test/**.ts' , dest: 'lib/test' }
  ],

  options: {
    // tsconfig: __dirname + '/../../tsconfig.json',
    // fast: 'never',
    // module: 'es6',
    // target: 'es6'
  }
};
