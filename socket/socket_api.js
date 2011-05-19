// socket.io 
var io = require('socket.io');
var _ = require('../lib/underscore');

var log4js = require('log4js')();
var logger = log4js.getLogger();


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
  
  var _listeners = {};
  
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
    
    // Notify listeners
    var actionListeners = _listeners[actionName];
    if(_.isArray(actionListeners)) {
      _.each(actionListeners, function(listenerFunction) {
        var thisArg = null; // Should this be something else than null?
        listenerFunction.apply(thisArg, [data, client]);
      });
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
     * Add a new message listener. The message listener is called when 
     * ever message arrives.
     * 
     * @param {Object} actionName
     * @param {function{Object, Object}} listenerFunction Listener function
     *    First argument is the data JSON Object, second is the client 
     */
    addListener: function(actionName, listenerFunction) {
      if(_.isArray(_listeners[actionName])) {
        _listeners[actionName].push(listenerFunction);
      } else {
        _listeners[actionName] = [listenerFunction];
      }
    },
    
    /**
     * Removes message listener
     * 
     * @param {Object} actionName
     * @param {Object} listenerFunction
     */
    removeListener: function(actionName, listenerFunction) {
      if(_.isArray(_listeners[actionName])) {
        _listeners[actionName] = _.without(_listeners[actionName], listenerFunction);
      }
    },
    
    /**
     * Sends response to a single client
     * 
     * @param {Object} client
     * @param {string} responseName
     * @param {Object} content
     */
    sendResponse: function(client, responseName, content) {
      client.send(_createResponse(responseName, content));
    },
    
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
        _createResponse('newEvent', eventInfo), 
        _newEventsExcept
      );
    },
    broadcastPollingGrid: function(grid) {
      var gridsToBeSent = [];
      _.each(grid, function(bounds) {
        gridsToBeSent.push({nwLatLng: bounds.nw, seLatLng: bounds.se});
      });
      _socket.broadcast(_createResponse('pollingGrid', gridsToBeSent), _pollingAreasExcept);
    }
  }
}

// Export this file as a module
module.exports = getInstance;