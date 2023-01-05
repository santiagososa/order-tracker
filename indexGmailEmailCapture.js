// A simple script to download Gmail emails into the filesystem
// Used hand in hand with ExtractRelevantInfo script, that uses open AI
// to extract relevant info from your emails


// Require filesystem related objects
require('dotenv').config();
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const process = require('process');

// Require google/gmail API related objects
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');


// Locate multiple files for the Gmail Handler. TODO: take all these to a configuration file
// scopes defined according to the API
const gmailTokenPath = path.join(process.cwd(), 'token.json');
// credentialsPath indicates where the Google APP related credentials are stored
const gmailCredentialsPath = path.join(process.cwd(), 'credentials.json');
// messagesDirectory contains the path in which email snippets will be stored
const messagesDirectory = path.join(process.cwd(), 'messages-directory');


const GmailHandler = require('./GmailHandlerClass');

async function haveFun(gmailHandler, numberOfPages){
  
  await gmailHandler.authorize();

  for (let i = 0; i < numberOfPages; i++){
    console.log("Listing Page: " + i);
    const messages = await gmailHandler.listPurchaseRelatedEmails();
    const subjects = await gmailHandler.saveSnippetsAndExtractSubjectsFromEmails(messages);
    console.log(subjects);
  }
  
  return;
}

const gmailHandler = new GmailHandler(google, authenticate, gmailTokenPath, gmailCredentialsPath, messagesDirectory, fs, fsp);
// Number of email pages to be fetched default to 5, but can be send as bash parameter
const numberOfPages = process.argv[2] ? process.argv[2] : 5 ;
haveFun(gmailHandler, numberOfPages);
