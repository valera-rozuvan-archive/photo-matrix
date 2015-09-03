/**
 *
 * photo-matrix :: list-dir
 *   main.js
 *
 */

var fs     = require('fs'),
  path     = require('path'),
  posix    = require('posix'),
  statMode = require('stat-mode'),
  moment   = require('moment'),
  filesize = require('filesize'),
  Q        = require('q'),
  colors   = require('colors/safe'),

  DATE_TIME_FORMAT = 'MMM Do YYYY HH:mm:ss',
  HUMAN_FILESIZE_FORMAT = {
    unix: true,
    output: 'string',
    round: 1
  };


// Used for case insensitive sort.
function caseInsensitiveSorter (A, B) {
  var a = A.toLowerCase(),
    b = B.toLowerCase();

  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}


function infoOnPath(pathString) {
  var deferred_infoOnPath = Q.defer(),
    _stats = [];

  fs.readdir(pathString, function (err, items) {
    var hiddenFiles = [],
      normalFiles = [],
      processFuncs = [],
      i, j, result, filePath;


    // Catch any initial errors.
    if (err) {
      throw err;
    }


    // Create an array of file names.
    for (i = 0; i < items.length; i += 1) {
      j = items[i];

      if (j.charAt(0) === '.') {
        hiddenFiles.push(j);
      } else {
        normalFiles.push(j);
      }
    }
    items = ['.', '..']
      .concat(hiddenFiles.sort(caseInsensitiveSorter))
      .concat(normalFiles.sort(caseInsensitiveSorter));


    // Build the processFuncs array.
    for (i = 0; i < items.length; i += 1) {
      filePath = pathString + '/' + items[i];

      processFuncs.push((function (filePath) {
        return function (result) {
          if (result !== -1) {
            _stats.push(result);
          }

          return infoOnFile(filePath);
        };
      }(filePath)));
    }
    processFuncs.push(function (result) {
      var _def = Q.defer();

      _stats.push(result);
      _def.resolve(_stats);

      return _def.promise;
    });


    // Start the execution of processFuncs array.
    result = Q(-1);
    processFuncs.forEach(function (f) {
      result = result.then(f);
    });
    result.then(function (result) {
      var _totalSize = 0,
        _totalHumanSize = 0,
        c1, j;

      for (c1 = 0; c1 < result.length; c1 += 1) {
        j = result[c1];

        _totalSize += j.size;
      }
      _totalHumanSize = filesize(_totalSize, HUMAN_FILESIZE_FORMAT);

      deferred_infoOnPath.resolve({
        pathString: pathString,
        totalSize: _totalSize,
        totalHumanSize: _totalHumanSize,
        stats: result
      });
    });
  });

  return deferred_infoOnPath.promise;
}

