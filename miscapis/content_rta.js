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
			if(forms[x] != null && forms[x].hasOwnProperty('action') && forms[x].action.match && forms[x].action.match(new RegExp(res[mkey], "g"))) {
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
						
						if(response["rutorrentdirlabelask"]=="true" && response["client"]=="ruTorrent WebUI")
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
	console.debug("content script says hi");
	if(request.action == "showLabelDirChooser" && request.url && request.settings) {
		showLabelDirChooser(request.settings, request.url);
		sendResponse({});
	}
});

function showLabelDirChooser(settings, url) {
	var dirlist = settings["dirlist"] && JSON.parse(settings["dirlist"]);
	var labellist = settings["labellist"] && JSON.parse(settings["labellist"]);

	var adddialog = "Directory: <select id=\"adddialog_directory\">";
	for(x in dirlist) adddialog += "<option value=\""+dirlist[x]+"\">"+dirlist[x]+"</option>";
	adddialog += "</select> or new: <input id=\"adddialog_directory_new\" type=\"text\" /><br/>";
	adddialog += "Label: <select id=\"adddialog_label\">";
	for(x in labellist) adddialog += "<option value=\""+labellist[x]+"\">"+labellist[x]+"</option>";
	adddialog += "</select> or new: <input id=\"adddialog_label_new\" type=\"text\" /><br/>";
	adddialog += "<input id=\"adddialog_submit\" type=\"button\" value=\"Add Torrent\" />";
	var style = "<style>#adddialog * { color: rgb(68, 68, 68); background: rgb(249, 249, 249); } </style>"
	
	$.fancybox("<div id=\"adddialog\">"+style+"<h2>Select label and directory for torrent adding</h2>"+adddialog+"</div>");
	
	$("input#adddialog_submit").click(function() {
		var selectedLabel = $("select#adddialog_label").val();
		var inputLabel = $("input#adddialog_label_new").val();
		var selectedDir = $("select#adddialog_directory").val();
		var inputDir = $("input#adddialog_directory_new").val();
		
		var targetLabel = (inputLabel=="")? ((selectedLabel==null)? "" : selectedLabel) : inputLabel;
		var targetDir = (inputDir=="")? ((selectedDir==null)? "" : selectedDir) : inputDir;
		
		chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": targetLabel, "dir": targetDir});
		
		var newdirlist = new Array(); var newlabellist = new Array();
		newdirlist.push(targetDir); newlabellist.push(targetLabel);
		for(x in dirlist) {
			if(dirlist[x] != targetDir) newdirlist.push(dirlist[x]);
		}
		for(x in labellist) {
			if(labellist[x] != targetLabel) newlabellist.push(labellist[x]);
		}
		
		settings["dirlist"] = JSON.stringify(newdirlist);
		settings["labellist"] = JSON.stringify(newlabellist);
		
		chrome.extension.sendRequest({"action": "setStorageData", "data": settings});
		$.fancybox.close();
	});
}