Node Movie Night
==============

As far as technologies/programs, I have used the following to build up this application:
Visual Studio 2013
NodeJS Tools for Visual Studio
HTML5 & CSS3 
Twitter Bootstrapper
NodeJS
JavaScript
Restful API

**Javascript libraries used:**

- jQuery handles AJAX calls, animations etc.

- RequireJS JS File loading library

- jquery.History Handles adding querystrings to solution

- NotifyJS Handes notifications to the user

**As far as NodeJS Modules, I have made use of the following:**

- cheerio - This is used for the scrapping of the IMDB data.

- faye - The Pub/Sub implementation I used to communicate between the 2 rooms.

- express - Handles the file serving from the Node server

**Known Defects due to time limitations:**

- Limited to 2 players per game at the moment.
- No data persistence to a NoSQL/File system.
- No usage of AngularJS which would simplify the solution.
- No security.
- No unit tests.
- Could definitely look prettier.
- Some animation timing issues.
- Could be definitely optimized.
- Some of the HTTP Verbs should be changed from GET to POST.
- IMDB appear to block the scrapping of movie images after the first few views, which unfortunately leads to blank images and can lead to denial of access to the IMDB page. 
I have added a fallback to a locally saved movies.json file.

The solution has been tested on Windows 7 & Windows 8.1 in Google Chrome v39.0.2171.71

To start the solution, please ensure that you are testing on a machine with NodeJS installed.

Either run the solution from Visual Studio 2013, or open the root of the solution in your command prompt and run:

**node server.js**

The default IP Address and port being used are **127.0.0.1:3000** (or localhost:3000).
You can change this to another IP/Port by changing the **appSettings.json** file located in the root.
You can change some of the game rules by changing the details in the **gameRules.json** file located in the root of the application.
