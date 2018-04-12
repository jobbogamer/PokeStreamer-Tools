import Log from '../server/console';
Log.setLevel(2);
Log.useDatePrefix();

// list of setup scripts
require('./setup-pokemon-images');
require('./port-game-data');

process.exit(0);