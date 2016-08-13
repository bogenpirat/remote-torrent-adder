chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
	if(response["catchfrompage"] != "true") return;
	
	// handle common links
	var links = new Array();
	var rL = document.getElementsByTagName('a');
	res = response["linkmatches"].split("~");
	res.push("magnet:");
	if(response["linkmatches"] != "") {
		for(lkey in rL) {
		for(mkey in res) {
			if(rL[lkey].href && rL[lkey].href.match(new RegExp(res[mkey], "g"))) {
				links.push(rL[lkey]);
				break;
			}
		}}
	}
	
	// handle forms
	var rB1 = Array.prototype.slice.call(document.getElementsByTagName('button'));
	var rB2 = Array.prototype.slice.call(document.getElementsByTagName('input'));
	var rB = rB1.concat(rB2);
	
	var forms = new Array();
	for (x in rB) { // get an index-parallel array of parent forms
		forms.push(rB[x].form);
	}
	for (x in rB) {
		for(mkey in res) {
			if(forms[x] != null && forms[x].hasAttribute('action') && forms[x].action.match && forms[x].action.match(new RegExp(res[mkey], "g"))) {
				rB[x].href = forms[x].action;
				links.push(rB[x]);
				break;
			}
		}
	}
	
	// re-register actions
	if(links.length != 0) {
		if(response["linksfoundindicator"]=="true") chrome.extension.sendRequest({"action": "pageActionToggle"});
		for(key in links) {
			if(links[key].addEventListener) {
				links[key].addEventListener('click', function(e) {
					if(!(e.ctrlKey || e.shiftKey || e.altKey)) {
						e.preventDefault();
						var url = this.href;
						
						var servers = JSON.parse(response.servers);
						var server = servers[0];

						if(server["rutorrentdirlabelask"] && server["client"]=="ruTorrent WebUI")
							showLabelDirChooser(response, url);
						else 
							chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": undefined, "dir": undefined});
					}
				});
			}
		}
	}
});

// register a listener that'll display the dir/label selection dialog
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if(request.action == "showLabelDirChooser" && request.url && request.settings) {
		showLabelDirChooser(request.settings, request.url, request.server);
		sendResponse({});
	}
});

function showLabelDirChooser(settings, url, theServer) {
	var servers = JSON.parse(settings.servers);
	var server, serverIndex = 0;
	if(theServer == null) {
		server = servers[0];
	} else {
		server = theServer;
		for(var x in servers) {
			if(servers[x].name == theServer.name) {
				serverIndex = x;
			}
		}
	}

	var dirlist = server["dirlist"] && JSON.parse(server["dirlist"]);
	var labellist = server["labellist"] && JSON.parse(server["labellist"]);

	var adddialog = "Directory: <select id=\"adddialog_directory\">";
	for(x in dirlist) adddialog += "<option value=\""+dirlist[x]+"\">"+dirlist[x]+"</option>";
	adddialog += "</select>";
	adddialog += " <img id=\"dirremover\" src=\"" + chrome.extension.getURL("icons/White_X_in_red_background.svg") + "\" /> ";
	adddialog += "or new: <input id=\"adddialog_directory_new\" type=\"text\" /><br/>";
	adddialog += "Label: <select id=\"adddialog_label\">";
	for(x in labellist) adddialog += "<option value=\""+labellist[x]+"\">"+labellist[x]+"</option>";
	adddialog += "</select>";
	adddialog += " <img id=\"labelremover\" src=\"" + chrome.extension.getURL("icons/White_X_in_red_background.svg") + "\" /> ";
	adddialog += " or new: <input id=\"adddialog_label_new\" type=\"text\" /><br/>";
	adddialog += "<input id=\"adddialog_submit\" type=\"button\" value=\"Add Torrent\" />";
	var style = "<style>#adddialog * { color: rgb(68, 68, 68); background: rgb(249, 249, 249); } #dirremover, #labelremover { height: 1em; cursor: pointer; } </style>"
	
	$.fancybox("<div id=\"adddialog\">"+style+"<h2>Select label and directory for torrent adding</h2>"+adddialog+"</div>");

	$("#dirremover").click(function() {
		$("#adddialog_directory :selected").remove();
		setNewSettings(settings, dirlist, labellist, null, null, serverIndex);
	});
	$("#labelremover").click(function() {
		$("#adddialog_label :selected").remove();
		setNewSettings(settings, dirlist, labellist, null, null, serverIndex);
	});
	
	$("input#adddialog_submit").click(function() {
		var selectedLabel = $("select#adddialog_label").val();
		var inputLabel = $("input#adddialog_label_new").val();
		var selectedDir = $("select#adddialog_directory").val();
		var inputDir = $("input#adddialog_directory_new").val();
		
		var targetLabel = (inputLabel=="")? ((selectedLabel==null)? "" : selectedLabel) : inputLabel;
		var targetDir = (inputDir=="")? ((selectedDir==null)? "" : selectedDir) : inputDir;
		
		chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": targetLabel, "dir": targetDir, "server": server});
		
		setNewSettings(settings, dirlist, labellist, targetDir, targetLabel, serverIndex);
		
		$.fancybox.close();
	});

	function setNewSettings(settings, baseDirs, baseLabels, newDir, newLabel, serverIndex) {
		var newdirlist = new Array(); var newlabellist = new Array();
		if(newDir) newdirlist.push(newDir); 
		if(newLabel) newlabellist.push(newLabel);
		dirlist = $("#adddialog_directory option").map(function() { return $(this).val() }).get();
		for(x in dirlist) {
			if(dirlist[x] != newDir) newdirlist.push(dirlist[x]);
		}
		labellist = $("#adddialog_label option").map(function() { return $(this).val() }).get();
		for(x in labellist) {
			if(labellist[x] != newLabel) newlabellist.push(labellist[x]);
		}
		
		var servers = JSON.parse(settings.servers);
		var server;
		if(!serverIndex)
			server = servers[0];
		else
			server = servers[serverIndex];

		server["dirlist"] = JSON.stringify(newdirlist);
		server["labellist"] = JSON.stringify(newlabellist);

		servers[serverIndex] = server;
		settings.servers = JSON.stringify(servers);

		chrome.extension.sendRequest({"action": "setStorageData", "data": settings});
	}
}