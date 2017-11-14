var express = require('express');
var router = express.Router();
var axios = require('axios');

var getNews = require('./getNews');
var searchNews = require('./searchNews');

var financeSources = require('../data/FinanceSources');
var newsSources = require('../data/NewsSources');
var popSources = require('../data/PopSources');
var scienceSources = require('../data/ScienceSources');
var sportsSources = require('../data/SportsSources');
var techSources = require('../data/TechSources');
var sources = {
  finance: financeSources,
  news: newsSources,
  pop: popSources,
  science: scienceSources,
  sports: sportsSources,
  tech: techSources,
};
var categories = Object.keys(sources);
var knownWords = categories.concat('help', 'random');

/**
 *
 * HELPER FUNCTIONS
 *
 */

// we send this `help` response from at least 2 places
function sendHelp(res) {
  return res.json({
    response_type: 'ephemeral',
    text:
      'I am a newsbot. Enter `/news` for the latest headlines.\n\n' +
      'I can look for headlines from six categories: news, sports, finance, pop, science, and tech. Try typing `/news tech` for example.\n\n' +
      'You can also try `/news random` for headlines from a random source, or `/news [category] random` to to mix it up within a category.\n\n' +
      'To find news about a particular search term, try `/news [search-term]` or `/news [category] [search-term]` (where "category" is any of the 6 named above).'
  });
}

function getRandomIndex(array) {
  return Math.floor(Math.random() * array.length);
}

/**
 *
 * SLASH-COMMAND ROUTE: slack POSTs to this route, /news
 *
 */
router.post('/news', function(req, res) {
  // console.log(req.body);

  // sanity check, make sure slack sent us a text string on req.body
  if (typeof req.body.text !== 'string') {
    return res.json({
      response_type: 'ephemeral',
      text: 'Something went wrong...',
    });
  }

  var response_url = req.body.response_url;

  // turn user input into array of words
  var textArr = (function(text) {
    // text is defined
    if (text) {
      var i = 0;
      var j = 0;
      var wordFound = true;
      var result = [];
      while (text[i] != undefined) {
        if (text[i] == ' ' && wordFound) {
          wordFound = false;
          result.push(text.slice(j, i));
        }
        if (text[i] != ' ' && !wordFound) {
          wordFound = true;
          j = i;
        }
        i++;
      }
      result.push(text.slice(j, text.length));
      return result;
    // text isn't defined
    } else {
      return ['news'];
    }
  })(req.body.text);

  // define source(s) to be looked up by newsapi
  var sourceName = '';
  var sourceValue = '';

  // if first word of user input is a known word (i.e. a news category, `help`, or `random`)
  if (knownWords.indexOf(textArr[0]) > -1) {

    // if user inputs '/news' or '/news [category]' or '/news random'
    if (textArr.length === 1) {
      var text = textArr[0];
      if (text === 'help') {
        return sendHelp(res);
      } else if (text === 'news') {
        sourceName = 'Google News';
        sourceValue = 'google-news';
      } else if (text === 'sports') {
        sourceName = 'ESPN';
        sourceValue = 'espn';
      } else if (text === 'finance') {
        sourceName = 'Bloomberg';
        sourceValue = 'bloomberg';
      } else if (text === 'pop') {
        sourceName = 'MTV News';
        sourceValue = 'mtv-news';
      } else if (text === 'tech') {
        sourceName = 'Engadget';
        sourceValue = 'engadget';
      } else if (text === 'science') {
        sourceName = 'New Scientist';
        sourceValue = 'new-scientist';
      } else if (text === 'random') {
        var choosenSources = sources[categories[getRandomIndex(categories)]];
        var choosenSourceIndex = getRandomIndex(choosenSources);
        sourceName = choosenSources[choosenSourceIndex].text;
        sourceValue = choosenSources[choosenSourceIndex].value;
      }
      getNews(sourceValue, process.env.NEWS_KEY, response_url);
      return res.json({
        response_type: 'in_channel',
        text: 'Gathering ' + text + ' headlines from ' + sourceName + '...'
      });

    // if user inputs '/news [category] random'
    } else if (textArr.length === 2 && sources.hasOwnProperty(textArr[0]) && textArr[1] === 'random') {
      var chosenCategory = textArr[0];
      var chosenArray = sources[chosenCategory];
      var randomSource = getRandomIndex(chosenArray);
      sourceName = chosenArray[randomSource].text;
      sourceValue = chosenArray[randomSource].value;
      getNews(sourceValue, process.env.NEWS_KEY, response_url);
      return res.json({
        response_type: 'in_channel',
        text: 'Gathering ' + chosenCategory + ' headlines from ' + sourceName + '...'
      });

    // if user inputs '/news [category] [search-term]'
    } else if (sources.hasOwnProperty(textArr[0])) {
      var category = textArr[0];
      var toSearch = textArr.slice(1);
      searchNews(toSearch, process.env.SEARCH_KEY, response_url, category);
      return res.json({
        response_type: 'in_channel',
        text:
          'Gathering headlines about ' +
          toSearch.join(' ') +
          ' from ' +
          category +
          ' sources' +
          '...',
      });

    // if user inputs '/news random [search-term]' or 'news help [search-term]'
    } else {
      searchNews(textArr, process.env.SEARCH_KEY, response_url);
      return res.json({
        response_type: 'in_channel',
        text: 'Gathering headlines for ' + textArr.join(' ') + '...',
      });
    }

  // if first word of user input is unknown
  } else {
    searchNews(textArr, process.env.SEARCH_KEY, response_url);
    return res.json({
      response_type: 'in_channel',
      text: 'Gathering headlines for ' + textArr.join(' ') + '...',
    });
  }
});

/**
 *
 * INSTALL NEW TEAM: this route will acknowledge and redirect, when a new team
 * installs the app.
 *
 * This URL must be set in the `Redirect URLs` section
 * of the app's settings: https://api.slack.com/apps/A7F31FZ1D/oauth
 *
 */
router.get('/install', function(req, res) {
  // console.log(req.query);

  // slack sends a one-time `code` in the request
  var code = req.query.code;

  // add that code to our id (public) and secret (private) in an `oauth.access` querystring
  var oauthURL =
    'https://slack.com/api/oauth.access?client_id=210281709219.253103543047&client_secret=' +
    process.env.CLIENT_SECRET +
    '&code=' +
    code;

  // Use newly created URL in a GET request to slack's API
  axios
    .get(oauthURL)
    .then(function(response) {
      // console.log(response.data)

      // more complicated 'bots save info from `response.data` in databases, etc.
      // I just use it to create redirect back to installing team's slack page
      res.redirect('http://' + response.data.team_name + '.slack.com');
    })
    .catch(function(error) {
      console.log(error);
      res.send({ message: 'something went wrong' });
    });
});

module.exports = router;
