# Twitter DM Social Care Demo Bot Application

This demo application uses Twitter DM and Watson Virtual Agent to illustrate a customer support use-case.  The demo supports answering common questions such as How do i pay my bill, what is the nearest location, what is the contact information as well as a hand-off to a live agent that can then respond to the user via DM. The live agent portion is demonstrated using a Slack team and channel. In reality, the Slack channel can be replaced with a third-party or a social media company application supporting its enterprise.

# Pre-requisites

* IBM Bluemix id & credentials 
* Cloud Foundry CLI Libraries 
* Watson Virtual Agent(WVA) is setup and configured with pre-defined intents and responses.
* A Slack Team and Channel setup
* Incoming and outgoing web hooks for Slack integration
* A Twitter Handle and its related authentication credentials.  
* A twitter application that has read and write access to direct messages
* Access to Twitter DM APIs (Done by Twitter team based on the application and twitter handle)

# Steps

1. Integrating WVA to DM Bot

* Follow instructions provided by in the WVA Setup guide to setup and configure WVA (Instructions to come from WVA team).
* Use IBM's marketplace API Explorer to get the following credentials for your WVA project :
    - BOT ID
    - CLIENT KEY
    - SECRET TOKEN
    - DIALOG_ID
* Update these variables in app/utils/wvaUtils.js as shown below

  var dialog_id = "XXXX";
  var bot_id = "XXXX";
  var client_key = "XXXX";
  var secret_token = "XXXX";

2. Setup Twitter DM credentials and access token using settings/twitter_config.js. Using the Twitter DM APIs setup access token for your Twitter App (https://github.com/twitterdev/preview-docs_dm-v2-api/blob/master/access-tokens.rst)

3. Use the Twitter Handle (Example : @demowatsonsoci1) and make sure it add the twitter users to the following list.

4. Open the manifest.yml and edit the application name so it is unique before deploying it to IBM Bluemix

5. Login to Bluemix using cf login <Your Bluemix ID>

6. Make sure to select the right space and organization

7. Run cf push command.

8. Once this setup is complete and the application is deployed to Bluemix, provide the callback URL (https://<appname.mybluemix.net/api/dm) for your application along with the App ID, and Twitter handle you want to setup DM access to the Twitter team. Twitter team will initiate a CRC request to the above URL to make sure
    the authentication is successful.

9. Login to the Twitter application using your twitter handle and use the "Message" option to send a message to your DM twitter handle (Example : @demowatsonsoci1)

10. You can start by asking simple questions such as "How do i pay bills or How do I find the contact information"

11. You can also type in "Agent" to initiate a request to Slack or your application chat for the live agent interaction.

12. When live agent interaction is complete, you can type in "STOP" to end the agent side of conversation

# Additional Resources

1. To learn more about setting up WVA along with its sample application use this github repo (https://github.com/dsayers/virtual-agent-app).
