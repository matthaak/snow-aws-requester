# snow-aws-requester
ServiceNow Script Include library for signing AWS requests

Setup
-----

Put each of the four .js files into a Script Include with same name as the file itself (without the .js extension.) The Script Includes are:
* SnowLib.AWS.Requester.Request
* SnowLib.AWS.Requester.Signer
* SnowLib
* jsSHA

Establish the following system properties:
* snowlib.aws.region (for example, "us-east-1")
* snowlib.aws.secret_key
* snowlib.aws.access_key

Use
---

The library is useless by itself. You must build your own includes that extend Request to a particular AWS service, such as SNS or another service. For example, the following class would do the SNS CreatePlatformEndpoint request:

~~~~
gs.include('SnowLib.AWS.Requester.Request');

AcmeAwsSnsCreatePlatformEndpoint = function(reqParams, propGetter) {

  propGetter = propGetter || gs;

  var awsr = new SnowLib.AWS.Requester.Request({
    service : 'sns',
    query : {
      'Action' : 'CreatePlatformEndpoint',
      'Token' : reqParams.token,
      'PlatformApplicationArn' :
        propGetter.getProperty('acme.aws.sns.platform_application_arn.' + reqParams.platform)
    },
    headers : {
      'Host' : propGetter.getProperty('acme.aws.sns.host')
    }
  }, propGetter);

  this.execute = awsr.execute;

};
~~~~

To use the above class, you would have to set up system properties:
* acme.aws.sns.host (for example, "sns.us-east-1.amazonaws.com")
* acme.aws.sns.platform_application_arn.ANDROID (for example, "arn:aws:sns:us-east-1:730817742113:app/GCM/com.acme")
* acme.aws.sns.platform_application_arn.IOS (for example, "arn:aws:sns:us-east-1:730817742113:app/APNS/com.acme")


Then, you could do the following in a Business Rule or other server-side code:

~~~~
var req = new AcmeAwsSnsCreatePlatformEndpoint({
  token : someStringWithSnsDeviceToken,
  platform : someStringIdentifyingIosOrAndroidPlatform
});

var resp = req.execute();

var endpointArn = resp.body.CreatePlatformEndpointResult.EndpointArn;
var statusCode = resp.statusCode;
var bodyRaw = resp.bodyRaw;

~~~~
