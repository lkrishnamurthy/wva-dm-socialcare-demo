var request = require("request");
var Promise = require('promise');
var watson = require('watson-developer-cloud');
var conversation_creds = require('../../settings/conversation_config.json');

var dialog_id = "61201003-3ba4-4be7-9743-19f34bcaf734";
var bot_id = "2502d0c3-7762-4baa-b22d-8e1f9a149379";
var client_key = "85c41790-5854-4d88-950a-916fd1774467";
var secret_token = "Y5iK5xU2wC8wV6nJ8rI4mY4xK7wG5sY8cN3nF3dD1oB6yH1mS4";

// Start a Dialog conversation
exports.startConversation = function(msg) {
	console.log('In startConversation');
	return new Promise(function(resolve, reject) {
		try {
			// Setup the call to WVA
			var conversation_options = {
				url: 'https://api.ibm.com//virtualagent/run/api/v1/bots/' + bot_id + "/dialogs",
				method: 'POST',
				headers: {
					'X-IBM-Client-Id': client_key,
					'X-IBM-Client-Secret': secret_token,
					"content-type": "application/json",
				},
				json: true,
				body: { userID: null }
			};
			//conversation_options.path = "/virtualagent/run/api/v1/bots/" + bot_id + "/dialogs";
			wvaConversation(conversation_options).then(function(result) {
				console.log('Response received from WVA, resolve startConversation')
				resolve(result)
			}, function(err) {
				reject(err)
			});
		} catch (err) {
			reject(err)
		}
	});
};

// Continue a Dialog conversation
exports.continueConversation = function(msg, conversation) {
	console.log('In continueConversation')
	return new Promise(function(resolve, reject) {
		try {
			// Setup the WVA call
			var conversation_options = {
				url: 'https://api.ibm.com//virtualagent/run/api/v1/bots/' + bot_id + "/dialogs/" + conversation.dialog_id + "/messages",
				method: 'POST',
				headers: {
					'X-IBM-Client-Id': client_key,
					'X-IBM-Client-Secret': secret_token,
					"content-type": "application/json",
				},
				json: true,
				body: {
					userID: null,
					message: msg.message_create.message_data.text
				}
			};
			// Extract the sender_id from the DM message to pass to Slack.  This id is used to reply to from slack and is required to send the
			// the slack message back to DM.
			var sender_id = msg.message_create.sender_id
			wvaConversation(conversation_options).then(function(result) {
				try {
					// Check if the intent that comes back from WVA is AGENT, then we want to send the message to slack.
					if (result.message.action && result.message.action.name.toUpperCase() === "AGENT") {
						postToSlack(result.message.text[0], sender_id, function(resp) {
							resolve(result);
						})
					} else {
						resolve(result);
					}
				} catch (err) {
					console.log(err)
					reject(err)
				}
			}, function(err) {
				reject(err)
			});
		} catch (err) {
			console.log(err)
			reject (err)
		}
	});
};

//This method used to post message to Slack.
var postToSlack = function(message, sender_id, cb) {
	// Set the headers
	var headers = {
		'Content-Type': 'application/json'
	};
	// Configure the request
	var options = {
		url: process.env.SLACK_INCOMING_WEBHOOK || 'https://hooks.slack.com/services/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',
		method: 'POST',
		headers: headers,
		json: true,
		body: {
			username: sender_id,
			text: message
		}
	};
	console.log(message)
	// Start the request
	console.log('--> Calling slack')
	request(options, function (error, response, body) {
		console.log('<-- Response from slack')
		if (!error && response.statusCode == 200) {
			cb(body)
		} else {
			cb(error)
		}
	});
};

//Function to make POST request
function httpPostAsync (url, data, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open('POST', url, true); // true for asynchronous
  xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status == 200) {
        callback(null, xmlHttp.responseText);
      }
      else {
        callback(xmlHttp.statusText, null);
      }
    }
  }
  xmlHttp.send(JSON.stringify(data));
}

