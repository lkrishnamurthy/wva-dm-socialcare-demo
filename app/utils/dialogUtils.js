var Promise = require('promise');
var watson = require('watson-developer-cloud');
var conversation_creds = require('../../settings/dialog_config.json');

var dialog_service = watson.dialog({
  username: conversation_creds.dialog_credentials.username,
  password: conversation_creds.dialog_credentials.password,
  version: 'v1'
});

// Start a Dialog conversation
exports.startConversation = function(msg) {
	return new Promise(function(fulfill, reject) {
		try {
			console.log('*** Calling the Start Dialog Service with text ' + msg.message_create.message_data.text);

			var params = {
			  dialog_id: conversation_creds.dialog_credentials.dialog_id,
			  input: msg.message_create.message_data.text
			};

			dialog_service.conversation(params, function(err, conversation) {
			  if (err) {
			    console.log(err);
					reject(err);
			  } else {
          console.log(conversation);
					fulfill(conversation);
				}
			});

		} catch (err) {
			console.log(err);
			reject(err);
		}
	});
}

// Continue a Dialog conversation
exports.continueConversation = function(msg, conversation) {
	return new Promise(function(fulfill, reject) {
		try {
			console.log('Calling the Continue Dialog Service with conversation_id ' + conversation.conversation_id +
        ' and client_id 	' + conversation.client_id +
        ' text ' + msg.message_create.message_data.text);

			var params = {
			  dialog_id: conversation_creds.dialog_credentials.dialog_id,
				conversation_id : conversation.conversation_id,
				client_id : conversation.client_id,
			  input: msg.message_create.message_data.text
			};

			dialog_service.conversation(params, function(err, conversation) {
			  if (err) {
			    console.log(err);
					reject(err);
			  } else {
					fulfill(conversation);
				}
			});
    } catch (err) {
      console.log(err);
      reject(err);
    }
	});
}

// Check if this is an existing conversation
exports.isExistingConversation = function(msg) {
	return new Promise(function(fulfill, reject) {
    console.log("Checking for conversation with sender_uid : " + msg.message_create.sender_id);
		try {
			var selector = { "selector" : { "sender_uid" : msg.message_create.sender_id, "active" : true } };
			global["conversation-db"].find(selector, function(err, result) {
				if (err) {
					console.log('Error finding existing conversation : ' + err);
					reject(err);
				} else {;
					var existing = result.docs.length > 0;
          var response = {
            existing : false,
          }
					if (existing) {
						var doc = result.docs[0];
						response = {
							existing : existing,
							conversation_id: doc.conversation_id,
							client_id: doc.client_id
						}
					}
          console.log(response);
          fulfill(response);
				}
			});
		} catch (err) {
			console.log(err);
      reject(err);
		}
	});
}

// Create a new conversation
exports.createConversation = function(msg, conversation) {
	return new Promise(function(fulfill, reject) {

    try {
      var created_at = new Date(Number(msg.created_timestamp));

  		var doc = {
  			sender_uid : msg.message_create.sender_id,
  			created_at : created_at.toUTCString(),
  			active: true,
  			conversation_id : conversation.conversation_id,
  			client_id : conversation.client_id,
  			history : [
  				{
  					source_uid : msg.message_create.sender_id,
  					created_at : created_at.toUTCString(),
  					received : msg.message_create.message_data.text,
  					response : conversation.response[0]
  				}
  			]
  		};
  		global["conversation-db"].insert(doc, function(err, result) {
  			if (err) {
  				console.log('Error creating a new conversation : ' + err);
  				reject(err);
  			} else {
  				console.log('Conversation successfully created in DB');
  				fulfill(doc);
  			}
  		});
    } catch (err) {
      console.log(err);
      reject(err);
    }
	});
}

// Save a conversation
exports.saveConversation = function(msg, conversation) {
	return new Promise(function(fulfill, reject) {

    try {
      var created_at = new Date(Number(msg.created_timestamp));

  		console.log('Saving an existing conversation');
  		// Add the tweet text to the conversation
  		var history = {
  			source_uid : msg.message_create.sender_id,
  			created_at : created_at.toUTCString(),
  			received : msg.message_create.message_data.text,
  			response : conversation.response[0]
  		};

  		var selector = { "selector" : { "sender_uid" : msg.message_create.sender_id, "active" : true } };

  		global["conversation-db"].find(selector, function(err, result) {
  			if (err) {
  				console.log('Error finding the conversation to update : ' + err);
  				reject(err);
  			} else {
  				console.log('Found the conversation to update');
  				var doc = result.docs[0];
  				doc.history.push(history);
  				global["conversation-db"].insert(doc, function(err, result) {
  					if (err) {
  						console.log('Error updating the conversation : ' + err);
  						reject(err);
  					} else {
  						console.log('Successfully saving the conversation in DB');
  						fulfill(doc);
  					}
  				});
  			}
  		});
    } catch (err) {
      console.log(err);
      reject(err);
    }
	});
}

// Complete a conversation
exports.endConversation = function(msg, conversation) {
	return new Promise(function(fulfill, reject) {
		try {
			var selector = { "selector" : { "sender_uid" : msg.message_create.sender_id, "active": true } };

			// Delay this for 10 seconds to not get an error when running locally
			var delay = 0;
			if (appEnv.isLocal) {
				delay = 10000;
			}
			setTimeout(function() {
				global["conversation-db"].find(selector, function(err, result) {
					if (err) {
						console.log('Error finding the conversation to end : ' + err);
						reject(err);
					} else {
						if (result.docs.length > 0) {
							var doc = result.docs[0];
							doc.active = false;
							global["conversation-db"].insert(doc, function(err, result) {
								if (err) {
									console.log('Error updating the conversation : ' + err);
									reject(err);
								} else {
									console.log('Successfully saving the conversation in DB');
									fulfill(doc);
								}
							});
						}
					}
				});
			}, delay);
		} catch (err) {
			console.log(err);
			reject(err);
		}
	});
}
