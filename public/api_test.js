/**
 * @author mikko
 */

 $(document).ready(function(){
	$.ajax({
	type: "GET",
	url: "api/",
   	success: function(msg){
     		$('body').append('<div>Server response from url <b>api/</b> <br /><code>' + msg + '</code></div>');
   		}
 	});
 });