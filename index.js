// This is template files for developing Alexa skills

'use strict';
var AWS = require("aws-sdk");
AWS.config.update({
  region: "us-east-1",
});
var ses = new AWS.SES({
   region: 'us-east-1'
});
var dataurl = 'update it with your db server (mine was hasura, running on heroku)';

var winston = require('winston');
const uuidV4 = require('uuid/v4');
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ prettyPrint: true, timestamp: true, json: false, stderrLevels:['error']})
    ]
  });

var intentHandlers = {};

if(process.env.NODE_DEBUG_EN) {
  logger.level = 'debug';
}

const { execute } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');
const ws = require('ws');
  

exports.handler = function (event, context) {
    try {
        console.log(event.request);
        logger.info('event.session.application.applicationId=' + event.session.application.applicationId);
        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
         }
        
        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        logger.debug('Incoming request:\n', JSON.stringify(event,null,2));

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }


        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request, event.session, new Response(context,event.session));
        } else if (event.request.type === 'IntentRequest') {
            var response =  new Response(context,event.session);
            if (event.request.intent.name in intentHandlers) {
              intentHandlers[event.request.intent.name](event.request, event.session, response,getSlots(event.request));
            } else {
              response.speechText = 'Unknown intent';
              response.shouldEndSession = true;
              response.done();
            }
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail('Exception: ' + getError(e));
    }
};



var https = require('https');
function buildHttpGetOptions(accessToken) {
    return {
        host: 'mynurse2.auth.us-east-1.amazoncognito.com',
        port: 443,
        path: '/oauth2/userInfo',
        method: 'GET',
        headers: {
            'authorization': 'Bearer ' + accessToken
        }
    };
}

