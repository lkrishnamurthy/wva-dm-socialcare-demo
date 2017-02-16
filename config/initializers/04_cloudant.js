// Load the Cloudant library.
var Cloudant = require('cloudant');

module.exports = function() {

	var user = "b050c424-92ca-4b07-ab85-2767631427f3-bluemix";
	var password = "333380ef7928553d088b4238cdef4a72e62548c4a7f3f9494aa6a6dc73426c09";

	// Initialize the library with my account.
	var cloudant = Cloudant({account:user, password:password});

	global["conversation-db"] = cloudant.db.use("conversation-db");
}
