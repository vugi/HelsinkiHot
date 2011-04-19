
/**
 * A simple logger that enables different log levels.
 * 
 * Available log levels are
 * 
 * - logger.level.DEBUG
 * - logger.level.LOG
 * - logger.level.WARN
 * - logger.level.ERROR
 * 
 * @param {Number} consoleLogLevel
 * @param {Number} fileLogLevel
 */
function logger(consoleLogLevel, fileLogLevel) {
  
  var _consoleLogLevel = consoleLogLevel;
  var _fileLogLevel = fileLogLevel;
  
  /* ...................... PRIVATE METHODS ...................... */
  
  function _log(level, msg){
    if(level >= _consoleLogLevel) {
      console.log(msg);
    }
    if(level >= _fileLogLevel) {
      // TODO
      // Write to log file
    }
  }
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    
    /**
     * Debug message
     * 
     * @param {String} msg
     */
    debug: function(msg) {
      _log(logger.level.DEBUG, msg);
    },
    
    /**
     * Log message
     * 
     * @param {String} msg
     */
    log: function(msg) {
      _log(logger.level.LOG, msg);
    },
    
    /**
     * Warn message
     * 
     * @param {String} msg
     */
    warn: function(msg) {
      _log(logger.level.WARN, msg);
    },
    
    /**
     * Error message
     * 
     * @param {String} msg
     */
    error: function(msg) {
      _log(logger.level.ERROR, msg);
    }
  }
};

/**
 * Object containing available log levels
 * 
 * @param {Object} msg
 */
logger.level = {
  DEBUG: 0,
  LOG: 1,
  WARN: 2,
  ERROR: 3
}

// Export this file as a module
module.exports = logger;
