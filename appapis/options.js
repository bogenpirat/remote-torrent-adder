$(document).ready(function(){
	var tabCounter = 1;
	
	registerGeneralSettingsEvents();

	loadGeneralSettings();
	
	$(function() {
		$("#configtabs").tabs();
	});

	// new server type selection dialog // tab adding stuff
	$(function() {
		var tabTitle = $("#tab_title");
		var tabClient = $("#tab_client");
		var tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";
		var tabs = $("#serverstabs").tabs();



		function checkName(name, callback) {
			let flag = false;
			chrome.storage.sync.get(["servers"], (result) => {
				servers = result.servers
				if (!servers.length && name !== "")
					callback(tabTitle.val(), tabClient.val(), true);
				else{
					for(let server in servers) {
						if(!(servers[server].name == name || name === null || name === "")){
							console.log("this worked", name, servers[server].name);
							if(!flag){
								callback(tabTitle.val(), tabClient.val(), true);
								flag = true
							}
						}else{
							err_msg = "The choosen name is either taken or empty";
							console.log(err_msg, servers[server].name, name);
						}
					}
				}
			});
		}

		tabs.find(".ui-tabs-nav").sortable({
			stop: function() {
				tabs.tabs("refresh");
				saveServersSettings();
			}
		});

		var dialog = $("#dialog").dialog({
			autoOpen: false,
			modal: true,
			buttons: {
				Add: function() {
					checkName(tabTitle.val(), addTab);
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			close: function() {
				form[0].reset();
			}
		});
		
		var form = dialog.find("form").submit(function() {
			if(addTab(tabTitle.val())) {
				dialog.dialog("close");
			}
			return false;
		});



		function addTab(name, client, oldload) {
			var id = "servertabs-" + tabCounter;
			var li = $(tabTemplate.replace(/#\{href\}/g, "#" + id).replace(/#\{label\}/g, name));
			var tabContentHtml = RTA.clients.config.getConfig(client || tabClient.val(), name);

			tabs.find(".ui-tabs-nav").append(li);
			tabs.append("<div id='" + id + "'><p>" + tabContentHtml + "</p></div>");
			tabs.tabs("refresh");
			if(oldload !== true) {
				tabs.tabs("option", "active", -1);
			} else {
				tabs.tabs("option", "active", 0);
			}
			tabCounter++;

			$("input, select").bind("change keyup", function(event) {
				saveServersSettings();
			});
		}


		$("#add_tab").button().click(function() {
			dialog.dialog("open");
		});

		// close icon: removing the tab on click
		tabs.delegate("span.ui-icon-close", "click", function() {
			var panelId = $(this).closest("li").remove().attr("aria-controls");
			$("#" + panelId).remove();
			tabs.tabs("refresh");
			saveServersSettings();
		});

		tabs.bind("keyup", function(event) {
			if (event.altKey && event.keyCode === $.ui.keyCode.BACKSPACE) {
				var panelId = tabs.find(".ui-tabs-active").remove().attr("aria-controls");
				$("#" + panelId).remove();
				tabs.tabs("refresh");
				saveServersSettings();
			}
		});


		// load server configs
		chrome.storage.sync.get(["servers"], (result) => {
			for(var serv in result.servers) {
				var server = result.servers[serv];

				addTab(server.name, server.client, true);

				var mySettingInputs = $("#servertabs-" + (parseInt(serv) + 1)).find("input, select").get();
				for(var u in mySettingInputs) {
					var mySettingInput = mySettingInputs[u];
					if(server.hasOwnProperty(mySettingInput.name)) {
						switch(mySettingInput.type) {
							case "checkbox":
							$(mySettingInput).prop('checked', server[mySettingInput.name]);
							break;
							case "select-multiple":
							var optionlist = JSON.parse(server[mySettingInput.name]);
							for(var k in optionlist) {
								$(mySettingInput).append($("<option>", {
									text: optionlist[k]
								}));
							}
							break;
							default:
							$(mySettingInput).val(server[mySettingInput.name]);
						}
					}

					if(mySettingInput.type == "select-multiple") {
						switch(mySettingInput.name) {
							case "dirlist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=adddirbutton]").click(function() {
								var answer = prompt("Enter a new directory");
								if(answer !== null) {
									$(this).parents("td").find("select[name=dirlist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=deldirbutton]").click(function() {
								$(this).parents("td").find("select[name=dirlist] option:selected").remove();
								saveServersSettings();
							});
							break;
							case "labellist":
							var thisTd = $(mySettingInput).parents("td");
							thisTd.find("button[name=addlabelbutton]").click(function() {
								var answer = prompt("Enter a new label");
								if(answer !== null) {
									$(this).parents("td").find("select[name=labellist]").append($("<option>", {
										text: answer
									}));
									saveServersSettings();
								}
							});
							thisTd.find("button[name=dellabelbutton]").click(function() {
								$(this).parents("td").find("select[name=labellist] option:selected").remove();
								saveServersSettings();
							});
							break;
						}
					}
				}
			}
		});
	});
});

function loadGeneralSettings() {
	var e = document.querySelectorAll("#linksfoundindicator,#showpopups,#popupduration,#catchfromcontextmenu,#catchfrompage,#linkmatches,#catchfromnewtab,#registerDelay")
	for (key in e) {
		getSetting(e[key]);
	}

	// load matches
	loadMatches();
	
	// set visibility
	flipVisibility("showpopups", "popupduration");
	flipVisibility("catchfrompage", "linkmatches");
}

function flipVisibility(checkname, changename) {
	document.getElementById(changename).disabled = (document.getElementById(checkname).checked) ? false : true;
}

function setSetting(e, val) {
	chrome.storage.sync.get(['global'], (result) => {
		result.global[e.id] = (val == undefined) ? "" : val;
		chrome.storage.sync.set({'global':result.global});
	});
}

function getSetting(element) {
	chrome.storage.sync.get(['global'], (result) => {
		let global = result.global
		if(element.type == "text" || element.type == "password") {
			document.getElementById(element.id).value = (global[element.id] == undefined) ? "" : global[element.id];
		} else if(element.type == "checkbox") {
			document.getElementById(element.id).checked = (global[element.id] == "true") ? true : false;
		}
	});	
}

function saveMatches() {
	var opts = document.getElementById("linkmatches").getElementsByTagName("option");
	var destStr = ""; var i=0;
	for(key in opts)
		if(opts[key].text) {
			var sep = (i++ == 0) ? "" : "~";
			destStr += sep + opts[key].text;
		}
		chrome.storage.sync.get(["global"], (result) => {
			result.global["linkmatches"] = destStr;
			chrome.storage.sync.set({"global":result.global});
		});
	}

	function loadMatches() {
		var newSelEl = document.createElement("select");
		newSelEl.setAttribute("id", "linkmatches");
		newSelEl.setAttribute("multiple", "multiple");
		newSelEl.setAttribute("size", "5");
		chrome.storage.sync.get(["global"], (result) => {
			global = result.global;
			if(global["linkmatches"].length){
				for(key in global["linkmatches"].split("~")) {
					var newEl = document.createElement("option");
					newEl.text = global["linkmatches"].split("~")[key];
					newSelEl.appendChild(newEl);
				}
				var selEl = document.getElementById("linkmatches");
				selEl.parentNode.appendChild(newSelEl);
				selEl.parentNode.removeChild(selEl);	
			}
		});
	}

	function addMatch() {
		var newMatch = prompt("Enter a partial string of a link that should be caught by the extension","");
		if(!newMatch) return;

		var newOpt = new Option(newMatch);
		document.getElementById('linkmatches').appendChild(newOpt);
		saveMatches();
	}

	function deleteMatches() {
		var list = document.getElementById('linkmatches');
		for(var i = list.length-1; i>=0; i--)
			if(list.options[i].selected) {
				list.removeChild(list.options[i]);
			}
			saveMatches();
		}

		Storage.prototype.setObject = function(key, val) {
			this.setItem(key, JSON.stringify(val));
		}
		Storage.prototype.getObject = function(key) {
			var value = this.getItem(key);
			return value && JSON.parse(value);
		}

		function registerGeneralSettingsEvents() {
			document.querySelector("#linksfoundindicator").onchange = function() {
				setSetting(this, (this.checked) ? 'true' : 'false');
			};

			document.querySelector("#showpopups").onchange = function() {
				setSetting(this, (this.checked) ? 'true' : 'false');
			};
			document.querySelector("#showpopups").onclick = function() {
				flipVisibility(this.id, 'popupduration');
			};

			document.querySelector("#popupduration").onkeyup = function() {
				setSetting(this, this.value);
			};

			document.querySelector("#notificationtest").onclick = function() {
				var opts = { 
					type: "basic", 
					iconUrl: "icons/BitTorrent128.png", 
					title: "This is a test notification",
					priority: 0,
					message: "This is a test message!"
				};
				chrome.storage.sync.get(['global'], (result) => {
					global = result.global;
					var id = Math.floor(Math.random() * 99999) + "";

					chrome.notifications.create(id, opts, function(myId) { id = myId });

					setTimeout(function(){chrome.notifications.clear(id, function() {});}, global['popupduration']);
				})
			};

			document.querySelector("#catchfromcontextmenu").onchange = function() {
				setSetting(this, (this.checked) ? 'true' : 'false');
			};

			document.querySelector("#catchfrompage").onchange = function() {
				setSetting(this, (this.checked) ? 'true' : 'false');
			};
			document.querySelector("#catchfrompage").onclick = function() {
				flipVisibility(this.id, 'linkmatches');
			};

			document.querySelector("#catchfromnewtab").onchange = function() {
				setSetting(this, (this.checked) ? 'true' : 'false');
			};

			document.querySelector("#addfilterbtn").onclick = function() {
				addMatch();
			};

			document.querySelector("#delfilterbtn").onclick = function() {
				deleteMatches();
			};

			document.querySelector("#showfiltersbtn").onclick = function() {
				chrome.storage.sync.get(['global'], (result) => {
					global = result.global;
					alert(global['linkmatches']);
				});
			};

			document.querySelector("#registerDelay").onkeyup = function() {
				setSetting(this, this.value);
			};
		}

		function saveServersSettings() {
			var order = {};
			var links = $("a[href^=#servertabs-]").get();
			for(var i in links) {
				order[links[i].href.split('#')[1]] = i;
			}

			var servers = [];
			$("div[id^=servertabs-]").each(function(i, el) {
				var thisId = $(el).prop("id");
				var server = {};
				var elements = $(el).find("input, select").get();
				for(var u in elements) {
					var element = elements[u];

					switch(element.type) {
						case "checkbox":
						server[element.name] = $(element).prop('checked');
						break;
						case "select-multiple":
						server[element.name] = JSON.stringify(Array.prototype.map.call(element.options, function(x) { return x.value }));
						break;
						default:
						server[element.name] = $(element).val();
					}
				}
				servers[order[thisId]] = server;
			});
			chrome.storage.sync.set({"servers": servers});

			chrome.runtime.sendMessage({"action": "constructContextMenu"});

			chrome.runtime.sendMessage({"action": "registerRefererListeners"});

			return servers;
		}
