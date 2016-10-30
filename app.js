var express = require('express');
var routes = require('./routes');
var tasks = require('./routes/tasks');
var http = require('http');
var path = require('path');
var mongoskin = require('mongoskin');
var app = express();

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = mongoskin.db(mongoURL, {safe:true});

var favicon = require('serve-favicon'),
  logger = require('morgan'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  csrf = require('csurf'),
  errorHandler = require('errorhandler');

app.use(function(req, res, next) {
  req.db = {};
  req.db.tasks = db.collection('tasks');
  next();
})
app.locals.appname = 'Express.js Todo App'
app.locals.moment = require('moment');

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(path.join('public','favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(cookieParser('CEAF3FA4-F385-49AA-8FE4-54766A9874F1'));
app.use(session({
  secret: '59B93087-78BC-4EB9-993A-A61FC844F6C9',
  resave: true,
  saveUninitialized: true
}));
app.use(csrf());

app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  res.locals._csrf = req.csrfToken();
  return next();
})

app.param('task_id', function(req, res, next, taskId) {
  req.db.tasks.findById(taskId, function(error, task){
    if (error) return next(error);
    if (!task) return next(new Error('Task is not found.'));
    req.task = task;
    return next();
  });
});

app.get('/', routes.index);
app.get('/tasks', tasks.list);
app.post('/tasks', tasks.markAllCompleted)
app.post('/tasks', tasks.add);
app.post('/tasks/:task_id', tasks.markCompleted);
app.delete('/tasks/:task_id', tasks.del);
app.get('/tasks/completed', tasks.completed);

app.all('*', function(req, res){
  res.status(404).send();
})
// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
}
http.createServer(app).listen(port, ip, function(){
  console.log('Express server listening on port ' + app.get('port'));
});