function infoOnFile(filePath, lstat) {
  var deferred_infoOnFile = Q.defer(),
    fs_lstat_call = 'lstat',
    _def;

  if (lstat === false) {
    fs_lstat_call = 'stat';
  }

  fs[fs_lstat_call](filePath, function (err, stats) {
    var _stat = {},
      _s1 = '',
      fileMode;

    if (err) {
      deferred_infoOnFile.reject(new Error(err));

      return;
    }



    // --------- Common file properties --------- //

    // ID of the device containing the file.
    _stat.dev = stats.dev;


    // File inode number. An inode is a file system data
    // structure that stores information about a file.
    _stat.ino = stats.ino;


    // File protection (access rights).
    _stat.mode = stats.mode;


    // Number of hard links to the file.
    _stat.nlink = stats.nlink;


    // File owner and group, along with their human readable counterparts.
    _stat.uid       = stats.uid;
    _stat.ownerName = posix.getpwnam(stats.uid).name;

    _stat.gid        = stats.gid;
    _stat.ownerGroup = posix.getgrnam(stats.gid).name;


    // Device ID if the file is a special file.
    _stat.rdev = stats.rdev;


    // File total size in bytes, also a human readable size.
    _stat.size      = stats.size;
    _stat.humanSize = filesize(_stat.size, HUMAN_FILESIZE_FORMAT);


    // Block size for file system I/O.
    _stat.blksize = stats.blksize;


    // Number of blocks allocated for the file.
    _stat.blocks = stats.blocks;


    // Date object representing the file’s last access time. Also human
    // readable version.
    _stat.aTime       = stats.atime;
    _stat.human_aTime = moment(stats.atime).format(DATE_TIME_FORMAT);


    // Date object representing the last time the file’s inode was changed.
    // Also human readable version.
    _stat.cTime       = stats.ctime;
    _stat.human_cTime = moment(stats.ctime).format(DATE_TIME_FORMAT);


    // Date object representing the file’s last modification time. Also
    // human readable version.
    _stat.mTime       = stats.mtime;
    _stat.human_mTime = moment(stats.mtime).format(DATE_TIME_FORMAT);



    // --------- Extra properties for convenience --------- //

    // Full path to file.
    _stat.filePath = filePath;


    // Just the file's name, without full path.
    _stat.baseName = path.basename(filePath);


    // Just the file's extension.
    _stat.fileExtension = path.extname(filePath);


    // Human readable permissions.
    fileMode = new statMode(stats);

    _stat.others_eXecute = (fileMode.others.execute ? 'x' : '-');
    _stat.others_Write   = (fileMode.others.write ? 'w' : '-');
    _stat.others_Read    = (fileMode.others.read ? 'r' : '-');

    _stat.group_eXecute  = (fileMode.group.execute ? 'x' : '-');
    _stat.group_Write    = (fileMode.group.write ? 'w' : '-');
    _stat.group_Read     = (fileMode.group.read ? 'r' : '-');

    _stat.owner_eXecute  = (fileMode.owner.execute ? 'x' : '-');
    _stat.owner_Write    = (fileMode.owner.write ? 'w' : '-');
    _stat.owner_Read     = (fileMode.owner.read ? 'r' : '-');


    // Type of file. Is it a directory, symbolic link, or a
    // normal file?
    _stat.isDirectory    = stats.isDirectory();
    _stat.isSymbolicLink = stats.isSymbolicLink();
    _stat.isFile         = stats.isFile();


    // Quick information. Trying to mimick output of
    // Linux `ls -a -h -l` command for an individual entry.
    if (_stat.isSymbolicLink) {
      _s1 += 'l';
    } else if (_stat.isDirectory) {
      _s1 += 'd';
    } else if (_stat.isFile) {
      _s1 += '-';
    } else {
      _s1 += '?';
    }

    _s1 += _stat.owner_Read + _stat.owner_Write + _stat.owner_eXecute +
           _stat.group_Read + _stat.group_Write + _stat.group_eXecute +
           _stat.others_Read + _stat.others_Write + _stat.others_eXecute +
           ' ';

    _s1 += _stat.nlink + ' ';
    _s1 += _stat.ownerName + ' ';
    _s1 += _stat.ownerGroup + ' ';
    _s1 += _stat.humanSize + ' ';
    _s1 += _stat.human_mTime + ' ';

    if (_stat.isDirectory) {
      _s1 += colors.blue(_stat.baseName);
    } else if (_stat.isSymbolicLink) {
      _s1 += colors.cyan(_stat.baseName);
    } else if (_stat.isFile === true && _stat.owner_eXecute === 'x') {
      _s1 += colors.green(_stat.baseName);
    } else {
      _s1 += _stat.baseName;
    }

    _stat.lnString = _s1;


    if (_stat.isSymbolicLink === true) {
      _def = Q.defer();

      fs.readlink(filePath, function (err, linkString) {
        var fullLinkString;

        if (err) {
          _def.reject(new Error(err));

          return;
        }

        _stat.linkString = linkString;

        if (linkString.charAt(0) === '/') {
          fullLinkString = linkString;
        } else {
          fullLinkString = path.dirname(filePath) + '/' + linkString;
        }

        infoOnFile(fullLinkString).then(function (_stat_l) {
          _stat.linkString_stat = _stat_l;

          _s1 += ' -> ';

          if (_stat_l.isDirectory) {
            _s1 += colors.blue(_stat_l.filePath);
          } else if (_stat_l.isSymbolicLink) {
            _s1 += colors.cyan(_stat_l.filePath);
          } else if (_stat_l.isFile === true && _stat_l.owner_eXecute === 'x') {
            _s1 += colors.green(_stat_l.filePath);
          } else {
            _s1 += _stat_l.filePath;
          }

          _stat.lnString = _s1;

          _def.resolve();
        }, function (err) {
          console.log(err);
        });
      });

      _def.promise.then(function () {
        deferred_infoOnFile.resolve(_stat);
      });
    } else {
      deferred_infoOnFile.resolve(_stat);
    }
  });

  return deferred_infoOnFile.promise;
}

exports.infoOnPath = infoOnPath;
exports.infoOnFile = infoOnFile;
