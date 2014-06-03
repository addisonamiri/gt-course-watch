GTCourseWatch (Registration Assistance System)
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
### Course Watch
A request to the server is made to scrape oscar for course information, which is then displayed in an animated pie chart made with Mike Bostock's fantastic d3.js data visualization library.
### Live Chat
Since I decided to experiment with WebSockets and socket.io when I started this project, adding live chat was quite simple. WebSockets are the supposed to be the future, and I can totally believe it.
