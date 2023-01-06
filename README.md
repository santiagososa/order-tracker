# order-tracker
**Short version:** an experiment done during holidays that might convert into a powerful order tracker some day (toying around with GPT).

**Long version** (including a personal note)

**Personal Note:**
after almost 10 years without writing code I was starting to feel nostalgic. Nostalgia,
combined with the recent launch of the latest GPT model, combined with our one week holiday season at Nuvemshop and with the fact that I've been closer to the Wallet
team and thinking more about its long term strategy, encouraged me to run some experiments.  

My main goal was to have fun, and to prove myself I was still
able to write some code. It was interesting, as JS was very different in 2013 (i.e: no constants, no arrow functions, no async functions, no awaits, no promises, etc).
Yet, with a little bit of help from chat GPT I was able to do a quick catch up to experiment. Feel free to contibute and expand this as you see fit.

## Why Order Tracker
As we develop Nuvempay (our wallet), we are starting to think about how we can get more consumer engagement and scale. One of the ideas in our mind is that if
we could provide all sort of post purchase order services for consumers (like real time order tracking, returns, access to NFE, etc), we should be able to create more engagement.  

However, truth is that consumers purchase in lot of other places rather than Nuvemshop stores', so we'd figure that if we were able to provide similar service for
purchases done on other places (this can be as wide as buying from a supermarket chain, to a digital asset purchase, or a marketplace purchase, or whatever), we would create
even more engagement. More broadly, if we managed to gather all this information, we could even know better how consumers spend their money, and create credit scoring
to provide them with loans. This would create further engagement in our wallet, more sales for our merchants, as well as a very powerfull monetization channel.

## The challenge
How can we actually get access to purchases done outside Nuvemshop? The answer: virtually every purchase someone does, ends up with a summary on their email.
There aren't usually APIs (except for purchases on larger marketplaces), and the information does not come in a standardized way. Yet, if we managed to get access to those
emails, could it be possibly to do some kind of "intelligent information extraction" (i.e: named entity recognition). Moreover, with the advent of GDP, could this be done
in a easier and even more powerfull way than ever? Finally, is this economically feasible? We believe the answer to all those questions is yes, and we've tried to develop a technological
POC (warning: this is not a real POC, as it has not been tested with users, and will unlikely be in a long-time, for now, this is just a christmas game).  

Two things might make this project fail:
(1) users not granting access to their emails, (2) OpenAI costs becoming too large. Believe (1) can be addressed by adding more value to consumers, and (2) by ruthlessly optimizing API consumption and doing part of the heavy lifting as well, plus, personal loans monetization.

## What has been built here?
We have two simple scripts to get emails from Gmail. First one is called *GmailHandlerClass.js*, this is a simple class (btw, classes didn't exist in javascript last time
I made a commit, neither did Node.js) that handles most API calls, and has the ability to write answers in the filesystem. There is also *indexGmailEmailCapture.js*, this one
simply invokes the previously described class to actually get emails from GmailAPI. It can be invoked with a bash parameter to indicate how many email pages to bring (each page contains 100 emails).  

Emails will be saved in a directory called messages-directory, to be processed by GPT aftewards. Both scripts could be improved dramatically (not going to discuss each potential improvement here), just
the most relevant one which is better analizing email bodies for multiple formats (attachments, pdfs, etc, as right now not always all the information is being downloaded right), but as is should
be enough for the prototype.

There is an auxiliar script called *indexWordEstimator.js*, which creates a histogram of emails downloaded. This is usefull to estimate the costs of invoking GPT API (which can be very expensive, to the point 
it could kill the project feasibility unless ultra optimized), as well as provide a high level idea of size of emails (considering that GPT does not accept more than 2,000 tokens per API request).

Finally, there is a script called *indexExtractRelevantInfo.js*, which invokes GPT foreach file (i.e: email downloaded) and creates a new file with GPT answer. You can play with different Prompts, by simply writing functions
that generate the prompts and call it as a callback (if you don't know what Prompts are, read OpenAI documentation, as everything is achieved through Prompts). Also, lot's of improvements need to be done on this script (i.e: building a class, etc)
but the most urgent one needed is a better handling system to manage http error 429 (i.e: to many requests), as what we have right now won't work for large number of requests. An easier fix is to just wait a couple of minutes, and call the script again.

Besides all these smaller fixes, it would be great to migrate all this to typescript, write a webapp using Nest.js or similar, and a simple React application to show results (as everything has been done through the command line for now).

## How to install / run?
Clone the repo and run npm install to install every dependency.

You will need credentials for Gmail API (you can use mine if you want, send me a slack message, but I will have to manually add your email as a testing user, as the app has not been published; alternatively, create your own App on Google console, following instructions here):
https://developers.google.com/workspace/guides/auth-overview. You will have to write your credentials on credentials.json

Also, you will need OpenAI credentials (instructions on how to get those on their main site). Their key should be placed on your .env file, and you should be good to go.

With that in mind, just call the scripts on the command line using node. If you'd like to play around, start building prompts and see what you get. You'll find opportunities to improve the entire file handling and API handling.
Feel free to go ahead and contribute. Also, you'll learn a lot about using Prompts with real data from your email.

## Some example Prompts you can test:
OpenAI and GPT are ALL about finetunning your Prompts. Here are some examples for your inspiration:
- Is this a purchase related e-mail? Text: 
- Classify this e-mail for me:
- Extract relevant information from this text:
- Extract relevant information from this text, and return it to me in a JSON object
- Perform named entity recognition on this text:

Have fun, just like I did :)






