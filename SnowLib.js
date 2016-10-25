var SnowLib = (function (global) {
  return {
    namespace : function (namespaceString) {
      var parts = namespaceString.split('.'),
        parent = global,
        currentPart = '';

      for(var i = 0, length = parts.length; i < length; i++) {
        currentPart = parts[i];
        parent[currentPart] = parent[currentPart] || {};
        parent = parent[currentPart];
      }

      return parent;
    }
  };
})(this);
