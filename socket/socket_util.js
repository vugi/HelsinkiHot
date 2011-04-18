var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);

function socketUtil() {
  return {
    createRequest: function(action_name, params) {
      var request = {
        "request": action_name,
        "params": params
      }
    },
    parseRequest: function(request) {
      var parsedRequest = JSON.parse(request);
      
      logger.debug(parsedRequest);
      
      return parsedRequest;
    },
    parseResponse: function(response) {
      logger.debug(response);
      
      return response;
    }
  }
};

// Export this file as a module
module.exports = socketUtil;
