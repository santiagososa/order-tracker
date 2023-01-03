// Require filesystem related objects
require('dotenv').config();
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const process = require('process');

// Require google/gmail API related objects
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// Require OpenAI API related objects
const { Configuration, OpenAIApi } = require("openai");

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
    console.log("Listing page: " + i);
    const messages = await gmailHandler.listPurchaseRelatedEmails();
    const subjects = await gmailHandler.saveSnippetsAndExtractSubjectsFromEmails(messages);
    console.log(subjects);
  }
  
  return;
}

const gmailHandler = new GmailHandler(google, authenticate, gmailTokenPath, gmailCredentialsPath, messagesDirectory, fs, fsp);
const numberOfPages = 12;
haveFun(gmailHandler, numberOfPages);

/** 
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
async function classifyEmailsSubjects(subjects) {
    
  const res = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: "Classify the following elements for me:" + JSON.stringify(subjects),
  });

  console.log(res.data.choices);
  return res.data;
}*/


