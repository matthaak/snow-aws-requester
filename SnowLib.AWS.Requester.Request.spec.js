gs.include('SnowLib.AWS.Requester.Request');

describe("SnowLib.AWS.Requester.Request", function() {

    var mockProperties = {
        'snowlib.aws.region' : 'us-east-1',
        'snowlib.aws.secret_key' : 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
        'snowlib.aws.access_key' : 'AKIDEXAMPLE'
    };

    var mockPropGetter = {
        getProperty : function(name) {
            return mockProperties[name];
        }
    };

    describe("instance constructed with minimum GET params plus x-amz-date", function() {

        var awsr = new SnowLib.AWS.Requester.Request({
            // method : 'GET',
            // region : 'us-east-1',
            service : 'iam',
            // path : '/',
            query : {
                'Action' : 'ListUsers',
                'Version' : '2010-05-08'
            },
            headers : {
                'Host' : 'iam.amazonaws.com',
                // 'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8',
                // X-Amz-Date is NOT a 'mimimum' parameter, but is supplied in order to pass test expectations
                'X-Amz-Date' : '20150830T123600Z'
            }
        }, mockPropGetter);

        var rmv2 = awsr.getSignedRestMessageV2();

        it("has correct endpoint URL", function() {
            expect(rmv2.getEndpoint()).toBe('https://iam.amazonaws.com/');
        })

        it("has correct headers", function() {
            expect(rmv2.getRequestHeaders()).toEqual({
                'Host' : 'iam.amazonaws.com',
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8',
                'X-Amz-Date' : '20150830T123600Z',
                'Authorization' : 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7'
            });
        });
    });

    describe("instance created with minimum POST params plus x-amz-date", function() {

        it("has correct HTTP body", function() {

            var awsr = new SnowLib.AWS.Requester.Request({
                method : 'POST',
                service : 'iam',
                headers : {
                    'Host' : 'iam.amazonaws.com',
                    // X-Amz-Date is NOT a 'mimimum' parameter, but is supplied in order to pass test expectations
                    'X-Amz-Date' : '20150830T123600Z'
                },
                payloadParams : {
                    'PlatformApplicationArn' : 'arn:aws:sns:us-west-2:025606354027:app/APNS_SANDBOX/AmazonMobilePush',
                    'Action' : 'CreatePlatformEndpoint',
                    'SignatureMethod' : 'HmacSHA256',
                    'CustomUserData' : 'UserId%3D27576823',
                    'AWSAccessKeyId' : 'AKIDEXAMPLE',
                    'Token' : '395a6f7bf0e87a3f26cbd2e817f12811cd10ca4593d0d9cc7a114c25241949d8'
                }
            }, mockPropGetter);

            var rmv2 = awsr.getSignedRestMessageV2();

            expect(rmv2.getRequestBody()).toEqual(
                'AWSAccessKeyId=AKIDEXAMPLE' +
                '&Action=CreatePlatformEndpoint' +
                '&CustomUserData=UserId%253D27576823' +
                '&PlatformApplicationArn=arn%3Aaws%3Asns%3Aus-west-2%3A025606354027%3Aapp%2FAPNS_SANDBOX%2FAmazonMobilePush' +
                '&SignatureMethod=HmacSHA256' +
                '&Token=395a6f7bf0e87a3f26cbd2e817f12811cd10ca4593d0d9cc7a114c25241949d8'
            );

        });
    });
});
