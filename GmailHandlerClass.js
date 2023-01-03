class GmailHandler {
   
    /**
     * Builds the Gmail Handlers
     * TODO: convert large number of parameters into an object
     * TODO: rename gmailAPI, gmailAuthenticate, etc, with google*, which is more precise
     */
    constructor(gmailAPI, gmailAuthenticate, gmailTokenPath, gmailCredentialsPath, messagesDirectoryPath, fs, fsp, h2t) {
      // googleAPI is an object required from googleapis module
      this.gmailAPI = gmailAPI;
      
      // googleAuthenticate is an object required from @google-cloud/local-auth module
      this.gmailAuthenticate = gmailAuthenticate;

      // scopes are gmail related scopes according to the API.
      // if scope changes, the file token.json should be deleted
      this.gmailScopes = ['https://www.googleapis.com/auth/gmail.readonly'];

      // TODO: make a parameter out of this. Also, see if gmail API allows to find purchase emails with a method for that using labels
      this.gmailQuery = 'compra OR orden OR pedido OR venta';

      // the file token.json stores the user's access and refresh tokens, and is
      // created automatically when the authorization flow completes for the first
      // time. If the file does not exist, authorization will have to be executed again
      this.gmailTokenPath = gmailTokenPath;

      // credentialsPath indicates where the Google APP related credentials are stored
      this.gmailCredentialsPath = gmailCredentialsPath;

      // gmailClient will be returned by gmail API after authorization
      this.gmailClient = null;

      // when listing email, this token will contain the token of the next page
      this.gmailNextPageToken = null;

      // messagesDirectoryPath contains the path in which email snippets will be stored
      this.messagesDirectoryPath = messagesDirectoryPath;

      // fs, fsp are the filesystem, filesystem promise objects and path objects
      // will be used for multiple purposes, like reading credentiales, writing files with emails, etc
      this.fs = fs;
      this.fsp = fsp;
      this.h2t = h2t;

    }
  

    /**
     * Load or request authorization to call Gmail APIs.
     * Returns itsels, so in the future promise more methods can be called in chain
     */
    async authorize() {

      // before trying to ask for user consent (i.e: authorize), check if consent was previously given
      // if so, credentials should be already saved on file
      // if credentials exist on file, this method will attempt to authorize through API
      let client = await this.loadSavedCredentialsIfExist();
      
      // if credentials don't exist, or authentication failed somehow, will attempt to ask permission to user again
      if (client) {
        this.gmailClient = client;
        return this;
      }

      client = await this.gmailAuthenticate({
        scopes: this.gmailScopes,
        keyfilePath: this.gmailCredentialsPath,
      });

      // if credentials were successfully retrieved, save it on a file to avoid unnecesary authentication in the future
      // until credentials expire or are manually deleted
      if (client.credentials) {
        this.gmailClient = client;
        await this.saveCredentials();
      }

      return;
    }

    /**
     * Reads previously authorized credentials from the save file.
     * If successfull, return a Promise that will solve into Gmail client, otherwise return null
     * @return {Promise<OAuth2Client|null>}
     */
    async loadSavedCredentialsIfExist() {
      try {
        const content = await this.fsp.readFile(this.gmailTokenPath);
        const credentials = JSON.parse(content);
        return this.gmailAPI.auth.fromJSON(credentials);

      } catch (err) {
        console.log(err);
        return null;
      }
  }

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
  async saveCredentials() {
      const content = await this.fsp.readFile(this.gmailCredentialsPath);
      const keys = JSON.parse(content);
      const key = keys.installed || keys.web;
      const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: this.gmailClient.credentials.refresh_token,
      });

      await this.fs.writeFile(this.gmailTokenPath, payload, function(err) {
        if (err) {
          console.log('Cannot save credentials');
          console.error(err);
        } else {
          console.log('Credentials saved successfully');
        }
      });

}

/**
 * Simple helper to facilitate access of gmail object to access most common methods
 */
prepareGmail(){
  return this.gmailAPI.gmail({version : 'v1', auth : this.gmailClient});
}

