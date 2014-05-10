var page = new WebPage(), 
    stepIndex = 0, 
    loadInProgress = false,
    maxRetrys = 5,
    intervalDelay = 2000,
    retrys = 0,
    system = require('system'),
    args = system.args;

//phantomjs --ignore-ssl-errors=true --ssl-protocol=tlsv1 PhantomRegister.js vsomu3 KansasCity7

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

// page.onLoadStarted = function() {
//   loadInProgress = true;
//   console.log("load started");
// };

// page.onLoadFinished = function() {
//   loadInProgress = false;
//   console.log("load finished");
// };

// page.onAlert = function(msg){
//   console.log("Alert! - " + msg);
// }

page.onResourceError = function(resourceError) {
    page.reason = resourceError.errorString;
    page.reason_url = resourceError.url;
};


// page.onResourceRequested = function (request) {
//     system.stderr.writeLine('= onResourceRequested()');
//     system.stderr.writeLine('  request: ' + JSON.stringify(request, undefined, 4));
// };
 
// page.onResourceReceived = function(response) {
//     system.stderr.writeLine('= onResourceReceived()' );
//     system.stderr.writeLine('  id: ' + response.id + ', stage: "' + response.stage + '", response: ' + JSON.stringify(response));
// };
 
// page.onLoadStarted = function() {
//     system.stderr.writeLine('= onLoadStarted()');
//     var currentUrl = page.evaluate(function() {
//         return window.location.href;
//     });
//     system.stderr.writeLine('  leaving url: ' + currentUrl);
// };
 
// page.onLoadFinished = function(status) {
//     system.stderr.writeLine('= onLoadFinished()');
//     system.stderr.writeLine('  status: ' + status);
// };
 
// page.onNavigationRequested = function(url, type, willNavigate, main) {
//     system.stderr.writeLine('= onNavigationRequested');
//     system.stderr.writeLine('  destination_url: ' + url);
//     system.stderr.writeLine('  type (cause): ' + type);
//     system.stderr.writeLine('  will navigate: ' + willNavigate);
//     system.stderr.writeLine('  from page\'s main frame: ' + main);
// };
 
// page.onResourceError = function(resourceError) {
//     system.stderr.writeLine('= onResourceError()');
//     system.stderr.writeLine('  - unable to load url: "' + resourceError.url + '"');
//     system.stderr.writeLine('  - error code: ' + resourceError.errorCode + ', description: ' + resourceError.errorString );
// };
 
// page.onError = function(msg, trace) {
//     system.stderr.writeLine('= onError()');
//     var msgStack = ['  ERROR: ' + msg];
//     if (trace) {
//         msgStack.push('  TRACE:');
//         trace.forEach(function(t) {
//             msgStack.push('    -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
//         });
//     }
//     system.stderr.writeLine(msgStack.join('\n'));
// };

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

    }, args[1], args[2]); //"vsomu3", "KansasCity7");
    cb(status);

  },
  function enterOscar(cb) {
    // Buzzport page.
    // page.getPage("https://oscar.gatech.edu/pls/bprod/bwskfreg.P_AltPin");
    var status = page.evaluate(function() {
      if(document.title=="BuzzPort"){
        //confirm login, forward to OSCAR
        console.log("Inside Buzzport");
        // var btn=document.createElement("BUTTON");
        // btn.onclick = function(){window.location = "https://oscar.gatech.edu/pls/bprod/bwskfreg.P_AltPin";}
        // btn.click();
        var links = document.links;

        for(var i in links){
          // console.log(links[i].textContent);
          if(links[i].textContent == "Registration - OSCAR "){
            console.log("found something");

            var link = links[i];
            var event = document.createEvent('MouseEvents');
            event.initMouseEvent( 'click', true, true, window, 1, 0, 0 );
            link.dispatchEvent( event );

            return "success";
          }
        }
        return "failure";
        // console.log(document.querySelectorAll('html')[0].outerHTML);
      }
      });

    cb(status);
  },
  function enterStudentServices(cb){
    page.open("https://oscar.gatech.edu/pls/bprod/bwskfreg.P_AltPin", function(){
      // console.log("Student Svcs status: " + status);

      // if ( status !== 'success' ) {
      //     console.log(
      //         "Error opening url \"" + page.reason_url
      //         + "\": " + page.reason
      //     );
      //     phantom.exit( 1 );
      // } else {
      //     console.log( "Successful page open!" );
      //     phantom.exit( 0 );
      // }

      var status = page.evaluate(function(term){

        if(document.title == "Select Term"){
          console.log("on select term page");

          var submitBtn = document.querySelector('input[value=Submit][type=submit]');
          var selector = document.querySelector('select');
          var selectorOpts = selector.options;

          termText = term.replace('-', ' ');
          console.log("term text:"+termText);

          for(var i in selectorOpts){
            if(selectorOpts[i].text == termText){
              selector.value = selectorOpts[i].value;
              submitBtn.click();
              console.log("button click");
              return "success";
            }
          }
        }
        return "failure";

        // console.log(document.querySelectorAll('html')[0].outerHTML);

      }, args[3]);
  
      cb(status);
    });

  },
  function enterRegistration(cb){
    console.log("reg func ent");

    page.render("buzzporter.jpeg", {format: 'jpeg', quality:'100'});

    var status = page.evaluate(function() {
      if(document.title=="Add/Drop Classes:"){
        //confirm login, forward to OSCAR
        console.log("Inside Registration Page");
        

        return "success";
        // console.log(document.querySelectorAll('html')[0].outerHTML);
      }
      return "failure";
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
          console.log("FAILURE");
          phantom.exit();
        }
      }      
    });

  }
  if (typeof steps[stepIndex] != "function") {
    //task success condition
    console.log("SUCCESS");
    phantom.exit();
  }
}, intervalDelay);