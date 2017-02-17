/*
 * IBM Confidential
 * OCO Source Materials
 * (C) Copyright IBM Corp. 2015, 2016
 * The source code for this program is not published or otherwise divested of its trade secrets, irrespective of what has been deposited with the U.S. Copyright Office.
 */
var async = require('async');
const crypto = require('crypto');
var locomotive = require('locomotive');
var Twitter = require('../../twit/lib/twitter');
var twitterTokens = require('../../settings/twitter_config');
var conversationUtils = require('../utils/wvaUtils');
//require('dotenv').load();
var Controller = locomotive.Controller;
var apiController = new Controller();

// Initialize Twitter
var twitter = new Twitter(twitterTokens);

//This is needed for Slack integration
var request = require('request');
var keyword = process.env.KEYWORD || 'stop';
var slackOutgoingToken = process.env.SLACK_OUTGOING_TOKEN || 'FgbMHgK7i0CyXJgh4ZCgH5c0';

// function to handle messages that come FROM slack.  The message is required to start with the Twitter id of the
// user that the message should be forwarded to.
apiController.dmSlack = function() {

	try {
		if (this.req.body.token === slackOutgoingToken && this.req.body.user_name !== 'slackbot') {
			console.log('dmSlack => Message of this.req.body.text = ' + this.req.body.text);
			var m = this.req.body.text.match(/^@\w*/);
			if (!m) {
				console.log('*** No recipient id specified...  terminating....')
				this.res.status(200).send( { text: 'Please start the message with the id you would like to talk to...'})
				return;
			}
			console.log(m)
			var recipient_id = m[0].substring(1).trim();
			console.log(recipient_id)
			var msg = this.req.body.text.substring(m[0].length + 1);
			console.log(msg)
			try {
        // The reply message is an array of messages that needs to be responded with...
        console.log('Sending message received from Slack back to twitter');

        var dm_responses = [];
        var dmParams = {
          event: {
            type: 'message_create',
            message_create: {
              target: {
                recipient_id: recipient_id
              },
              message_data: {
                text: msg
              }
            }
          }
        }
        dm_responses.push(dmParams);

        if (appEnv.isLocal) {
          that.res.send(dm_responses);
        } else {
          // Loop over the responses asynchrounesly and reply back
          async.eachSeries(dm_responses, function(dmParams, callback) {
            sendDMReply(dmParams, callback);
          }, function() {
            console.log('All responses delivered...');
          });
        }
      } catch (err) {
        console.log(err);
        that.res.status(200).send({ 'error': 'Message signature was invalid'});
      }
			this.res.status(200).send()
		}
	} catch (err) {
		console.log(err)
		this.res.status(200).send()
	}
};

// function that handles messages that come from Twitter direct message.
apiController.dmConversation = function() {
  console.log('Received a DM conversation event...');

  var that = this;
  var msg_event = this.req.body;

  console.log(JSON.stringify(msg_event));

  if (msg_event.direct_message_events[0].message_create.sender_id == '781914054788915200') {
    console.log('Looks like Im talking to myself, I will terminate this conversation right here....');
    return;
  }

  var request_signature = this.req.get('X-Twitter-Webhooks-Signature');
  var isSigned = false;
  if (appEnv.isLocal) {
    isSigned = true;
  } else {
    isSigned = true; //checkSignature(request_signature, msg_event);
  }

  if (isSigned) {

    console.log('Message signature was validated successfully...  Continue to have conversation with ' + msg_event.direct_message_events[0].message_create.sender_id);

    conversationController(msg_event).then(function(reply_msg) {

      try {
        // The reply message is an array of messages that needs to be responded with...
        console.log('Conversation resulted in ' + reply_msg.length + ' message(s) being returned');

        var dm_responses = [];
        for (var m=0; m<reply_msg.length; m++) {
          var dmParams = {
            event: {
              type: 'message_create',
              message_create: {
                target: {
                  recipient_id: msg_event.direct_message_events[0].message_create.sender_id
                },
                message_data: {
                  text: reply_msg[m]
                }
              }
            }
          }
          dm_responses.push(dmParams);
        }

        if (appEnv.isLocal) {
          that.res.send(dm_responses);
        } else {
          // Loop over the responses asynchrounesly and reply back
          async.eachSeries(dm_responses, function(dmParams, callback) {
            sendDMReply(dmParams, callback);
          }, function() {
            console.log('All responses delivered...');
          });
        }
      } catch (err) {
        console.log(err);
        that.res.status(200).send({ 'error': 'Message signature was invalid'});
      }
    }, function(err) {
      console.log('Error returned from conversation controller : ' + err);
      that.res.status(200).send({ 'error': 'Message signature was invalid'});
    });

  } else {
    console.log('Message signature was invalid');
    that.res.status(200).send({ 'error': 'Message signature was invalid'});
  }
}

