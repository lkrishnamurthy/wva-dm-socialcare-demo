var Promise = require('promise');
var watson = require('watson-developer-cloud');
var request = require('request');
var conversation_creds = require('../../settings/conversation_config.json');

var conversation_api = watson.conversation({
  username: conversation_creds.credentials.username,
  password: conversation_creds.credentials.password,
  version: 'v1',
  version_date: '2016-09-20'
});

// Start a Dialog conversation
exports.startConversation = function(msg) {
	return new Promise(function(fulfill, reject) {
		try {
			console.log('*** Calling the Start Dialog Service with text ' + msg.message_create.message_data.text);

      // Replace with the context obtained from the initial request
      var context = {};

			var params = {
			  workspace_id: conversation_creds.credentials.workspace_id,
			  input: { 'text' : msg.message_create.message_data.text },
        context: context
			};

			conversation_api.message(params, function(err, conversation) {
			  if (err) {
			    console.log(err);
					reject(err);
			  } else {
          console.log('Sucessfully called the start conversation...');
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
			var msg_text = msg.message_create.message_data.text;
			console.log('Calling the Continue Conversation Service with text : ' + msg_text);

			var params = {
			  workspace_id: conversation_creds.credentials.workspace_id,
			  input: { 'text' : msg_text },
			  context: conversation.context
			};

			conversation_api.message(params, function(err, conversation) {
			  if (err) {
				  console.log(err);
				  reject(err);
			  } else {
				  console.log('Received response back from Conversation API : ' + conversation.output.text)
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
				} else {
					var existing = result.docs.length > 0;
          var response = {
            existing : false,
          }
					if (existing) {
						var doc = result.docs[0];
						response = {
							existing : existing,
							context: doc.context
						}
            console.log('An existing conversation was found : ' + doc._id);
					}
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

      var concat_response = "";
      for (var i=0; i<conversation.output.text.length; i++) {
        concat_response += conversation.output.text[i];
      }

  		var doc = {
  			sender_uid : msg.message_create.sender_id,
  			created_at : created_at.toUTCString(),
  			active: true,
  			context : conversation.context,
  			history : [
  				{
  					source_uid : msg.message_create.sender_id,
  					created_at : created_at.toUTCString(),
  					received : msg.message_create.message_data.text,
  					response : concat_response
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

      var concat_response = "";
      for (var i=0; i<conversation.output.text.length; i++) {
        concat_response += conversation.output.text[i];
      }

      console.log('Saving an existing conversation ' + concat_response);

  		// Add the tweet text to the conversation
  		var history = {
  			source_uid : msg.message_create.sender_id,
  			created_at : created_at.toUTCString(),
  			received : msg.message_create.message_data.text,
  			response : concat_response
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
          doc.context = conversation.context;
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
									console.log('Error ending the conversation : ' + err);
									reject(err);
								} else {
									console.log('Successfully ending the conversation...');
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
