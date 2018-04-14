import Log from '../server/console';
Log.setLevel(2);
Log.useDatePrefix();

// list of setup scripts
require('./setup-pokemon-images');

process.exit(0);