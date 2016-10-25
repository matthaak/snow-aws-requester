gs.include('SnowLib.AWS.Requester.Signer');

describe("SnowLib.AWS.Requester.Signer", function() {
    var signer = SnowLib.AWS.Requester.Signer;

    // Examples from http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
    var exampleReq = {
        method : 'GET',
        region : 'us-east-1',
        service : 'iam',
        path : '/',
        query : {
            'Action' : 'ListUsers',
            'Version' : '2010-05-08'
        },
        headers : {
            'Host' : 'iam.amazonaws.com',
            'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8',
            'X-Amz-Date' : '20150830T123600Z'
        }
    };

    var exampleSecretKey = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';

    var exampleAccessKey = 'AKIDEXAMPLE';

    describe("RESTMessageV2 object returned by makeSignedRestMessageV2", function() {
        var rmv2 = signer.makeSignedRestMessageV2(exampleReq, exampleSecretKey, exampleAccessKey);

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

    describe("getAuthorizationHeaderValue", function() {
        it("returns the correct string given the example request object, AWS secret key, and AWS access key", function() {
            var ahv = signer.getAuthorizationHeaderValue(exampleReq, exampleSecretKey, exampleAccessKey);
            var exampleAhv = 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7';
            expect(ahv).toBe(exampleAhv);
        });
    });

    describe("getSignatureV4", function() {
        it("returns the correct hash value given the example request object and AWS secret key", function() {
            var sv4 = signer.getSignatureV4(exampleReq, exampleSecretKey);
            var exampleSv4 = '5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7';
            expect(sv4).toBe(exampleSv4);
        });
    });

    describe("getSigningKey", function() {
        it("returns the correct bytes given the example request object and AWS secret key", function() {
            var sk = signer.getSigningKey(exampleReq, exampleSecretKey);
            skArr = [];
            for (var i = 0; i<sk.length; ++i) {
                skArr.push(sk.charCodeAt(i));
            }
            var exampleSk = '196 175 177 204 87 113 216 113 118 58 57 62 68 183 3 87 27 85 204 40 66 77 26 94 134 218 110 211 193 84 164 185';
            expect(skArr.join(' ')).toBe(exampleSk);
        });
    });

    describe("getCredentialScopeValue", function() {
        it("returns the correct string given the example request object", function() {
            var csv = signer.getCredentialScopeValue(exampleReq);
            var exampleCsv ='20150830/us-east-1/iam/aws4_request';
            expect(csv).toBe(exampleCsv);
        });
    });

    describe("getStringToSign", function() {
        it("returns the correct string given the example request object", function() {
            var sts = signer.getStringToSign(exampleReq);
            var exampleSts =
                'AWS4-HMAC-SHA256\n' +
                '20150830T123600Z\n' +
                '20150830/us-east-1/iam/aws4_request\n' +
                'f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59';
            expect(sts).toBe(exampleSts);
        });
    });

    describe("getCanonicalRequestHash", function() {
        it("returns the correct hash value given the example request object", function() {
            var crHash = signer.getCanonicalRequestHash(exampleReq);
            var exampleCrHash = 'f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59';
            expect(crHash).toBe(exampleCrHash);
        });
    });

    describe("getCanonicalRequest", function() {
        it("returns the correct string given the example request object", function() {
            var cr = signer.getCanonicalRequest(exampleReq);
            var exampleCR =
                'GET\n' +
                '/\n' +
                'Action=ListUsers&Version=2010-05-08\n' +
                'content-type:application/x-www-form-urlencoded; charset=utf-8\n' +
                'host:iam.amazonaws.com\n' +
                'x-amz-date:20150830T123600Z\n' +
                '\n' +
                'content-type;host;x-amz-date\n' +
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
            expect(cr).toBe(exampleCR);
        });

        it("returns the correct string given aws4_testsuite post-x-www-form-urlencoded-parameters.req", function() {
            var cr = signer.getCanonicalRequest({
                method : 'POST',
                path : '/',
                headers : {
                    'Host' : 'host.foo.com',
                    'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8',
                    'Date' : 'Mon, 09 Sep 2011 23:36:00 GMT'
                },
                payload : 'foo=bar'
            });
            var testsuiteCR =
                'POST\n' +
                '/\n' +
                '\n' +
                'content-type:application/x-www-form-urlencoded; charset=utf-8\n' +
                'date:Mon, 09 Sep 2011 23:36:00 GMT\n' +
                'host:host.foo.com\n' +
                '\n' +
                'content-type;date;host\n' +
                '3ba8907e7a252327488df390ed517c45b96dead033600219bdca7107d1d3f88a';
            expect(cr).toBe(testsuiteCR);

        });

    });

    describe("getCanonicalQueryString", function() {
        it("returns the correct string given the example query object", function() {
            var cqStr = signer.getCanonicalQueryString(exampleReq.query);
            var exampleCqStr = 'Action=ListUsers&Version=2010-05-08';
            expect(cqStr).toBe(exampleCqStr);
        });
    });

    describe("getCanonicalQueryString", function() {
        it("returns the correct string given an alternate example query object", function() {
            var cqStr = signer.getCanonicalQueryString({
                'B' : '2',
                'A' : '1'
            });
            var exampleCqStr = 'A=1&B=2';
            expect(cqStr).toBe(exampleCqStr);
        });
    });

    describe("getCanonicalHeaders", function() {
        it("returns the correct string given an alternate example headers object", function() {
            var ch = signer.getCanonicalHeaders({
                'Host' : 'iam.amazonaws.com',
                'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8',
                'My-header1' : '    a   b   c ',
                'X-Amz-Date' : '20150830T123600Z',
                'My-Header2' : '    "a   b   c"'
            });
            var exampleCH = {
                names:
                    'content-type;host;my-header1;my-header2;x-amz-date',
                full:
                'content-type:application/x-www-form-urlencoded; charset=utf-8\n' +
                'host:iam.amazonaws.com\n' +
                'my-header1:a b c\n' +
                    // The AWS doc states that multiple spaces inside quotes should be preserved. So,
                    // the following expectation is wrong. But,
                    // 1) The Example Hashed canonical request in the same doc did not preserve the
                    //    multiple spaces in its computation
                    // 2) The AWS SDK for node.js (as of Jan 5, 2016) also does not preserve multiple
                    //    spaces inside quotes (See aws-sdk-js/lib/signers/v4.js line 164)
                'my-header2:"a b c"\n' +
                'x-amz-date:20150830T123600Z\n'
            };
            expect(ch).toEqual(exampleCH);
        });
    });
});