// socket.io 
var io = require('socket.io');
var _ = require('../lib/underscore');

var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.LOG);
var instance = null;

/**
 * SocketAPI is a singleton. This method creates/returns 
 * socket instance.
 * 
 * @param {Object} app
 */
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

/**
 * The socket api
 * 
 * @param {Object} app
 */
var socket_api = function(app) {

  var _socket = io.listen(app);
  
  /**
   * Array of client sessionId's that do not want to receive polling areas.
   * 
   * This is used with socket.io's broadcast method
   */
  var _pollingAreasExcept = [];
  var _newEventsExcept = [];
  
  /**
   * Called when new connection is established
   * 
   * @param {Object} client
   */
  function _onConnect(client) {
    // By default clients do not receive polling areas
    _requestStopPollingAreas(null, client);
  };
  
  /**
   * Called when new message is received from client
   * 
   * @param {String} message
   * @param {Object} client
   */
  function _onMessage(message, client) {
    var data = JSON.parse(message);
    var actionName = data.request;
    
    switch(actionName) {
      case "startPollingAreas":
        _requestStartPollingAreas(data, client);
      break;
      case "stopPollingAreas":
        _requestStopPollingAreas(data, client);
      break;
      default:
        logger.error('No handler function ' + actionName + ' found for request ' + data);
      break;
    }
  };
  
  /**
   * Called when connection is disconnected.
   * 
   * All cleanup stuff should be done here
   * 
   * @param {Object} client
   */
  function _onDisconnect(client) {
    // Clean up
    
    // Remove from polling area except list, so in other words...
    _requestStartPollingAreas(null, client);
  };
  
  /**
   * Utility method to create a new socket message
   * 
   * See the Google Docs documentation for available 
   * response_names
   * 
   * @param {String} response_name
   * @param {Object} contentObject
   */
  function _createResponse(response_name, contentObject) {
    var responseObject = {
      response: response_name,
      content: contentObject
    }
    
    var response = JSON.stringify(responseObject);
    
    return response;
  };
  
  
  /**
   * Initialize the socket itself
   * 
   * @param {Object} client
   */
  _socket.on('connection', function(client){ 
    _onConnect(client);
    
    client.on('message', function(data) {
      _onMessage(data, client);
    });
    
    client.on('disconnect', function(){
      _onDisconnect(client);
    });
  });
  
  /* ...................... REQUEST HANDLERS ....................... */
  
  /**
   * Start sending polling area information to client. In other words
   * this method removes client from pollingAreasExcept array
   * 
   * @param {Object} data request message in JSON format. This can be null since it's not used.
   * @param {Object} client
   */
  function _requestStartPollingAreas(data, client) {
    _pollingAreasExcept = _.without(_pollingAreasExcept, client.sessionId);
  }
  
  /**
   * Stop sending polling area information to client. In other words
   * this method removes client from pollingAreasExcept array
   * 
   * @param {Object} data request message in JSON format. This can be null since it's not used.
   * @param {Object} client
   */
  function _requestStopPollingAreas(data, client) {
    
    if(_.include(_pollingAreasExcept, client.sessionId)){
      // Nothing
    } else {
      _pollingAreasExcept.push(client.sessionId);
    }
  }
  
  function _requestStartNewEvents(data, client) {
    _newEventsExcept = _.without(_newEventsExcept, client.sessionId);
  }
  
  function _requestEndNewEvents(data, client) {
    _newEventsExcept.push(client.sessionId);
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
    },
    broadcastNewEvent: function(eventInfo) {
      _socket.broadcast(
        _createResponse('newEvent', {event: eventInfo}), 
        _newEventsExcept
      );
    }
  }
}

// Export this file as a module
module.exports = getInstance;