function httpGet(options) {
    return new Promise(((resolve, reject) => {
        var request = https.request(options, (response) => {
            response.setEncoding('utf8');
            let returnData = '';

            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
            }

            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                console.log({ returnData });
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    }));
}


function getSlots(req) {
  var slots = {}
  for(var key in req.intent.slots) {
    slots[key] = req.intent.slots[key].value;
  }
  return slots;
}

var Response = function (context,session) {
  this.speechText = '';
  this.shouldEndSession = true;
  this.ssmlEn = true;
  this._context = context;
  this._session = session;

  this.done = function(options) {

    if(options && options.speechText) {
      this.speechText = options.speechText;
    }

    if(options && options.repromptText) {
      this.repromptText = options.repromptText;
    }

    if(options && options.ssmlEn) {
      this.ssmlEn = options.ssmlEn;
    }

    if(options && options.shouldEndSession) {
      this.shouldEndSession = options.shouldEndSession;
    }

    this._context.succeed(buildAlexaResponse(this));
  }

  this.fail = function(msg) {
    logger.error(msg);
    this._context.fail(msg);
  }

};

function createSpeechObject(text,ssmlEn) {
  if(ssmlEn) {
    return {
      type: 'SSML',
      ssml: '<speak>'+text+'</speak>'
    }
  } else {
    return {
      type: 'PlainText',
      text: text
    }
  }
}

function buildAlexaResponse(response) {
  var alexaResponse = {
    version: '1.0',
    response: {
      outputSpeech: createSpeechObject(response.speechText,response.ssmlEn),
      shouldEndSession: response.shouldEndSession
    }
  };

  if(response.repromptText) {
    alexaResponse.response.reprompt = {
      outputSpeech: createSpeechObject(response.repromptText,response.ssmlEn)
    };
  }

  if(response.cardTitle) {
    alexaResponse.response.card = {
      type: 'Simple',
      title: response.cardTitle
    };

    if(response.imageUrl) {
      alexaResponse.response.card.type = 'Standard';
      alexaResponse.response.card.text = response.cardContent;
      alexaResponse.response.card.image = {
        smallImageUrl: response.imageUrl,
        largeImageUrl: response.imageUrl
      };
    }
    if(response.cardType) {
      alexaResponse.response.card.type = 'LinkAccount';
    }

    else {
      alexaResponse.response.card.content = response.cardContent;
    }
  }

  if (!response.shouldEndSession && response._session && response._session.attributes) {
    alexaResponse.sessionAttributes = response._session.attributes;
  }
  logger.debug('Final response:\n', JSON.stringify(alexaResponse,null,2),'\n\n');
  return alexaResponse;
}

function getError(err) {
  var msg='';
  if (typeof err === 'object') {
    if (err.message) {
      msg = ': Message : ' + err.message;
    }
    if (err.stack) {
      msg += '\nStacktrace:';
      msg += '\n====================\n';
      msg += err.stack;
    }
  } else {
    msg = err;
    msg += ' - This error is not object';
  }
  return msg;
}


//--------------------------------------------- Skill specific logic starts here ----------------------------------------- 
//

//Add your skill application ID from amazon devloper portal
var APP_ID = 'update it with your skill';

function onSessionStarted(sessionStartedRequest, session) {
    logger.debug('onSessionStarted requestId=' + sessionStartedRequest.requestId + ', sessionId=' + session.sessionId);
    // add any session init logic here
    
}

function onSessionEnded(sessionEndedRequest, session) {
  logger.debug('onSessionEnded requestId=' + sessionEndedRequest.requestId + ', sessionId=' + session.sessionId);
  // Add any cleanup logic here
  
}

function onLaunch(launchRequest, session, response) {
  logger.debug('onLaunch requestId=' + launchRequest.requestId + ', sessionId=' + session.sessionId);
  response.speechText = "Welcome to Docs skill. Using this skill you can store your health parameters easily. You can say, record that my heart beat is 72";
  response.repromptText = "What you want to do? You can say, store my heart beat is 72 or send records to my doctor";

  response.shouldEndSession = false;
  response.done();
}


/** For each intent write a intentHandlers
Example:
intentHandlers['HelloIntent'] = function(request,session,response,slots) {
  //Intent logic
  
}
**/

// var bcrypt = require('bcryptjs');
var AWS = require("aws-sdk");
AWS.config.update({
  region: "us-east-1",
});

// var Promise = require('bluebird');
// var MAX_READ_MESSAGES = 3;
// var MAX_MESSAGES = 20;
// var docClient = new AWS.DynamoDB.DocumentClient();


intentHandlers['DataRecordIntent'] = async function(request,session,response,slots) {
  // Intent logic
  if (session.user.accessToken === undefined) {
    response.speechText = "You are not logged in. You need to login from Alexa app. Please see Alexa app for more information.";
    response.cardTitle = "Docs-Account Setup";
    response.cardType = "LinkAccount";
    response.shouldEndSession = true;
    response.done();
  }else{
    var accessToken = session.user.accessToken;
      try {
        var tokenOptions = buildHttpGetOptions(accessToken);
        var response2 = await httpGet(tokenOptions);
        console.log({ response2 });
        var  email = response2.email;
        }
         catch (e) {
           context.fail('Exception: ' + getError(e));
          }
    let Parameter = request.intent.slots.Parameter.value;
    let Value = request.intent.slots.value.value;
    let Unit = request.intent.slots.unit.value;
    if ( Unit !== undefined ){
      Value=Value+" "+Unit;
    }
    
    if(Parameter === undefined || Parameter === "?") {
    response.speechText = 'Looks like you forgot to mention Health parameter. you can say, my heart rate is 72. ';
    response.repromptText = 'you can store a health record or send reports to your doctor. To send reports say, send my reports to the doctor.';
    response.shouldEndSession = false;
    response.done();
    return;
     }
     if(Value === undefined || Value === "?") {
    response.speechText = 'Looks like you forgot to mention Value of health parameter. for example, you can say, my heart rate is 72. ';
    response.repromptText = 'you can store a health record or send reports to your doctor. To send reports say, send my reports to the doctor.';
    response.shouldEndSession = false;
    response.done();
    return;
     }
    
    let ID = uuidV4().toString();
    var myDate = new Date();
    var day = myDate.getUTCDate().toString();
    var Timestamp = request.timestamp.toString();
    const gql = require('graphql-tag');
    response.shouldEndSession=true;
    const MUTATION_QUERY = gql`
      mutation insert_Record($email:String!,$parameter:String!,$value:Int!,$id:String!,$date:String!,$time:String!) {
  insert_MyNurse_Users2(objects: [{ID: $id, Email: $email, Date: $date, Time:$time}]) {
    affected_rows
  }
  insert_MyNurse_Data2(objects: [{ID: $id, Parameter: $parameter, Value: $value}]) {
    affected_rows
  }
}
  `;
  
const getWsClient = function(wsurl) {
const client = new SubscriptionClient(
    wsurl, {reconnect: true}, ws
  );
  return client;
};
const createSubscriptionObservable = (wsurl, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl));
  return execute(link, {query: query, variables: variables});
};

  
  const subscriptionClient = createSubscriptionObservable(dataurl,
    MUTATION_QUERY, 
    {email:email,parameter:Parameter,value:Value,id:ID,date:day,time:Timestamp}                  
  );
  var consumer = subscriptionClient.subscribe(eventData => {
    console.log("Received event: ");
    console.log(JSON.stringify(eventData, null, 2));
    response.speechText= "I have stored that your "+Parameter+" is"+Value;
    response.cardTitle="Docs";
    response.cardContent=`I have stored that your ${Parameter} is ${Value}`;
    response.done();
  }, (err) => {
    console.log('Err');
    console.log(err);
    response.speechText= "There is some error";
    response.done();
  });
}
};

