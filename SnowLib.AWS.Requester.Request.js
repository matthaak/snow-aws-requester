gs.include('SnowLib.AWS.Requester.Signer');
SnowLib.namespace('SnowLib.AWS.Requester');

SnowLib.AWS.Requester.Request = function(reqParams, propGetter) {

	propGetter = propGetter || gs;

	var gl = new GSLog("snowlib.aws.log", "SnowLib.AWS.Requester.Request");

	// Preserve the original reqParams object passed in by copying it
	var json = new JSON();
	var req = json.decode(json.encode(reqParams));

	req.method = req.method || 'GET';
	req.region = req.region || propGetter.getProperty('snowlib.aws.region');
	req.path = req.path || '/';
	req.headers = req.headers || {};

	var secret = propGetter.getProperty('snowlib.aws.secret_key');
	var accessKey = propGetter.getProperty('snowlib.aws.access_key');

	var rmv2 = SnowLib.AWS.Requester.Signer.makeSignedRestMessageV2(req, secret, accessKey);

	this.execute = function() {

		var requestStamp = new Date().getTime();

		gl.logInfo('Canonical Request #' + requestStamp + ':\n' + rmv2._snowlib_debug_canonical_request);

		var resp = rmv2.execute();
		var respHeaders = resp.getHeaders();

		var respLogArr = [];
		respLogArr.push('Response #' + requestStamp + ':');
		respLogArr.push(resp.getStatusCode());
		for (var h in respHeaders) {
			respLogArr.push(h + ': ' + respHeaders[h]);
		}
		respLogArr.push('\n' + resp.getBody());

		gl.logInfo(respLogArr.join('\n'));

		var helper = new XMLHelper(resp.getBody());
		var obj = helper.toObject();

		return {
			statusCode : resp.getStatusCode(),
			headers : respHeaders,
			bodyRaw : resp.getBody(),
			body : helper.toObject(),
			queryString : resp.getQueryString()
		};
	};

	this.getSignedRestMessageV2 = function() {
		return rmv2;
	};

};
