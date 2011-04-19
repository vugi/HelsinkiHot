// socket.io 
var io = require('socket.io');
var _ = require('../lib/underscore');
// var socketUtilModule = require('./socket_util.js');
// var socketUtil = socketUtilModule();

var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.LOG);

var instance = null;

var getInstance = function(app) {
  if(app){
    if(instance){
      // Instance exists
      return instance;
    } else {
      instance = socket_api(app);
      return instance;
    }
  } else {
    return instance;
  }
}

var socket_api = function(app) {

  var _socket = io.listen(app);
  
  /**
   * Array of client sessionId's that do not want to receive polling areas.
   * 
   * This is used with socket.io's broadcast method
   */
  var _pollingAreasExcept = [];
  
  function _onConnect(client) {
    // By default clients do not receive polling areas
    _requestEndPollingAreas(null, client);
  };
  
  function _onMessage(message, client) {
    var data = JSON.parse(message);
    var actionName = data.request;
    
    switch(actionName) {
      case "startPollingAreas":
        _requestStartPollingAreas(data, client);
      break;
      case "startPollingAreas":
        _requestEndPollingAreas(data, client);
      break;
      default:
        logger.error('No handler function ' + requestHandlerFunctionName + ' found for request ' + actionName);
      break;
    }
  };
  
  function _onDisconnect(client) {
    // Clean up
    
    // Remove from polling area except list, so in other words
    _requestStartPollingAreas(null, client);
  };
  
  function _createResponse(response_name, contentObject) {
    var responseObject = {
      response: response_name,
      content: contentObject
    }
    
    var response = JSON.stringify(responseObject);
    logger.debug("Response: " + response);
    
    return response;
  };
  
  // Initialize 'listeners'
  _socket.on('connection', function(client){ 
    _onConnect(client);
    
    client.on('message', function(data) {
      _onMessage(data, client);
    });
    
    client.on('disconnect', function(){
      _onDisconnect(client)
    });
  });
  
  /* ...................... REQUEST HANDLERS ....................... */
 
  function _requestStartPollingAreas(data, client) {
    _pollingAreasExcept = _.without(_pollingAreasExcept, client.sessionId);
  }
  
  function _requestEndPollingAreas(data, client) {
    
    if(_.include(_pollingAreasExcept, client.sessionId)){
      // Nothing
    } else {
      _pollingAreasExcept.push(client.sessionId);
    }
  }
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    
    /**
     * Broadcast polling area
     */
    broadcastPollingArea: function(nwLatLng, seLatLng) {
      _socket.broadcast(
        _createResponse('pollingArea', {nwLatLng: nwLatLng, seLatLng: seLatLng}), 
        _pollingAreasExcept
      );
    }
  }
}

// Export this file as a module
module.exports = getInstance;