var email="";
var Username="";
intentHandlers['DataRetrieveIntent'] = async function(request,session,response,slots) {
  // Intent logic
  if (session.user.accessToken === undefined) {
    response.speechText = "You are not logged in. You need to login from Alexa app. Please see Alexa app for more information.";
    response.cardTitle = "Docs - Account Setup";
    response.cardType = "LinkAccount";
    response.shouldEndSession = true;
    response.done();
  }else{
    var accessToken = session.user.accessToken;
      try {
        var tokenOptions = buildHttpGetOptions(accessToken);
        var response2 = await httpGet(tokenOptions);
        console.log({ response2 });
        email = response2.email;
        Username = response2.name;
        var doc_email=response2.profile;
        }
         catch (e) {
           context.fail('Exception: ' + getError(e));
          }
          
    const gql = require('graphql-tag');
    response.shouldEndSession=true;
    const MUTATION_QUERY = gql`
    query lol($email: String!) {
  MyNurse_Users2(where: {Email: {_eq: $email}},,order_by: Time_desc) {
    Time
    Email
    mynurseData2sByid {
      Parameter
      Value
    }
  }
}
`;
  
const getWsClient = function(wsurl) {
const client = new SubscriptionClient(
    wsurl, {reconnect: true}, ws
  );
  return client;
};
const createSubscriptionObservable = (wsurl, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl));
  return execute(link, {query: query, variables: variables});
};

  var email_sub="Health Report of "+ Username;
  const subscriptionClient = createSubscriptionObservable(dataurl,
    MUTATION_QUERY, 
    {"email":email}                  
  );
  var consumer = subscriptionClient.subscribe(eventData => {
    console.log("Received event: ");
    console.log(JSON.stringify(eventData, null, 2));
    var lol=eventData;
    var HTML='<html><head><style type="text/css">table,td,th{padding: 7px;text-align: center; border: 1px solid rgb(8,48,107);border-collapse:collapse;border-spacing:0;}</style></head><body style="width:80%">';
    HTML=HTML.concat('<h3>Health Records: '+ Username +'</h3><h5>Patient email: '+ email+'</h5><br><br>');
    HTML=HTML.concat('<center><table style="width:80%; font-family: "Helvetica", "Lucida Sans", "Lucida Sans Unicode", "Luxi Sans", Tahoma, sans-serif; box-shadow: 1px 1px 10px rgba(0,0,0,0.5);border-collapse: collapse;border-spacing: 0;margin: auto;padding: 7px;text-align: center;border: 1px solid rgb(8,48,107); width:80%;"><thead style="color: white;background-color: rgb(8,81,156);"><tr><th>Date / Time</th><th>Parameter</th><th>Value</th></tr></thead><tbody>');
    for (var i = 0; i < (lol.data.MyNurse_Users2.length); i++) {
    var tImE = lol.data.MyNurse_Users2[i].Time;
    var PaRaMeTeR = lol.data.MyNurse_Users2[i].mynurseData2sByid[0].Parameter;
    var VaLuE = lol.data.MyNurse_Users2[i].mynurseData2sByid[0].Value;
    var st = "<tr><td>"+ tImE +"</td><td>"+ PaRaMeTeR +"</td><td>"+ VaLuE +"</td></tr>";
    HTML=HTML.concat(st);
    }
    HTML= HTML.concat("</tbody></table></center><p>powered by: Docs, Alexa Skill</body></html>");
    var eParams = {
        Destination: {
            ToAddresses: [doc_email]
        },
        Message: {
            Body: {
                Html: {
                    Data: HTML
                }
            },
            Subject: {
                Data: email_sub
            }
        },
        Source: "siddharthshubhampal@gmail.com"
    };
    var MSGBODY_DOC_EMAIL_ERR = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>[SUBJECT]</title><style type="text/css">@media screen and (max-width: 600px){table[class="container"]{width: 95% !important;}}#outlook a{padding:0;}body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;}.ExternalClass{width:100%;}.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div{line-height: 100%;}#backgroundTable{margin:0; padding:0; width:100% !important; line-height: 100% !important;}img{outline:none; text-decoration:none; -ms-interpolation-mode: bicubic;}a img{border:none;}.image_fix{display:block;}p{margin: 1em 0;}h1, h2, h3, h4, h5, h6{color: black !important;}h1 a, h2 a, h3 a, h4 a, h5 a, h6 a{color: blue !important;}h1 a:active, h2 a:active, h3 a:active, h4 a:active, h5 a:active, h6 a:active{color: red !important;}h1 a:visited, h2 a:visited, h3 a:visited, h4 a:visited, h5 a:visited, h6 a:visited{color: purple !important;}table td{border-collapse: collapse;}table{border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;}a{color: #000;}@media only screen and (max-device-width: 480px){a[href^="tel"], a[href^="sms"]{text-decoration: none;color: black; /* or whatever your want */pointer-events: none;cursor: default;}.mobile_link a[href^="tel"], .mobile_link a[href^="sms"]{text-decoration: default;color: orange !important; /* or whatever your want */pointer-events: auto;cursor: default;}}@media only screen and (min-device-width: 768px) and (max-device-width: 1024px){a[href^="tel"], a[href^="sms"]{text-decoration: none;color: blue; /* or whatever your want */pointer-events: none;cursor: default;}.mobile_link a[href^="tel"], .mobile_link a[href^="sms"]{text-decoration: default;color: orange !important;pointer-events: auto;cursor: default;}}@media only screen and (-webkit-min-device-pixel-ratio: 2){/* Put your iPhone 4g styles in here */}@media only screen and (-webkit-device-pixel-ratio:.75){/* Put CSS for low density (ldpi) Android layouts in here */}@media only screen and (-webkit-device-pixel-ratio:1){/* Put CSS for medium density (mdpi) Android layouts in here */}@media only screen and (-webkit-device-pixel-ratio:1.5){/* Put CSS for high density (hdpi) Android layouts in here */}/* end Android targeting */h2{color:#181818;font-family:Helvetica, Arial, sans-serif;font-size:22px;line-height: 22px;font-weight: normal;}a.link1{}a.link2{color:#fff;text-decoration:none;font-family:Helvetica, Arial, sans-serif;font-size:16px;color:#fff;border-radius:4px;}p{color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;}</style><script type="colorScheme" class="swatch active">{"name":"Default", "bgBody":"ffffff", "link":"fff", "color":"555555", "bgItem":"ffffff", "title":"181818"}</script></head><body><table cellpadding="0" width="100%" cellspacing="0" border="0" id="backgroundTable" class="bgBody"><tr><td><table cellpadding="0" width="620" class="container" align="center" cellspacing="0" border="0"><tr><td><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td class="movableContentContainer bgItem"><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr height="40"><td width="200">&nbsp;</td><td width="200">&nbsp;</td><td width="200">&nbsp;</td></tr><tr><td width="200" valign="top">&nbsp;</td><td width="200" valign="top" align="center"><div class="contentEditableContainer contentImageEditable"> <div class="contentEditable" align="center" > <img src="https://s3.amazonaws.com/mynurse/logo.png" width="155" height="155" alt="Logo" data-default="placeholder"/> </div></div></td><td width="200" valign="top">&nbsp;</td></tr><tr height="25"><td width="200">&nbsp;</td><td width="200">&nbsp;</td><td width="200">&nbsp;</td></tr></table></div><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100%" colspan="3" align="center" style="padding-bottom:10px;"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="center" > <h2 style="margin-top: -15px; font-weight: 500; font-size: 2em">Docs</h2> <p style="color:#ccc;margin-top: -15px">Alexa Skill</p></div></div></td></tr><tr><td width="100">&nbsp;</td><td width="400" align="center"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <p >Hi '+Username+', <br/> <br/>Looks like you have just asked Alexa to update your doctor&apos;s email! <br/>To update this, you only need to reply with a valid email address and let <b>Alexa</b> do the rest :)</p></div></div></td><td width="100">&nbsp;</td></tr></table><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="200">&nbsp;</td><td width="200" align="center" style="padding-top:25px;"><table cellpadding="0" cellspacing="0" border="0" align="center" width="200" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="200" height="50"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="center" > <a href="mailto:siddharthshubhampal@gmail.com?Subject=[Docs]%20Doctors%20Email%20Update&body=Hi%20there,%0A%0AMy%20doctors%20email:%20%0A%0AThank you." class="link2" target="_top">Reply</a> </div></div></td></tr></table></td><td width="200">&nbsp;</td></tr></table><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100">&nbsp;</td><td width="400" align="center"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <p style="padding-top: 20px">PS: You can also update doctor&apos;s email with your own email to get all the records in your inbox.</p></div></div></td><td width="100">&nbsp;</td></tr></table></div><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100%" colspan="2" style="padding-top:5px;"><hr style="height:1px;border:none;color:#333;background-color:#ddd;"/></td></tr><tr><td width="60%" height="70" valign="middle" style="padding-bottom:20px;"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;">Sent from <b>Docs</b> by Alexa</span><br/><!-- <span style="font-size:11px;color:#555;font-family:Helvetica, Arial, sans-serif;line-height:200%;">[CLIENTS.ADDRESS] | [CLIENTS.PHONE]</span><br/><span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;"><a target="_blank" href="[FORWARD]" style="text-decoration:none;color:#555">Forward to a friend</a></span><br/><span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;"><a target="_blank" href="[UNSUBSCRIBE]" style="text-decoration:none;color:#555">click here to unsubscribe</a></span> --> </div></div></td><td width="40%" height="70" align="right" valign="top" align="right" style="padding-bottom:20px;"><!-- <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right"><tr><td width="57%"></td><td valign="top" width="34"><div class="contentEditableContainer contentFacebookEditable" style="display:inline;"> <div class="contentEditable" > <img src="images/facebook.png" data-default="placeholder" data-max-width="30" data-customIcon="true" width="30" height="30" alt="facebook" style="margin-right:40x;"> </div></div></td><td valign="top" width="34"><div class="contentEditableContainer contentTwitterEditable" style="display:inline;"> <div class="contentEditable" > <img src="images/twitter.png" data-default="placeholder" data-max-width="30" data-customIcon="true" width="30" height="30" alt="twitter" style="margin-right:40x;"> </div></div></td><td valign="top" width="34"><div class="contentEditableContainer contentImageEditable" style="display:inline;"> <div class="contentEditable" > <a target="_blank" href="#" data-default="placeholder" style="text-decoration:none;"><img src="images/pinterest.png" width="30" height="30" data-max-width="30" alt="pinterest" style="margin-right:40x;"/></a> </div></div></td></tr></table> --></td></tr></table></div></td></tr></table></td></tr></table></td></tr></table><!--Default Zone <div class="customZone" data-type="image"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" align="center" width="600"> <tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" colspan="3" align="center" style="padding-bottom:10px;padding-top:25px;"><div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" data-max-width="500"> </div></div></td><td width="50">&nbsp;</td></tr></table> </div></div><div class="customZone" data-type="text"> <div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600"><tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center" style="padding-bottom:10px;padding-top:25px;"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <h2 >Make sure you’re recognizable</h2> </div></div></td><td width="50">&nbsp;</td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <p ><p>Include both the name of the person who’s sending the email as well as the name of the company, and even better: send using your own domain.</p></p></div></div></td><td width="50">&nbsp;</td></tr><tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center" ><table cellpadding="0" cellspacing="0" border="0" align="center" width="400" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="400" height="50"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" style="text-align:center;"> <a target="_blank" href="[CLIENTS.WEBSITE]" class="link2">Read the 3 rules of email marketing sender etiquette</a> </div></div></td></tr></table></td><td width="50">&nbsp;</td></tr><tr><td height="10" colspan="3"></td></tr></table></div></div><div class="customZone" data-type="imageText"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td colspan="5" height="30"></td></tr><tr> <td width="50"></td><td valign="top" width="150"> <div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" width="150" data-max-width="150"> </div></div></td><td width="20"></td><td valign="top" width="250"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="Textimage"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td colspan="5" height="30"></td></tr><tr> <td width="50"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. </p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="20"></td><td valign="top" width="150"> <div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" width="150" data-max-width="150"> </div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="textText"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p >Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="40"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="qrcode"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" > <div class="contentQrcodeEditable contentEditableContainer"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/qr_code.png" width="75" height="75" data-default="placeholder"> </div></div></td><td width="20"></td><td valign="top"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. Cras tincidunt, justo at fermentum feugiat, eros orci accumsan dolor, eu ultricies eros dolor quis sapien. Curabitur in turpis sem, a sodales purus. Pellentesque et risus at mauris aliquet gravida.</p><p style="text-align:left;">Integer in elit in tortor posuere molestie non a velit. Pellentesque consectetur, nisi a euismod scelerisque.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="social"> <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" width="230" align="center"> <div class="contentEditableContainer contentFacebookEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/facebook.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Facebook</h2> <p>Like us on Facebook to keep up with our news, updates and other discussions.</p></div></div></td><td width="40"></td><td valign="top" width="230" align="center"> <div class="contentEditableContainer contentTwitterEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/twitter.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Twitter</h2> <p>Follow us on twitter to stay up to date with company news and other information.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="twitter"> <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="3"></td></tr><tr> <td width="50"></td><td valign="top" align="center"> <div class="contentEditableContainer contentTwitterEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/twitter.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Twitter</h2> <p>Follow us on twitter to stay up to date with company news and other information.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="facebook" > <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="3"></td></tr><tr> <td width="50"></td><td valign="top" align="center"> <div class="contentEditableContainer contentFacebookEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/facebook.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2>Facebook</h2> <p>Like us on Facebook to keep up with our news, updates and other discussions.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="gmap"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" > <div class="contentGmapEditable contentEditableContainer"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/gmap_example.png" width="75" data-default="placeholder"> </div></div></td><td width="20"></td><td valign="top"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. Cras tincidunt, justo at fermentum feugiat, eros orci accumsan dolor, eu ultricies eros dolor quis sapien. Curabitur in turpis sem, a sodales purus. Pellentesque et risus at mauris aliquet gravida.</p><p style="text-align:left;">Integer in elit in tortor posuere molestie non a velit. Pellentesque consectetur, nisi a euismod scelerisque.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums1v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="500" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums2v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="235" align="center" valign="top" class="newcontent"> </td><td width="30"></td><td width="235" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums3v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="12"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="12"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="textv2"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <h2 >Make sure you’re recognizable</h2> </div></div><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" ><p>Include both the name of the person who’s sending the email as well as the name of the company, and even better: send using your own domain.</p></div></div><table cellpadding="0" cellspacing="0" border="0" align="center" width="79%" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="100%" height="50"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" style="text-align:center;"> <a target="_blank" href="[CLIENTS.WEBSITE]" class="link2">Read the 3 rules of email marketing sender etiquette</a> </div></div></td></tr></table> </div>--></body></html>';
    var eParams2 = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: MSGBODY_DOC_EMAIL_ERR
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "[Docs] Doctors Email Update"
            }
        },
        Source: "siddharthshubhampal@gmail.com"
    };
    var email2 = ses.sendEmail(eParams, function(err, data){
        if(err) {
          console.log("SEND_DOC_EMAIL_ERR "+err);
          response.speechText= "looks like you have not updated your doctors email. Our Developers will contact you within 24 hours to resolve it, See Ya!";
          var email3 = ses.sendEmail(eParams2, function(err,data){
            if(err) {console.log("SEND_NOTICE_DOC_EMAIL_ERR "+err);}
          response.done();});
        }
        else {
            console.log(doc_email);
            console.log("===EMAIL SENT===");
            console.log(data);
            console.log("EMAIL CODE END");
            console.log('EMAIL: ', email2);
            response.speechText= "Email sent successfully";
            response.done();
        }
    });
    
            
  },(err) => {
    console.log('Err');
    console.log(err);
    response.speechText= "There is some error";
    response.done();
  });
}
};

