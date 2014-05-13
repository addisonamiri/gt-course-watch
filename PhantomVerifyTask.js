var page = new WebPage(), 
    stepIndex = 0, 
    loadInProgress = false,
    maxRetrys = 5,
    intervalDelay = 2000,
    retrys = 0,
    args = require('system').args;

// if (args.length === 1) {
//   console.log('Try to pass some arguments when invoking this script!');
// } else {
//   args.forEach(function(arg, i) {
//     console.log(i + ': ' + arg);
//   });
// }

page.onConsoleMessage = function(msg) {
  console.log(msg);
};

page.onLoadStarted = function() {
  loadInProgress = true;
  console.log("load started");
};

page.onLoadFinished = function() {
  loadInProgress = false;
  console.log("load finished");
};

// page.onAlert = function(msg){
//   console.log("Alert! - " + msg);
// }

var steps = [
  function enterLogin(cb) {
    //Load Login Page
    page.open("https://buzzport.gatech.edu/cp/home/displaylogin", function(){
      var status = page.evaluate(function(){
        if(document.title == "BuzzPort Login"){
          document.getElementById('login_btn').click();
          return "success";
        }else{
          //couldn't reach login entrance
          return "failure";
        }
      
      });
      cb(status);
    });
  },
  function loginSubmit(cb) {
    //Enter Credentials and login to buzzport
    
    var status = page.evaluate(function(username, password) {
      if(document.title=="GT | GT Login"){
        document.getElementById("username").value = username;
        document.getElementById("password").value = password;
        document.getElementsByClassName("btn-submit")[0].click();
        return "success";      
      }else{
        //haven't loaded GT login page yet, so 
        return "failure";
      }

    }, args[1], args[2]);
    cb(status);

  },
  function confirmLogin(cb) {
    // Buzzport page.
    var status = page.evaluate(function() {
      if(document.title=="BuzzPort"){
        //confirm login
        // console.log(document.querySelectorAll('html')[0].outerHTML);
        return "success";
      }else{
        //couldn't confirm
        return "failure";
      }
    });
    cb(status);
  }
];

setInterval(function() {

  if (!loadInProgress && typeof steps[stepIndex] == "function") {

    steps[stepIndex](function(status){
      if(status=="success"){
        stepIndex++;
        retrys = 0;
      }else{
        retrys = retrys + 1;
        if(retrys > maxRetrys){
          //task failure condition
          console.log("VERIFICATION_FAILURE");
          phantom.exit();
        }
      }      
    });

  }
  if (typeof steps[stepIndex] != "function") {
    //task success condition
    console.log("VERIFICATION_SUCCESS");
    phantom.exit();
  }
}, intervalDelay);