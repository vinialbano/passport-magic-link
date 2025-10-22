const {writeFileSync} = require('fs');
const {join} = require('path');

writeFileSync(
  join(__dirname, '..', 'lib', 'cjs', 'package.json'),
  JSON.stringify({type: 'commonjs'}, null, 2) + '\n'
);
