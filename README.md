GT Course Watch (Registration Assistance System)
=====
Access this website at [gtcoursewatch.us](gtcoursewatch.us)


### Running Locally
```
node app.js
```

### Server Deployment
```
chmod +x ./start
./start
```

## Features
### Course Watch
The core of the course watching system is a web scraping poller in Node.js that checks OSCAR for available seats every two minutes or so using setInterval. The system also automatically updates itself for new terms based on the date by using setInterval. Course watch requests are persisted using MongoDB.
### Automated Registration
This feature would not be possible without PhantomJS, which is a really cool and powerful tool. Basically, using the information a user provides, we can log in and register them for a course with Phantom running as a child process of Node.js on the server.
