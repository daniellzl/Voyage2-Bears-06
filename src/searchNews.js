var axios = require('axios');

function searchNews(searchTermArr, key, url, category) {

  var dbCat = '';
  switch (category) {
    case '':
      break;
    case 'finance':
      dbCat = 'dmoz/Business';
      break;
    case 'pop':
      dbCat = 'dmoz/Society/People/Celebrities';
      break;
    case 'tech':
      dbCat = 'dmoz/Computers';
      break;
    case 'science':
      dbCat = 'dmoz/Science';
      break;
    case 'sports':
      dbCat = 'dmoz/Sports';
      break;
    default:
      break;
  }

  var newsMessage = {
    icon_emoji: ':newspaper:',
    text: 'Here\'s the latest for ' + searchTermArr.join(' '),
    attachments: [],
  };

  var queryURL =
    'http://eventregistry.org/json/article?query={"$query":{"$and":[{"keyword":{"$and":' +
    JSON.stringify(searchTermArr) +
    '}},{"lang":"eng"}]}}&action=getArticles&resultType=articles&articlesSortBy=date&articlesCount=10&apiKey=' +
    key;

  if (dbCat !== '') {
    queryURL =
      'http://eventregistry.org/json/article?query={"$query":{"$and":[{"categoryUri":"' +
      dbCat +
      '"},{"keyword":{"$and":' +
      JSON.stringify(searchTermArr) +
      '}},{"lang":"eng"}]}}&action=getArticles&resultType=articles&articlesSortBy=date&articlesCount=10&apiKey=' +
      key;
  }

  axios
    .get(queryURL)
    .then(function(reply) {
      // get relevant information from articles
      reply.data.articles.results.forEach(function(result) {
        if (!result.isDuplicate) {
          newsMessage.attachments.push({
            fallback: 'A News Headline',
            text: result.body,
            title_link: result.url,
            title: result.title,
            color: '#' + Math.floor(Math.random() * 16777215).toString(16), // rnd hex color
          });
        }
      });
      axios.post(url, newsMessage);
    })
    .catch(function(e) {
      newsMessage.attachments.push({
        fallback: 'an error occured',
        text: 'News for ' + searchTermArr.join(' ') + ' could not be found.',
      });
      axios.post(url, newsMessage);
    });
}

module.exports = searchNews;
