gs.include('jsSHA');
SnowLib.namespace('SnowLib.AWS.Requester');

SnowLib.AWS.Requester.Signer = (function() {

    var debug_canonical_request;
    var debug_string_to_sign;

    function makeSignedRestMessageV2(req, secret, accessKey) {

        // Add an encoded version of payloadParams to the req object as 'payload'
        if (req.payloadParams) {
            req.payload = _paramsToEncodedString(req.payloadParams);
        }

        // Add mandatory headers to the req object, if not already supplied
        req.headers['Content-Type'] = req.headers['Content-Type'] || 'application/x-www-form-urlencoded; charset=utf-8';
        req.headers['X-Amz-Date'] = req.headers['X-Amz-Date'] || _getAmzDate();


        var rmv2 = new sn_ws.RESTMessageV2();

        // Set the HTTP method; RESTMessageV2 expects lower-case
        rmv2.setHttpMethod(req.method.toLowerCase());

        // Set the endpoint
        rmv2.setEndpoint('https://' + _getValueIgnoreKeyCase(req.headers, 'host') + '/');

        // Set headers
        for (var name in req.headers) {
            rmv2.setRequestHeader(name, req.headers[name]);
        }

        // Add the Authorization header
        rmv2.setRequestHeader('Authorization', getAuthorizationHeaderValue(req, secret, accessKey));

        // Add query parameters
        for (var name in req.query) {
            rmv2.setQueryParameter(name, req.query[name]);
        }

        // Add payload
        if (req.payload) {
            rmv2.setRequestBody(req.payload);
        }

        rmv2._snowlib_debug_canonical_request = debug_canonical_request;
        rmv2._snowlib_debug_string_to_sign =  debug_string_to_sign;

        return rmv2;
    }

    function getAuthorizationHeaderValue(req, secret, accessKey) {
        return(
            'AWS4-HMAC-SHA256 Credential=' + accessKey + '/' +
            _getAmzDatePartFromHeaders(req.headers) + '/' + req.region + '/' + req.service +
            '/aws4_request, SignedHeaders=' + getCanonicalHeaders(req.headers).names +
            ', Signature=' + getSignatureV4(req, secret)
        );
    }

    function getSignatureV4(req, secret) {
        // Per http://docs.aws.amazon.com/general/latest/gr/sigv4-calculate-signature.html

        // 1. Derive your signing key
        var derivedSigningKey = getSigningKey(req, secret);

        // 2. Calculate the signature
        var sv4 = _HMAC(derivedSigningKey, getStringToSign(req), 'HEX');

        return sv4;
    }

    function getSigningKey(req, secret) {
        var kSecret = secret;
        var kDate = _HMAC("AWS4" + kSecret, _getAmzDatePartFromHeaders(req.headers));
        var kRegion = _HMAC(kDate, req.region);
        var kService = _HMAC(kRegion, req.service);
        var kSigning = _HMAC(kService, "aws4_request");
        return kSigning;
    }

    function getStringToSign(req) {
        // Per http://docs.aws.amazon.com/general/latest/gr/sigv4-create-string-to-sign.html

        // 1. Start with the algorithm designation
        var sts = 'AWS4-HMAC-SHA256\n' +

                // 2. Append the request date value
            _getValueIgnoreKeyCase(req.headers, 'x-amz-date') + '\n' +

                // 3. Append the credential scope value
            getCredentialScopeValue(req) + '\n' +

                // 4. Append the hash of the canonical request
            getCanonicalRequestHash(req);

        debug_string_to_sign = sts;

        return sts;
    }

    function getCredentialScopeValue(req) {
        var datePart = _getAmzDatePartFromHeaders(req.headers);
        return datePart + '/' + req.region + '/' + req.service + '/aws4_request';
    }

    function getCanonicalRequestHash(req) {
        return _sha256(getCanonicalRequest(req));
    }

    function getCanonicalRequest(req) {

        var ch = getCanonicalHeaders(req.headers);

        // Per http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html

        // 1. Start with the HTTP request method
        var crStr = req.method.toUpperCase() + '\n' +

                // 2. Add the canonical URI parameter
            encodeURI(req.path) + '\n' +

                // 3. Add the canonical query string
            getCanonicalQueryString(req.query) + '\n' +

                // 4. Add the canonical headers
            ch.full + '\n' +

                // 5. Add the signed headers
                // For our utility, we will always sign the same set of headers
            ch.names + '\n' +

                // 6. Use SHA256 to create a hashed value from the body of the HTTP or HTTPS request
            (
                req.method.toUpperCase() == 'GET' ?
                    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' : // hashed empty string
                    _sha256(req.payload)
            );

        debug_canonical_request = crStr;

        return crStr;
    }

    function getCanonicalQueryString(query) {
        return _paramsToEncodedString(query);
    }

    function getCanonicalHeaders(headers) {
        var keys=[], values={}, k, i;

        for (k in headers) {
            if (headers.hasOwnProperty(k)) {
                keys.push(k.toLowerCase());
                values[k.toLowerCase()] = headers[k];
            }
        }
        keys.sort();

        var chNameArr = [];
        var chArr = [];
        for (i = 0; i < keys.length; i++) {
            chNameArr.push(keys[i]);
            chArr.push(keys[i] + ':' + canonicalHeaderValues(values[keys[i]]) + '\n');
        }

        return {
            names : chNameArr.join(';'),
            full : chArr.join('')
        };

        // Adapted from aws-sdk-js/lib/signers/v4.js
        function canonicalHeaderValues(values) {
            return values.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        }
    }

    function _HMAC(key, value, outputType) {
        var shaObj = new jsSHA("SHA-256", "TEXT");
        shaObj.setHMACKey(key, 'BYTES');
        shaObj.update(value);
        return shaObj.getHMAC(outputType || "BYTES");
    }

    function _sha256(text) {
        var shaObj = new jsSHA("SHA-256", "TEXT");
        shaObj.update(text);
        return shaObj.getHash("HEX");
    }

    function _getAmzDate() {
        function _pad(number) {
            var r = String(number);
            if (r.length === 1) { r = '0' + r; }
            return r;
        }

        var d = new Date();

        return d.getUTCFullYear()
            + _pad(d.getUTCMonth() + 1)
            + _pad(d.getUTCDate())
            + 'T' + _pad(d.getUTCHours())
            + _pad(d.getUTCMinutes())
            + _pad(d.getUTCSeconds())
            + 'Z';
    }

    function _getAmzDatePartFromHeaders(headers) {
        var xAmzDate = _getValueIgnoreKeyCase(headers, 'x-amz-date');
        return xAmzDate.split('T')[0];
    }

    function _getValueIgnoreKeyCase(obj, key) {
        for (p in obj) {
            if (obj.hasOwnProperty(p) && p.toLowerCase() == key.toLowerCase()) {
                return obj[p];
            }
        }
    }

    // Adapted from aws-sdk-js/lib/util.js
    function _uriEscape(string) {
        var output = encodeURIComponent(string);

        // The next line patches SNC's encodeURIComponent which returns lower-case encodings
        output = output.replace(/%[a-f0-9]{2}/g, function(encChar) { return encChar.toUpperCase(); });

        output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, function(ch) {
            return escape(ch);
        });

        // AWS percent-encodes some extra non-standard characters in a URI
        output = output.replace(/[*]/g, function(ch) {
            return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
        });

        return output;
    }

    function _paramsToEncodedString(params) {
        if (!params) {
            return '';
        }

        var keys=[], values={}, k, i;

        for (k in params) {
            if (params.hasOwnProperty(k)) {
                keys.push(_uriEscape(k));
                values[_uriEscape(k)] = _uriEscape(params[k]);
            }
        }
        keys.sort();

        var cqArr = [];
        for (i = 0; i < keys.length; i++) {
            cqArr.push(keys[i] + '=' + values[keys[i]]);
        }

        return cqArr.join('&');
    }

    return {
        makeSignedRestMessageV2 : makeSignedRestMessageV2,
        getAuthorizationHeaderValue : getAuthorizationHeaderValue,
        getSignatureV4 : getSignatureV4,
        getSigningKey : getSigningKey,
        getStringToSign : getStringToSign,
        getCredentialScopeValue : getCredentialScopeValue,
        getCanonicalRequestHash : getCanonicalRequestHash,
        getCanonicalRequest : getCanonicalRequest,
        getCanonicalQueryString : getCanonicalQueryString,
        getCanonicalHeaders : getCanonicalHeaders
    };

})();
