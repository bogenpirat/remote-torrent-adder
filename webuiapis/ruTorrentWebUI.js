function addTorrentToruTorrentWebUI(data) {
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
	if(localStorage["rutorrentdirectory"] != undefined && localStorage["rutorrentdirectory"].length > 0)
		url += "dir_edit="+encodeURIComponent(localStorage["rutorrentdirectory"])+"&";
	if(localStorage["rutorrentlabel"] != undefined && localStorage["rutorrentlabel"].length > 0)
		url += "label="+encodeURIComponent(localStorage["rutorrentlabel"]);
	
	xhr.open("POST", url, true, localStorage["login"], localStorage["password"]);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			if(/.*addTorrentSuccess.*/.exec(xhr.responseText)) {
				displayResponse(0);
			} else {
				displayResponse("server didn't accept data:\n"+xhr.responseText);
			}
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			console.debug(xhr);
			displayResponse(-2);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message="";
	
	if(localStorage["rutorrentdirectory"] != undefined && localStorage["rutorrentdirectory"].length > 0) {
	   message += "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"dir_edit\"\r\n\r\n";
	   message += localStorage["rutorrentdirectory"]+"\r\n";
	}
	if(localStorage["rutorrentlabel"] != undefined && localStorage["rutorrentlabel"].length > 0) {
	   message += "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"tadd_label\"\r\n\r\n";
	   message += localStorage["rutorrentlabel"]+"\r\n";
	}
	   message += "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\""+(new Date).getTime()+".torrent\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += data + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}