var listDir = require('../main'),
  pathString, sudoUid;


// If this script was launched via sudo command, switch back to origianl user.
// I.e. we don't want this script to run as root!
sudoUid = parseInt(process.env.SUDO_UID);
if (sudoUid) {
  process.setuid(sudoUid);
}


// Get the name of directory to list it's files.
if (process.argv.length <= 2) {
  console.log('Usage: ' + __filename + ' path/of/directory');
  process.exit(-1);
}
pathString = process.argv[2];


// Parse the directory, and output the results.
listDir.infoOnPath(pathString).then(function (result) {
  var fs = require('fs'),
    c1;

  console.log('total ' + result.totalHumanSize);

  for (c1 = 0; c1 < result.stats.length; c1 += 1) {
    console.log(result.stats[c1].lnString);
  }

  // console.log(JSON.stringify(result));


  fs.writeFile('node-ls-v.out', JSON.stringify(result) + '\n', function (err) {
    if (err) {
      return console.log(err);
    }
  });
});
