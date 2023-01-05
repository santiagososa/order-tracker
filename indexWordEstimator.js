// A simple script to estimate the size of emails downloaded by GmailHandler
// Should be usefull to estimate costs from openAI, as well as understanding if 
// Summarizing is needed prior to extracing named entities

const fs = require('fs');
const path = require('path');


// Gets the length of files within a directory of directories
// NOT a recursive/generic function traverses the filesystem, expects a specific directory structure
// Also, this function is SYNC (i.e: blocking of event loop)
// First attempt was to do a recursive/generic, but didn't find elegant and simple way to wait for all the threads to finish
// TODO: spend some extra time understanding how that can be done
function fillFilesLength(dir) {
  
    // Read the contents of the directory.
    const levelOneFiles = fs.readdirSync(dir);
    if (!levelOneFiles || levelOneFiles.length === 0) {
      return;
    }

    // Iterate through the files in the directory.
    levelOneFiles.forEach(levelOneFile => {
      // Construct the full path of the file.
      const levelOneFilePath = path.join(dir, levelOneFile);

      // Check if the file is a directory or a regular file.
      const stat = fs.lstatSync(levelOneFilePath);

        if (stat.isDirectory()) {
          // Read one more level 
          const levelTwoFiles = fs.readdirSync(levelOneFilePath);
          levelTwoFiles.forEach(levelTwoFile => {
            const levelTwoFilePath = path.join(levelOneFilePath, levelTwoFile);
            const levelTwoBuffer = fs.readFileSync(levelTwoFilePath);
            fillFileLength(levelTwoFilePath, levelTwoBuffer);
          });

        } else {
           // If the file is a regular file, open it.
          const levelOneBuffer = fs.readFileSync(levelOneFilePath);
          fillFileLength(levelOneFilePath, levelOneBuffer);
          
        }
    });

    global_results.histogram = calculateHistogram(global_results.processedFilesLengths);
    return;
}

function fillFileLength(filePath, buffer){
    const fileLenght = buffer.toString('utf8').length;
    global_results.processedFilesLengths.push(fileLenght);
    global_results.processedFiles++;
    //console.log("File: " + filePath + " Length:" + fileLenght);
    return;
}




function calculateHistogram(data) {
    
    // Define the ranges.
    const ranges = [
      { start: 0, end: 250 },
      { start: 251, end: 500 },
      { start: 501, end: 1000 },
      { start: 1001, end: 2000 },
      { start: 2000, end: Number.MAX_SAFE_INTEGER },
    ];
  
    // Initialize the histogram object.
    const rangeFrequency = new Array(ranges.length).fill(0);
  
    // Iterate through the data.
    for (const value of data) {
      // Find the range that the value falls into.
      const range = ranges.find(r => value >= r.start && value <= r.end);
      const rangeFrequencyIndex = ranges.indexOf(range);
      rangeFrequency[rangeFrequencyIndex] = rangeFrequency[rangeFrequencyIndex]+1;
    }

    // Return the histogram object (containing the ranges and its frequency)
    // TODO, this map could be avoided, and insert done during insertion
    let histogram = rangeFrequency.map((frequency, frequencyIndex) => {
        //TODO: not sure why console won't display object details if not; investigate
        return { range: JSON.stringify(ranges[frequencyIndex]), frequency };
    });

    return histogram;
  }



// Start reading the file system at the current directory.
var global_results = {};
global_results.processedFiles = 0;
global_results.processedFilesLengths = new Array();
global_results.histogram = {}
fillFilesLength('./messages-directory');

// See what we got!
console.dir(global_results);




