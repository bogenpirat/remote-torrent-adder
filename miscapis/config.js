RTA.clients.config.getConfig = function(client, name) {
	var clientMap = {
		"ruTorrent WebUI" : RTA.clients.config.rutorrent,
		"Torrentflux WebUI" : RTA.clients.config.torrentflux,
		"uTorrent WebUI" : RTA.clients.config.utorrent,
		"Deluge WebUI" : RTA.clients.config.deluge,
		"Hadouken WebUI" : RTA.clients.config.hadouken,
		"Flood WebUI" : RTA.clients.config.flood,
		"QNAP DownloadStation" : RTA.clients.config.qnap,
		"qBittorrent WebUI" : RTA.clients.config.qbittorrent,
		"qBittorrent v4.1+ WebUI" : RTA.clients.config.qbittorrentv2,
		"rTorrent XML-RPC" : RTA.clients.config.rtorrentxmlrpc
	};
	
	var config = "<table>" + RTA.clients.config.generalsettings.replace(/\{clienttype\}/g, client).replace(/\{name\}/g, name);

	if(clientMap.hasOwnProperty(client))
		config += clientMap[client];

	return config;
};

RTA.clients.config.generalsettings = multiline(function(){/*
			<tbody>
				<tr>
					<td><span class="title">Name</span></td>
					<td><input type="text" name="name" value="{name}" /></td>
				</tr>
				<tr>
					<td><span class="title">Type</span></td>
					<td><input type="hidden" name="client" value="{clienttype}" /> {clienttype}</td>
				</tr>
				<tr>
					<td><span class="title">Host</span></td>
					<td><input type="text" name="host" /><br />
						<span class="tip">The ip/hostname to connect to</span></td>
				</tr>
				<tr>
					<td><span class="title">Port</span></td>
					<td><input type="text" name="port" /><br />
						<span class="tip">The remote port</span></td>
				</tr>
				<tr>
					<td><span class="title">SSL</span></td>
					<td><input type="checkbox" name="hostsecure" /><br />
						<span class="tip">Check if the WebUI runs on SSL (http<strong>s</strong>://). Set the Port to 443!</span></td>
				</tr>
				<tr>
					<td><span class="title">Username</span></td>
					<td><input type="text" name="login" /><br />
						<span class="tip">Login name of the WebUI</span></td>
				</tr>
				<tr>
					<td><span class="title">Password</span></td>
					<td><input type="password" name="password" /><br />
						<span class="tip">Password of the WebUI</span></td>
				</tr>
			</tbody>
			*/});



