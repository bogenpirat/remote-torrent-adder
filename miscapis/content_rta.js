chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
	if(response["catchfrompage"] != "true") return;

	var dirlist = response["dirlist"] && JSON.parse(response["dirlist"]);
	var labellist = response["labellist"] && JSON.parse(response["labellist"]);
	
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
					e.preventDefault();
					var url = this.href;
					
					if(response["rutorrentdirlabelask"]=="true" && response["client"]=="ruTorrent WebUI") {
						var adddialog = "Directory: <select id=\"adddialog_directory\">";
						for(x in dirlist) adddialog += "<option value=\""+dirlist[x]+"\">"+dirlist[x]+"</option>";
						adddialog += "</select> or new: <input id=\"adddialog_directory_new\" type=\"text\" /><br/>";
						adddialog += "Label: <select id=\"adddialog_label\">";
						for(x in labellist) adddialog += "<option value=\""+labellist[x]+"\">"+labellist[x]+"</option>";
						adddialog += "</select> or new: <input id=\"adddialog_label_new\" type=\"text\" /><br/>";
						adddialog += "<input id=\"adddialog_submit\" type=\"button\" value=\"Add Torrent\" />";
						
						$.fancybox("<div id=\"adddialog\"><h2>Select label and directory for torrent adding</h2>"+adddialog+"</div>");
						
						$("input#adddialog_submit").click(function() {
							var selectedLabel = $("select#adddialog_label").val();
							var inputLabel = $("input#adddialog_label_new").val();
							var selectedDir = $("select#adddialog_directory").val();
							var inputDir = $("input#adddialog_directory_new").val();
							
							var targetLabel = (inputLabel=="")? selectedLabel : inputLabel;
							var targetDir = (inputDir=="")? selectedDir : inputDir;
							
							chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": targetLabel, "dir": targetDir});
							
							var newdirlist = new Array(); var newlabellist = new Array();
							newdirlist.push(targetDir); newlabellist.push(targetLabel);
							for(x in dirlist) {
								if(dirlist[x] != targetDir) newdirlist.push(dirlist[x]);
							}
							for(x in labellist) {
								if(labellist[x] != targetLabel) newlabellist.push(labellist[x]);
							}
							
							response["dirlist"] = JSON.stringify(newdirlist);
							response["labellist"] = JSON.stringify(newlabellist);
							
							chrome.extension.sendRequest({"action": "setStorageData", "data": response});
							$.fancybox.close();
						});
					} else 
						chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": undefined, "dir": undefined});
				});
			}
		}
	}
});