/**
 * Lists the labels in the user's account.
 * TODO: This function is currently not used and was written when trying to better understand gmail API.
 * Yet, a potential improvement to it would be to retrive emails that have "purchase" label, as gmail does certain filtering out of the box
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async listLabels() {
  const gmail = this.prepareGmail();
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });

  return labels;

}

/**
 * Lists purchase related e-mails in the user's account.
 * Returns received messages, and itself for future referencing of methods
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async listPurchaseRelatedEmails() {

    const gmail = this.prepareGmail();
    const listParameters = this.prepareListParameters();
    const res = await gmail.users.messages.list(listParameters);

    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      console.log('No messages found.');
      return null;
    }

    // set the next page token for future calls to the API
    this.gmailNextPageToken = res.data.nextPageToken;

    return messages;

  }

  /**
 * Prepares parameters to invoke list, basically adds next page token if exists
 * If null, object won't travel (as opossed to travelling being null)
 */
  
  prepareListParameters (){

    let listParameters = {
      userId: 'me',
      q : this.gmailQuery,
    }

    if(this.gmailNextPageToken){
      listParameters.pageToken = this.gmailNextPageToken;
    }

    console.log("Listing Page with parameters: ")
    console.log(listParameters)

    return listParameters;
  }


/**
 * Lists purchase related e-mails in the user's account.
 * If email is already found on the FS, it won't be fetched again
 * TODO: remove file writing from this method, and separate logic somewhere else
 */

async saveSnippetsAndExtractSubjectsFromEmails(messages) {

    const gmail = this.prepareGmail();
    let emailSubjects = [];
    
    // create the directory in which all emails and subjects will be stored
    if (!this.fs.existsSync(this.messagesDirectoryPath)){
      this.fs.mkdirSync(this.messagesDirectoryPath);
    }

    for (let i = 0; i < messages.length; i++){

      if(!this.emailExists(messages[i])){
        var messageContent = await gmail.users.messages.get({
          userId: 'me',
          id: messages[i].id,
          format : 'full'
        });

        let messageHeaders = messageContent.data.payload.headers;
        messageHeaders.forEach((header) => {
            if(header.name === "Subject"){
                emailSubjects.push({id: messages[i].id, subject: header.value});
            }
        });

        // Remember that messages[i] only contains and id and thread id, as returned by gmail LIST API
        // on the other hand, messageContent, does have everything related to that email, as per the GET method
        this.saveEmailOnFS(messages[i], messageContent);
        
      }      
    }

    // TODO: these line of code was helfull when developing, unlikely to be needed. Eliminate definetely?
    //await this.fsp.writeFile(`${this.messagesDirectoryPath}/subject-array`, JSON.stringify(emailSubjects));
   
    return emailSubjects;

  }

  async saveEmailOnFS(message, messageContent){
    try {
      
      if(!this.emailDirectoryExists(message)){
        this.fs.mkdirSync(this.emailDirectoryOnFS(message));
      }
      
      const base64EncodedBodyData = messageContent.data.payload.body.data;
            
      if(base64EncodedBodyData){
        const decodedData = Buffer.from(base64EncodedBodyData, 'base64').toString('utf8');
        const decodedDataPlainText = this.h2t.htmlToText(decodedData, {
          wordwrap: 130
        });
        console.log(`Saving entire e-mail: ${message.id}.txt`);
        await this.fsp.writeFile(this.emailNameOnFS(message), decodedDataPlainText);
      }else{
        console.log(`Body is empty - Saving Email Snippet Only: ${message.id}.txt`);
        await this.fsp.writeFile(this.emailNameOnFS(message), messageContent.data.snippet);
      }
      

    } catch (error) {
      console.log(error);
    }
  }


  /**
 * Check if a certain email already exists in the filesystem
 */
  emailDirectoryExists(message){
    let emailDirectory = false;
    emailDirectory = this.fs.existsSync(this.emailDirectoryOnFS(message));
    return emailDirectory;
}
  

  /**
 * Check if a certain email already exists in the filesystem
 */
    emailExists(message){
      let emailExists = false;
      emailExists = this.fs.existsSync(this.emailNameOnFS(message));
      return emailExists;
  }

 /**
 * Given a message, return its directory on filesystem, used for read/write
 */
    emailDirectoryOnFS(message){
      return `${this.messagesDirectoryPath}/id-${message.id}`;
    }

  /**
  * Given a message, return its name on filesystem, used for read/write
 */
    emailNameOnFS(message){
      return this.emailDirectoryOnFS(message) + `/original-${message.id}.txt`;
    }
  
}

module.exports = GmailHandler;