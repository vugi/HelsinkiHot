/**
 * Loads data from API and displays it.
 */

 $(document).ready(function(){
	$.ajax({
		type: "GET",
		url: "api/venues",
   		success: function(jsonData){
			console.log(jsonData);
			showData(jsonData);
		}
 	});
 });

function showData(jsonData){
	var list = $('<ol>').appendTo('body');
	$(jsonData.items).each(function(i,item){
		console.log(item);
		$('<li>').html(item.name+' '+item.hereNow.count+'/'+item.stats.checkinsCount).appendTo(list);
	})
	
}