intentHandlers['AMAZON.StopIntent'] = function(request,session,response,slots) {
  response.speechText  = `Good Bye. `;
  response.shouldEndSession = true;
  response.done();
};

intentHandlers['AMAZON.HelpIntent'] = function(request,session,response,slots) {
  response.speechText  = `you can store a health record or send reports to your doctor. you can store records by saying, my heart rate is 72. and to send report, you can say send my reports to my doctor.`;
  response.repromptText = "you can say my heart rate is 72 and I will store this information for future records."
  response.shouldEndSession = false;
  response.done();
};

intentHandlers['AMAZON.CancelIntent'] = function(request,session,response,slots) {
  response.speechText  = `OK, Good Bye. `;
  response.shouldEndSession = true;
  response.done();
};

intentHandlers['DoctorsEmailIntent'] = async function(request,session,response,slots) {
  // Intent logic
  if (session.user.accessToken === undefined) {
    response.speechText = "You are not logged in. You need to login from Alexa app. Please see Alexa app for more information.";
    response.cardTitle = "Docs - Account Setup";
    response.cardType = "LinkAccount";
    response.shouldEndSession = true;
    response.done();
  }else{
    var accessToken = session.user.accessToken;
      try {
        var tokenOptions = buildHttpGetOptions(accessToken);
        var response2 = await httpGet(tokenOptions);
        console.log({ response2 });
        email = response2.email;
        Username = response2.name;
        var doc_email=response2.profile;
        }
         catch (e) {
           context.fail('Exception: ' + getError(e));
        }
        var check = doc_email.indexOf("@");
        if ( check === -1 ){
          response.ssmlEn= "SSML";
          response.speechText = "<say-as interpret-as='interjection'>uh oh.</say-as> looks like there is no doctors email address. To add one in your account, you can simply ask me to update the doctors email.";
          response.shouldEndSession = false;
          response.repromptText = "Doctors email address is the address where I'll share your health report. To update it say, Alexa, I want to update my doctors email. ";
          response.done();
        }else{
          response.speechText = "Your doctors email address is "+doc_email+". You can always update it by saying, Alexa, tell Docs that I want to update my doctors email.";
          response.shouldEndSession = true;
          response.done();
        }   
  }
};

