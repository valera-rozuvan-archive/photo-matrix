var listDir = require('nls2-lib'),
  fs = require('fs'),

  pathString, sudoUid;


/*
// If this script was launched via sudo command, switch back to origianl user.
// I.e. we don't want this script to run as root!
sudoUid = parseInt(process.env.SUDO_UID);
if (sudoUid) {
  process.setuid(sudoUid);
}
*/


// Get the name of directory to list it's files.
if (process.argv.length <= 2) {
  // console.log('Usage: ' + __filename + ' path/of/directory');
  // process.exit(-1);

  pathString = '.';
} else {
  pathString = process.argv[2];
}

// Remove any trailing '/' from the pathString.
// Replace repeating '/' with a single '/'.
pathString = pathString.replace(/\/+/g, '/');
if (pathString !== '/') {
  pathString = pathString.replace(/\/+$/, '');
}

try {
  fs.lstatSync(pathString);
} catch (err) {
  console.error(err.stack.split('\n'));

  return;
}

if (fs.lstatSync(pathString).isDirectory() === true) {
  // Parse the directory, and output the results.
  listDir.infoOnPath(pathString).then(function (result) {
    var fs = require('fs'),
      c1;

    console.log('total ' + result.totalHumanSize);

    for (c1 = 0; c1 < result.stats.length; c1 += 1) {
      console.log(result.stats[c1].lnString);
    }

    /*
    fs.writeFile(
      'node-ls-v.out',
      JSON.stringify(result) + '\n',
      {
        encoding: 'utf8',
        mode: 438,
        flag: 'w'
      },
      function (err) {
        if (err) {
          throw err;
        }
      }
    );
    */
  }, function (error) {
    console.log(error.stack.split('\n'));
  });
} else {
  // Get info on file, and output the resuts.
  listDir.infoOnFile(pathString).then(function (result) {
    console.log(result.lnString);
  }, function (error) {
    console.log(error.stack.split('\n'));
  });
}
