function addTorrentToruTorrentWebUI(data, label, dir) {
	if(label == undefined) label = localStorage["rutorrentlabel"];
	if(dir == undefined) dir = localStorage["rutorrentdirectory"];
	
	var xhr = new XMLHttpRequest();
	
	var url = "http";
	url += ((localStorage["hostsecure"]=='true')?"s":"");
	url += "://";
	url += localStorage["host"];
	url += ":"+localStorage["port"];
	if(localStorage["ruTorrentrelativepath"] == undefined || localStorage["ruTorrentrelativepath"][0] != "/")
		url += "/"; // first slash
	if(localStorage["ruTorrentrelativepath"] != undefined)
		url += localStorage["ruTorrentrelativepath"];
	if(localStorage["ruTorrentrelativepath"] != undefined && localStorage["ruTorrentrelativepath"].length != 0 && localStorage["ruTorrentrelativepath"][localStorage["ruTorrentrelativepath"].length-1] != "/")
		url += "/"; // trailing slash
	url += "php/addtorrent.php?";
	if(dir != undefined && dir.length > 0)
		url += "dir_edit="+encodeURIComponent(dir)+"&";
	if(label != undefined && label.length > 0)
		url += "label="+encodeURIComponent(label);
	
	xhr.open("POST", url, true, localStorage["login"], localStorage["password"]);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*addTorrentSuccess.*/.exec(xhr.responseText)) {
				displayResponse("Success", "Torrent added successfully.");
			} else {
				displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+": "+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse("Failure", "Server responded with an irregular HTTP error code:\n"+xhr.status+": "+xhr.responseText);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	var message="";
	
	if(data.substring(0,7) == "magnet:") {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.send("url="+encodeURIComponent(data));
	} else {
		xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
		
		if(dir != undefined && dir.length > 0) {
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"dir_edit\"\r\n\r\n";
		   message += dir+"\r\n";
		}
		if(label != undefined && label.length > 0) {
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"tadd_label\"\r\n\r\n";
		   message += label+"\r\n";
		}
		   message += "--" + boundary + "\r\n";
		   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\""+(new Date).getTime()+".torrent\"\r\n";
		   message += "Content-Type: application/x-bittorrent\r\n\r\n";
		   message += data + "\r\n";
		   message += "--" + boundary + "--\r\n";
		
		xhr.sendAsBinary(message);
	}
}