intentHandlers['UpdateDocEmailIntent'] = async function(request,session,response,slots) {
  // Intent logic
  if (session.user.accessToken === undefined) {
    response.speechText = "You are not logged in. You need to login from Alexa app. Please see Alexa app for more information.";
    response.cardTitle = "Docs - Account Setup";
    response.cardType = "LinkAccount";
    response.shouldEndSession = true;
    response.done();
  }else{
    var accessToken = session.user.accessToken;
      try {
        var tokenOptions = buildHttpGetOptions(accessToken);
        var response2 = await httpGet(tokenOptions);
        console.log({ response2 });
        email = response2.email;
        Username = response2.name;
        var doc_email=response2.profile;
        var locale = request.locale;
        }
         catch (e) {
           context.fail('Exception: ' + getError(e));
          }
    
    
    var MSGBODY_DOC_EMAIL_ERR = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>[SUBJECT]</title><style type="text/css">@media screen and (max-width: 600px){table[class="container"]{width: 95% !important;}}#outlook a{padding:0;}body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;}.ExternalClass{width:100%;}.ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div{line-height: 100%;}#backgroundTable{margin:0; padding:0; width:100% !important; line-height: 100% !important;}img{outline:none; text-decoration:none; -ms-interpolation-mode: bicubic;}a img{border:none;}.image_fix{display:block;}p{margin: 1em 0;}h1, h2, h3, h4, h5, h6{color: black !important;}h1 a, h2 a, h3 a, h4 a, h5 a, h6 a{color: blue !important;}h1 a:active, h2 a:active, h3 a:active, h4 a:active, h5 a:active, h6 a:active{color: red !important;}h1 a:visited, h2 a:visited, h3 a:visited, h4 a:visited, h5 a:visited, h6 a:visited{color: purple !important;}table td{border-collapse: collapse;}table{border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;}a{color: #000;}@media only screen and (max-device-width: 480px){a[href^="tel"], a[href^="sms"]{text-decoration: none;color: black; /* or whatever your want */pointer-events: none;cursor: default;}.mobile_link a[href^="tel"], .mobile_link a[href^="sms"]{text-decoration: default;color: orange !important; /* or whatever your want */pointer-events: auto;cursor: default;}}@media only screen and (min-device-width: 768px) and (max-device-width: 1024px){a[href^="tel"], a[href^="sms"]{text-decoration: none;color: blue; /* or whatever your want */pointer-events: none;cursor: default;}.mobile_link a[href^="tel"], .mobile_link a[href^="sms"]{text-decoration: default;color: orange !important;pointer-events: auto;cursor: default;}}@media only screen and (-webkit-min-device-pixel-ratio: 2){/* Put your iPhone 4g styles in here */}@media only screen and (-webkit-device-pixel-ratio:.75){/* Put CSS for low density (ldpi) Android layouts in here */}@media only screen and (-webkit-device-pixel-ratio:1){/* Put CSS for medium density (mdpi) Android layouts in here */}@media only screen and (-webkit-device-pixel-ratio:1.5){/* Put CSS for high density (hdpi) Android layouts in here */}/* end Android targeting */h2{color:#181818;font-family:Helvetica, Arial, sans-serif;font-size:22px;line-height: 22px;font-weight: normal;}a.link1{}a.link2{color:#fff;text-decoration:none;font-family:Helvetica, Arial, sans-serif;font-size:16px;color:#fff;border-radius:4px;}p{color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;}</style><script type="colorScheme" class="swatch active">{"name":"Default", "bgBody":"ffffff", "link":"fff", "color":"555555", "bgItem":"ffffff", "title":"181818"}</script></head><body><table cellpadding="0" width="100%" cellspacing="0" border="0" id="backgroundTable" class="bgBody"><tr><td><table cellpadding="0" width="620" class="container" align="center" cellspacing="0" border="0"><tr><td><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td class="movableContentContainer bgItem"><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr height="40"><td width="200">&nbsp;</td><td width="200">&nbsp;</td><td width="200">&nbsp;</td></tr><tr><td width="200" valign="top">&nbsp;</td><td width="200" valign="top" align="center"><div class="contentEditableContainer contentImageEditable"> <div class="contentEditable" align="center" > <img src="https://s3.amazonaws.com/mynurse/logo.png" width="155" height="155" alt="Logo" data-default="placeholder"/> </div></div></td><td width="200" valign="top">&nbsp;</td></tr><tr height="25"><td width="200">&nbsp;</td><td width="200">&nbsp;</td><td width="200">&nbsp;</td></tr></table></div><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100%" colspan="3" align="center" style="padding-bottom:10px;"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="center" > <h2 style="margin-top: -15px; font-weight: 500; font-size: 2em">Docs</h2> <p style="color:#ccc;margin-top: -15px">Alexa Skill</p></div></div></td></tr><tr><td width="100">&nbsp;</td><td width="400" align="center"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <p >Hi '+Username+', <br/> <br/>Looks like you have just asked Alexa to update your doctor&apos;s email! <br/>To update this, you only need to reply with a valid email address and let <b>Alexa</b> do the rest :)</p></div></div></td><td width="100">&nbsp;</td></tr></table><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="200">&nbsp;</td><td width="200" align="center" style="padding-top:25px;"><table cellpadding="0" cellspacing="0" border="0" align="center" width="200" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="200" height="50"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="center" > <a href="mailto:siddharthshubhampal@gmail.com?Subject=[Docs]%20Doctors%20Email%20Update&body=Hi%20there,%0A%0AMy%20doctors%20email:%20%0A%0AThank you." class="link2" target="_top">Reply</a> </div></div></td></tr></table></td><td width="200">&nbsp;</td></tr></table><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100">&nbsp;</td><td width="400" align="center"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <p style="padding-top: 20px">PS: You can also update doctor&apos;s email with your own email to get all the records in your inbox.</p></div></div></td><td width="100">&nbsp;</td></tr></table></div><div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600" class="container"><tr><td width="100%" colspan="2" style="padding-top:5px;"><hr style="height:1px;border:none;color:#333;background-color:#ddd;"/></td></tr><tr><td width="60%" height="70" valign="middle" style="padding-bottom:20px;"><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" align="left" > <span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;">Sent from <b>Docs</b> by Alexa</span><br/><!-- <span style="font-size:11px;color:#555;font-family:Helvetica, Arial, sans-serif;line-height:200%;">[CLIENTS.ADDRESS] | [CLIENTS.PHONE]</span><br/><span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;"><a target="_blank" href="[FORWARD]" style="text-decoration:none;color:#555">Forward to a friend</a></span><br/><span style="font-size:13px;color:#181818;font-family:Helvetica, Arial, sans-serif;line-height:200%;"><a target="_blank" href="[UNSUBSCRIBE]" style="text-decoration:none;color:#555">click here to unsubscribe</a></span> --> </div></div></td><td width="40%" height="70" align="right" valign="top" align="right" style="padding-bottom:20px;"><!-- <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right"><tr><td width="57%"></td><td valign="top" width="34"><div class="contentEditableContainer contentFacebookEditable" style="display:inline;"> <div class="contentEditable" > <img src="images/facebook.png" data-default="placeholder" data-max-width="30" data-customIcon="true" width="30" height="30" alt="facebook" style="margin-right:40x;"> </div></div></td><td valign="top" width="34"><div class="contentEditableContainer contentTwitterEditable" style="display:inline;"> <div class="contentEditable" > <img src="images/twitter.png" data-default="placeholder" data-max-width="30" data-customIcon="true" width="30" height="30" alt="twitter" style="margin-right:40x;"> </div></div></td><td valign="top" width="34"><div class="contentEditableContainer contentImageEditable" style="display:inline;"> <div class="contentEditable" > <a target="_blank" href="#" data-default="placeholder" style="text-decoration:none;"><img src="images/pinterest.png" width="30" height="30" data-max-width="30" alt="pinterest" style="margin-right:40x;"/></a> </div></div></td></tr></table> --></td></tr></table></div></td></tr></table></td></tr></table></td></tr></table><!--Default Zone <div class="customZone" data-type="image"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" align="center" width="600"> <tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" colspan="3" align="center" style="padding-bottom:10px;padding-top:25px;"><div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" data-max-width="500"> </div></div></td><td width="50">&nbsp;</td></tr></table> </div></div><div class="customZone" data-type="text"> <div class="movableContent"><table cellpadding="0" cellspacing="0" border="0" align="center" width="600"><tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center" style="padding-bottom:10px;padding-top:25px;"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <h2 >Make sure you’re recognizable</h2> </div></div></td><td width="50">&nbsp;</td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <p ><p>Include both the name of the person who’s sending the email as well as the name of the company, and even better: send using your own domain.</p></p></div></div></td><td width="50">&nbsp;</td></tr><tr><td colspan="3" height="30"></td></tr><tr><td width="50">&nbsp;</td><td width="500" align="center" ><table cellpadding="0" cellspacing="0" border="0" align="center" width="400" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="400" height="50"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" style="text-align:center;"> <a target="_blank" href="[CLIENTS.WEBSITE]" class="link2">Read the 3 rules of email marketing sender etiquette</a> </div></div></td></tr></table></td><td width="50">&nbsp;</td></tr><tr><td height="10" colspan="3"></td></tr></table></div></div><div class="customZone" data-type="imageText"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td colspan="5" height="30"></td></tr><tr> <td width="50"></td><td valign="top" width="150"> <div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" width="150" data-max-width="150"> </div></div></td><td width="20"></td><td valign="top" width="250"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="Textimage"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td colspan="5" height="30"></td></tr><tr> <td width="50"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. </p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="20"></td><td valign="top" width="150"> <div class="contentEditableContainer contentImageEditable"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/temp_img_1.png" data-default="placeholder" width="150" data-max-width="150"> </div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="textText"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p >Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="40"></td><td valign="top" width="230"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="qrcode"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" > <div class="contentQrcodeEditable contentEditableContainer"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/qr_code.png" width="75" height="75" data-default="placeholder"> </div></div></td><td width="20"></td><td valign="top"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. Cras tincidunt, justo at fermentum feugiat, eros orci accumsan dolor, eu ultricies eros dolor quis sapien. Curabitur in turpis sem, a sodales purus. Pellentesque et risus at mauris aliquet gravida.</p><p style="text-align:left;">Integer in elit in tortor posuere molestie non a velit. Pellentesque consectetur, nisi a euismod scelerisque.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="social"> <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" width="230" align="center"> <div class="contentEditableContainer contentFacebookEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/facebook.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Facebook</h2> <p>Like us on Facebook to keep up with our news, updates and other discussions.</p></div></div></td><td width="40"></td><td valign="top" width="230" align="center"> <div class="contentEditableContainer contentTwitterEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/twitter.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Twitter</h2> <p>Follow us on twitter to stay up to date with company news and other information.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="twitter"> <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="3"></td></tr><tr> <td width="50"></td><td valign="top" align="center"> <div class="contentEditableContainer contentTwitterEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/twitter.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >Twitter</h2> <p>Follow us on twitter to stay up to date with company news and other information.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="facebook" > <div class="movableContent" align="center"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="3"></td></tr><tr> <td width="50"></td><td valign="top" align="center"> <div class="contentEditableContainer contentFacebookEditable"> <div class="contentEditable"> <img data-default="placeholder" src="images/facebook.png" data-max-width="60" data-customIcon="true" data-noText="true" width="60" height="60"> </div></div><div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2>Facebook</h2> <p>Like us on Facebook to keep up with our news, updates and other discussions.</p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="gmap"> <div class="movableContent"> <table cellpadding="0" cellspacing="0" border="0" width="600"> <tr><td height="30" colspan="5"></td></tr><tr> <td width="50"></td><td valign="top" > <div class="contentGmapEditable contentEditableContainer"> <div class="contentEditable"> <img src="/applications/Mail_Interface/3_3/modules/User_Interface/core/v31_campaigns/images/neweditor/default/gmap_example.png" width="75" data-default="placeholder"> </div></div></td><td width="20"></td><td valign="top"> <div class="contentEditableContainer contentTextEditable"> <div class="contentEditable" style="color:#555;font-family:Helvetica, Arial, sans-serif;font-size:16px;line-height:160%;"> <h2 >This is a subtitle</h2> <p style="text-align:left;">Etiam bibendum nunc in lacus bibendum porta. Vestibulum nec nulla et eros ornare condimentum. Proin facilisis, dui in mollis blandit. Sed non dui magna, quis tincidunt enim. Morbi vehicula pharetra lacinia. Cras tincidunt, justo at fermentum feugiat, eros orci accumsan dolor, eu ultricies eros dolor quis sapien. Curabitur in turpis sem, a sodales purus. Pellentesque et risus at mauris aliquet gravida.</p><p style="text-align:left;">Integer in elit in tortor posuere molestie non a velit. Pellentesque consectetur, nisi a euismod scelerisque.</p><p style="text-align:right;"><a target="_blank" href="">Read more</a></p></div></div></td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums1v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="500" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums2v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="235" align="center" valign="top" class="newcontent"> </td><td width="30"></td><td width="235" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="colums3v2"><div class="movableContent"> <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" > <tr><td height="30" colspan="3">&nbsp;</td></tr><tr> <td width="50"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="12"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="12"></td><td width="158" align="center" valign="top" class="newcontent"> </td><td width="50"></td></tr></table> </div></div><div class="customZone" data-type="textv2"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" > <h2 >Make sure you’re recognizable</h2> </div></div><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" ><p>Include both the name of the person who’s sending the email as well as the name of the company, and even better: send using your own domain.</p></div></div><table cellpadding="0" cellspacing="0" border="0" align="center" width="79%" height="50"><tr><td bgcolor="#ED006F" align="center" style="border-radius:4px;" width="100%" height="50"><div class="contentEditableContainer contentTextEditable" > <div class="contentEditable" style="text-align:center;"> <a target="_blank" href="[CLIENTS.WEBSITE]" class="link2">Read the 3 rules of email marketing sender etiquette</a> </div></div></td></tr></table> </div>--></body></html>';
    var eParams = {
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: MSGBODY_DOC_EMAIL_ERR
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "[Docs] Doctors Email Update"
            }
        },
        Source: "siddharthshubhampal@gmail.com"
    };
    var email2 = ses.sendEmail(eParams, function(err, data){
        if(err) {
          console.log("SEND_UPDATE_DOC_EMAIL_ERR "+err);
          response.speechText= "There is some error in sending email! Our developers will contact you soon to resolve it.";
          response.done();
        }
        else {
          if (locale==="en-IN"){
          response.ssmlEn= "SSML";
          response.speechText = "<say-as interpret-as='interjection'>okey dokey</say-as><break strength='x-strong'/>Our Developers will contact you soon to update it, See Ya!";
          }else if (locale ==='en-US'){
          response.ssmlEn= "SSML";
          response.speechText = "<say-as interpret-as='interjection'>all righty</say-as><break time='0.5s'/>Our Developers will contact you soon to update it, See Ya!";
        }else{
          response.speechText = "Okay! Our Developers will contact you soon to update it, See Ya!";
        }
            response.done();
        }
    });
    
}
};