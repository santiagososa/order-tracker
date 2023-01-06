// Require OpenAI API related objects
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require("openai");
const { Console } = require('console');

  
function testPrompt(){
    return "Classify the following text for me: " +
        "The moon rises in the sky. A glowing orb, so bright and high. It casts its light on all below"
        + "A soothing balm, a gentle glow. The stars join in the cosmic dance. A dazzling array of light and chance."
        + "They twinkle, shine, and sparkle bright. A sight to see, a pure delight. So let us gaze up at the night."
        + "And find in it a shining light. For in the darkness, all is clear. And beauty blooms, so bright and dear.";
}

function classifyAndExtractPrompt(text){
    return "Classify the following email as being related to a purchase or not:\n" +
    text + "\nIf this email is related to a purchase, extract relevant information from it."
}

function classifyPrompt(text){
    return "Classify the following email as being related to a purchase or not:\n" + text;
}

function extractPrompt(text){
    return "Extract relevant information from this text:\n" + text;
}

async function createCompletion(prompt) {
    let res = null;

    const promptLength = prompt.toString("utf-8").length;
    
    // TODO: by using a tokenizer, we could check MAX tokens accepted by chat GPT
    // and avoid an unnecesary API call - not a priority now
    
    try {
        res = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        });
        
    } catch (error) {
        if(error.response.status){
            console.error("Error status: " + error.response.status);
        }else{
            console.error("Error without Status - Response: " + error.response);
        }
       return error;
    }

    // return error if exception was triggered, otherwise, return data
    return res.data;
}

async function attemptCompletion(callback, text) {

    let hasFinishedWithout429 = false; 
    let numberOfAttempts = 3;
    let callbackResult = null;
    let timeout = 10000;

    // attempt to do the request multiple times
    while( numberOfAttempts > 0 && !hasFinishedWithout429 ){

        // TODO: using a mutex, we could control between threads if one thread has already
        // thrown 429, and avoid 1 unnecesary API call per thread - not a priority now
        
        //attempt to call API
        callbackResult = await callback(text);
        
        //is this a 429 error? If so, retry
        // otherwse (success or other kind of errors) continue
        // Will also retry if callback Result is undefined
        if(callbackResult instanceof Error){
            if(callbackResult.response && callbackResult.response.status === 429){
                // try a few more times, by creating a delay and going through the while loop again
                await new Promise(resolve => setTimeout(resolve, timeout));
                // wait longer next time
                timeout = timeout*2;
                console.log("Request finished with error 429: " + callbackResult.response.status);
                console.log(`Will attempt request again ${numberOfAttempts-1} more times`);
            } // other error rather 429 happening, return it
            else{
                hasFinishedWithout429 = true;
                console.log("Request finished with error different to 429: " + callbackResult.response.status);
            }
        }else{
            //if successfull, break cycle and return
            hasFinishedWithout429 = true;
            console.log("Request finished successfully: ");

        }
        numberOfAttempts--;
    }

    return callbackResult;

}

async function traverseFilesystem(directory, callback) {
    // Get a list of the files and directories in the given directory
    const files = fs.readdirSync(directory);
  
    // Iterate over the list of files and directories
    for (const file of files) {
      // Construct the full path of the file
      const fullPath = path.join(directory, file);
  
      // Check if the file is a directory
      if (fs.statSync(fullPath).isDirectory()) {
        // If the file is a directory, recursively traverse it
        traverseFilesystem(fullPath, callback);
      } else {
        // If the file is not a directory, check if it is an original email to be processed
        // or if it is an answer, if the latter ignore and go to next (will also ignore any other kind of file)
        // like hidden files
        if(needsToProcessFile(directory, file)){
            //read "original" file with open AI
            const buffer = fs.readFileSync(fullPath);

            //init variables that will be used to save response (including errors)
            const newFileName = file.replace("original-", "processed-");
            const newFullPath = path.join(directory, newFileName);
            const newErrorFileName = file.replace("original-", "error-");
            const newErrorFullPath = path.join(directory, newErrorFileName);

            //since we need to handle api rate limits, we will attempt to process each file three times
            const gptRes = await attemptCompletion(callback, buffer.toString("utf-8"));

            //ignore error most errors (i.e: 400), but handle 429 (i.e: too many requests)
            if(!(gptRes instanceof Error)){
                //capture the first answer, remember gpt might remember one or more "choices"
                console.log("Data returned by GPT contains: ")
                console.log(gptRes);
                if(gptRes.choices && gptRes.choices[0]){
                    const text = gptRes.choices[0].text;
                    //save response into new file prefixed as "processed"
                    fs.writeFileSync(newFullPath, text);
                    //overwrite any potentially old error messages
                    fs.writeFileSync(newErrorFullPath, "No errors on last run.");
                    console.log("New processed file at: " + newFullPath);
                }else{
                    console.log("File processed without answer: " + file);
                    fs.writeFileSync(newErrorFullPath, "File processed yet returned empty answer: " + file);
                }
            }else{
                console.log("File could not be processed due to errors: " + fullPath );
                var errorMessage = "File could not be processed due to errors: " + fullPath + "\n\n\n" + gptRes.toString("utf-8");
                fs.writeFileSync(newErrorFullPath, errorMessage);
            }
        }else{
            console.log("File not supposed to be processed, skipping: " + fullPath );
        }
      }
    }
  }
  
  // if this is an original/raw file with content, we need to check for its processed companion
  function needsToProcessFile(directory, file){
    let res = false;
    if (file.startsWith("original")){
        const newFile = file.replace("original", "processed");
        const newFullPath = path.join(directory, newFile);
        // if the file exists, it does not need to be processed again
        res = !fs.existsSync(newFullPath);
    }
    return res;
  }

const configuration = new Configuration({
apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

traverseFilesystem("./messages-directory",function(text){
    const prompt = classifyPrompt(text);
    return createCompletion(prompt);
});
