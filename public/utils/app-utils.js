var fs = require('fs');

module.exports.getJSONFile = function(filename, callback) {
	if (fs.existsSync(filename)) {
		var fileContent = fs.readFileSync(filename);
		callback(JSON.parse(fileContent));
	} else {
		throw('File not found');
	}
}

module.exports.getDirectoryContent = function(path) {
	fs.readdir(path, function(err, items) {

	  for (var i=0; i<items.length; i++) {
	      console.log(items[i]);
	  }
		return items;

	});

}