RTA.clients.config.deluge = multiline(function(){/*
			<tbody name="delugewebuispecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span><br />(optional)</td>
					<td><input type="text" name="delugerelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui</strong>&quot;/<br />
							Note: Unless you are doing reverse-proxying, this field should be left empty</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.rutorrent = multiline(function(){/*
			<tbody name="rutorrentspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span></td>
					<td><input type="text" name="ruTorrentrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />
							Note: this folder should contain the "php" directory.</span></td>
				</tr>
				<tr>
					<td><span class="title">Label</span><br />(optional)</td>
					<td><input type="text" name="rutorrentlabel" /><br />
						<span class="tip">Default label to use for added torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Directory</span><br />(optional)</td>
					<td><input type="text" name="rutorrentdirectory" /><br />
						<span class="tip">Default directory to store added torrents in. This should be an absolute path. It should be inside your default directory for torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Label/Directory<br/>interactivity</span></td>
					<td><input type="checkbox" name="rutorrentdirlabelask" /><br />
						<span class="tip">Enable this to always ask for a label/directory combination upon adding torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Add torrents paused?</span></td>
					<td><input type="checkbox" name="rutorrentaddpaused" /></td>
				</tr>
				<tr>
					<td><span class="title">Always send URLs</span></td>
					<td><input type="checkbox" name="rutorrentalwaysurl" /><br />
						<span class="tip">Enable this to always send URLs for adding torrents (never try to get a torrent file to send).</span></td>
				</tr>
				<tr>
					<td><span class="title">Directory list</span><br />(optional)</td>
					<td><div style="float: left"><select name="dirlist" multiple="multiple" size="5" style="min-width: 300px">
						</select></div>
						<div style="position:relative; float:left;"><button name="adddirbutton">+</button><br />
						<button name="deldirbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Directories to use for adding torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Labellist</span><br />(optional)</td>
					<td><div style="float: left"><select name="labellist" multiple="multiple" size="5" style="min-width: 300px" style="float:left;">
						</select></div>
						<div style="position:relative; float:left;"><button name="addlabelbutton">+</button><br />
						<button name="dellabelbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Labels to use for adding torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Auto-Labelling</span><br />(optional)</td>
					<td><div style="float: left"><select name="autolabellist" multiple="multiple" size="5" style="min-width: 300px" style="float:left;">
						</select></div>
						<div style="position:relative; float:left;"><button name="addautolabelbutton">+</button><br />
						<button name="delautolabelbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Define labels to be automatically assigned by parsing tracker <strong>Announce URLs</strong>. These are not the domain on the web, but the one set inside the .torrent file. You can find out about them by checking the details of a .torrent file in your torrent client. Format is as follows:</span><br />
						<span class="tip" style="font-family: Courier New;">&lt;tracker url&gt;,&lt;label to assign&gt;</span><br />
						<span class="tip">e.g.:</span><br />
						<span class="tip" style="font-family: Courier New;">torrent.ubuntu.com,Linux Distros</span></td>
				</tr>
				<tr>
					<td><span class="title">Auto-Directory</span><br />(optional)</td>
					<td><div style="float: left"><select name="autodirlist" multiple="multiple" size="5" style="min-width: 300px" style="float:left;">
						</select></div>
						<div style="position:relative; float:left;"><button name="addautodirbutton">+</button><br />
						<button name="delautodirbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Define directories to be automatically assigned by parsing tracker <strong>Announce URLs</strong>. These are not the domain on the web, but the one set inside the .torrent file. You can find out about them by checking the details of a .torrent file in your torrent client. Format is as follows:</span><br />
						<span class="tip" style="font-family: Courier New;">&lt;tracker url&gt;,&lt;directory to assign&gt;</span><br />
						<span class="tip">e.g.:</span><br />
						<span class="tip" style="font-family: Courier New;">torrent.ubuntu.com,/media/library/linux-distros/</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.torrentflux = multiline(function(){/*
			<tbody name="torrentfluxspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span></td>
					<td><input type="text" name="torrentfluxrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />
							Note: this directory should contain the files "login.php"/"index.php"</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.utorrent = multiline(function(){/*
			<tbody name="utorrentspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span><br />(optional)</td>
					<td><input type="text" name="utorrentrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui/</strong>&quot;<br />
							Note: Unless you are doing reverse-proxying, this field should be left empty</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.hadouken = multiline(function(){/*
			<tbody name="hadoukenspecifics" class="specifics">
				<tr>
					<td><span class="title">Label</span><br />(optional)</td>
					<td><input type="text" name="hadoukenlabel" /><br />
						<span class="tip"></span></td>
				</tr>
				<tr>
					<td><span class="title">Directory</span><br />(optional)</td>
					<td><input type="text" name="hadoukendir" /><br />
						<span class="tip"></span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.rtorrentxmlrpc = multiline(function(){/*
			<tbody name="rtorrentxmlrpcspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span><br />(optional)</td>
					<td><input type="text" name="rtorrentxmlrpcrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/RPC2</strong>&quot;/</span></td>
				</tr>
				<tr>
					<td><span class="title">Add torrents paused?</span></td>
					<td><input type="checkbox" name="rtorrentaddpaused" /></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.flood = multiline(function(){/*
			<tbody name="floodspecifics" class="specifics">
				<tr>
					<td><span class="title">Directory</span></td>
					<td><input type="text" name="flooddirectory" /><br />
						<span class="tip">Default directory to store added torrents in. This should be an absolute path. It must be allowed by the Flood server.</span></td>
				</tr>
				<tr>
					<td><span class="title">Tags</span><br />(optional)</td>
					<td><div style="float: left"><select name="labellist" multiple="multiple" size="5" style="min-width: 300px" style="float:left;">
						</select></div>
						<div style="position:relative; float:left;"><button name="addlabelbutton">+</button><br />
						<button name="dellabelbutton">-</button></div><br style="clear:both;" />
						<span class="tip">Tags to add to torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Add torrents paused?</span></td>
					<td><input type="checkbox" name="floodaddpaused" /></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.qnap = multiline(function(){/*
			<tbody name="qnapspecifics" class="specifics">
				<tr>
					<td><span class="title">Temp Directory</span><br /></td>
					<td><input type="text" name="qnaptemp" /><br />
						<span class="tip">Directory used while downloading/seeding.</span></td>
				</tr>
				<tr>
					<td><span class="title">Destination Directory</span><br /></td>
					<td><input type="text" name="qnapmove" /><br />
						<span class="tip">After torrent has completed it will be moved to this directory.</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.qbittorrent = multiline(function(){/*
			<tbody name="qbittorrentspecifics" class="specifics">
				<tr>
					<td><span class="title">Label/Directory<br/>interactivity</span></td>
					<td><input type="checkbox" name="qbittorrentdirlabelask" /><br />
						<span class="tip">Enable this to always ask for a label/directory combination upon adding torrents.</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.qbittorrentv2 = multiline(function(){/*
			<tbody name="qbittorrentv2specifics" class="specifics">
				<tr>
					<td><span class="title">Label/Directory<br/>interactivity</span></td>
					<td><input type="checkbox" name="qbittorrentv2dirlabelask" /><br />
						<span class="tip">Enable this to always ask for a label/directory combination upon adding torrents.</span></td>
				</tr>
			</tbody>
			*/});

