#!/usr/bin/env node
'use strict';

const env = process.execArgv.length && process.execArgv[0].slice(-14) === '_babel-node.js' ? 'src' : 'lib';
require('../'+env+'/cli/upgrade');