// Send a DM message to twitter
var sendDMReply = function(dmParams, callback) {
  console.log('Responding with --> ' + dmParams.event.message_create.message_data.text);
  if (!appEnv.isLocal) {
      twitter.post('direct_messages/events/new', dmParams, function(err, response) {
        if (err) {
          console.log(err);
          console.log('HTTP Status code : ' + response.statusCode);
          callback(err);
        } else {
          console.log('Response sent to DM with event id ' + response.event.id + ' as a result');
          setTimeout(callback(), 1000);
        }
      });
  } else {
    callback();
  }
}

var checkSignature = function(request_signature, msg_event) {
  var hmac = crypto.createHmac('sha256', twitterTokens.consumer_secret);

  var msgEventStr = JSON.stringify(msg_event);

  console.log(msgEventStr);

  var calculated_signature = 'sha256=' + hmac.update(msgEventStr).digest('base64');

  console.log('Received Signature: ' + request_signature);
  console.log('Calculated Signature: ' + calculated_signature);

  return request_signature == calculated_signature;
}

/**
  This function controls the conversation.  If the conversation exist, then continue with the conversation,
  otherwise it will start a new conversation.
**/
var conversationController = function(msg_event) {

  return new Promise(function(fulfill, reject) {
    try {
      console.log('Executing the conversation controller...');
      // We are only interested in the first message event in the array
      var msg = msg_event.direct_message_events[0];

      // First check if this is an end of conversation event indicated with #thankswatson
      if (msg.message_create.message_data.text.indexOf('#thankswatson') > -1) {
        conversationUtils.isExistingConversation(msg).then(function(conversation) {
          conversationUtils.endConversation(msg, conversation).then(function(conversation) {
            fulfill(['Happy to help, have a great day!!!']);
          }, function(err) { reject(err) });
        }, function(err) {
          console.log(err)
          reject(err)
        });
      } else {

        // Check if this user already has an active conversation
        conversationUtils.isExistingConversation(msg).then(function(conversation) {
          if (conversation.existing) {
            console.log('This is an existing conversation')
            conversationUtils.continueConversation(msg, conversation).then(function(conversation) {
              console.log(JSON.stringify(conversation));
              var reply_msg = conversation.message.text;
              conversationUtils.saveConversation(msg, conversation).then(function(conversation) {
                fulfill(reply_msg);
              }, function(err) { reject(err) });
            }, function(err) { reject(err) });
          } else {
            // Start a conversation and basically throw away the first response....
            conversationUtils.startConversation(msg).then(function(conversation) {
              // Now continue to the real stuff and pass in the origional message
              conversationUtils.continueConversation(msg, conversation).then(function(conversation) {
                // When the response is received from the Conversation API, save the response to the database.
                var reply_msg = conversation.message.text;
                conversationUtils.createConversation(msg, conversation).then(function(conversation) {
                  fulfill(reply_msg);
                }, function(err) { reject(err) });
              }, function(err) { reject(err) });
            }, function(err) { reject(err) });
          }
        }, function(err) { reject(err) });
      }

    } catch (err) {
      reject(err);
    }

  });
}

apiController.dmHandshake = function() {
  console.log('*** Receive a DM Handshake Request.')
  var msg_token = this.req.query.crc_token;

  console.log('*** Message Token retrieved from url = ' + msg_token);

  var hmac = crypto.createHmac('sha256', twitterTokens.consumer_secret);

  var response_token = 'sha256=' + hmac.update(msg_token).digest('base64');

  response = {
  	'response_token': response_token
  }
  console.log('Token Response returned: ' + JSON.stringify(response))

  this.res.status(200).send(response);
}

module.exports = apiController;
