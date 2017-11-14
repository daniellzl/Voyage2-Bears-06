var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./routes');

require('dotenv').config();

var app = express();

console.log(process.env.NEWS_KEY);
console.log(process.env.SEARCH_KEY);

app.use(bodyParser.urlencoded({ extended: false })); // needed to get `req.body` in the POST
app.use(routes);
app.use(express.static('public')); // possible this needs to be more robust, using path.join()
// we'll see what happens when it gets mounted on heroku

var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