// A WVA conversation
var wvaConversation = function(conversation_options) {
	return new Promise(
			function(fulfill, reject) {
				try {
					console.log('in wvaConversation')
					request(conversation_options, function(error, response, body) {
						if (error) {
							console.log(error)
							reject(error)
						} else {
							console.log('Response from WVA')
							fulfill(body);
						}
					});

				} catch (err) {
					console.log(err);
					reject(err);
				}
			});
};

// Check if this is an existing conversation
exports.isExistingConversation = function(msg) {
	return new Promise(
			function(fulfill, reject) {
				console.log("Checking for conversation with sender_uid : " + msg.message_create.sender_id);
				try {
					var selector = {
						"selector" : {
							"sender_uid" : msg.message_create.sender_id,
							"active" : true
						}
					};
					global["conversation-db"]
							.find(
									selector,
									function(err, result) {
										if (err) {
											console.log('Error finding existing conversation : ' + err);
											reject(err);
										} else {
											var existing = result.docs.length > 0;
											var response = {
												existing : false,
											};
											if (existing) {
												var doc = result.docs[0];
												response = {
													existing : existing,
													context : doc.context
												};
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
};

// Create a new conversation
exports.createConversation = function(msg, conversation) {
	return new Promise(function(fulfill, reject) {

		try {
			var created_at = new Date(Number(msg.created_timestamp));

			var concat_response = "";
			for (var i = 0; i < conversation.message.text.length; i++) {
				concat_response += conversation.message.text[i];
			}

			var doc = {
				sender_uid : msg.message_create.sender_id,
				created_at : created_at.toUTCString(),
				active : true,
				context : conversation.message.context,
				history : [ {
					source_uid : msg.message_create.sender_id,
					created_at : created_at.toUTCString(),
					received : msg.message_create.message_data.text,
					response : concat_response
				} ]
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
};

// Save a conversation
exports.saveConversation = function(msg, conversation) {
	return new Promise(
			function(fulfill, reject) {

				try {

					var created_at = new Date(Number(msg.created_timestamp));

					var concat_response = "";
					for (var i = 0; i < conversation.message.text.length; i++) {
						concat_response += conversation.message.text[i];
					}

					console.log('Saving an existing conversation ' + concat_response);

					// Add the tweet text to the conversation
					var history = {
						source_uid : msg.message_create.sender_id,
						created_at : created_at.toUTCString(),
						received : msg.message_create.message_data.text,
						response : concat_response
					};

					var selector = {
						"selector" : {
							"sender_uid" : msg.message_create.sender_id,
							"active" : true
						}
					};

					global["conversation-db"]
							.find(
									selector,
									function(err, result) {
										if (err) {
											console.log('Error finding the conversation to update : ' + err);
											reject(err);
										} else {
											console
													.log('Found the conversation to update');
											var doc = result.docs[0];
											doc.history.push(history);
											doc.context = conversation.message.context;
											global["conversation-db"]
													.insert(
															doc,
															function(err,
																	result) {
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
};

// Complete a conversation
exports.endConversation = function(msg, conversation) {
	return new Promise(
			function(fulfill, reject) {
				try {
					var selector = {
						"selector" : {
							"sender_uid" : msg.message_create.sender_id,
							"active" : true
						}
					};

					// Delay this for 10 seconds to not get an error when
					// running locally
					var delay = 0;
					if (appEnv.isLocal) {
						delay = 10000;
					}
					setTimeout(
							function() {
								global["conversation-db"]
										.find(
												selector,
												function(err, result) {
													if (err) {
														console.log('Error finding the conversation to end : ' + err);
														reject(err);
													} else {
														if (result.docs.length > 0) {
															var doc = result.docs[0];
															doc.active = false;
															global["conversation-db"]
																	.insert(
																			doc,
																			function(
																					err,
																					result) {
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
};
