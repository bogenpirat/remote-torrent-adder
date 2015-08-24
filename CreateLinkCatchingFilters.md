# Intro #
Since the click interception function is perhaps the most important aspect of this extension - it makes adding a torrent to the WebUI a one click operation as opposed to two or more - the possibility to add custom filters is an equally important part of the extension's preferences.

For maximum adaptivity, this extension uses regular expressions to match download links. It comes pre-installed with two extensions that should catch a variety of torrent download links, but definitely won't catch all.

What follows is a brief explanation for the regexp newbie on how to get a working regular expression from a sample link.


## Let's start with some random torrent download link ##
Consider this link: **https://ssl.somesite.com/torrents.php?action=download&id=12345678&authkey=0a1b2c3d4e5f6g7h8i9j**

We don't care about the protocol itself - merely the site's domain name itself should be kept in the pattern, so we strip the protocol and subdomain.

We get: **somesite.com/torrents.php?action=download&id=12345678&authkey=0a1b2c3d4e5f6g7h8i9j**

---

The most interesting part after the domain name should be the name of the script that delivers the .torrent files for downloading, in this case it's **torrents.php**, so we leave that in. The parameter **action=download** identifies exactly what we want - to download a torrent - so that too is one that we won't touch. Next up is an ID - this is a number identifying the torrent on the tracker's side. Since we want to download other torrents as well that don't have this unique ID, we'll replace it with a placeholder that will match any kind of ID. Since those are numbers only, we use **\d+**. This catches any and all strings of numbers, and nothing but numbers.

Therefore: **somesite.com/torrents.php?action=download&id=\d+&authkey=0a1b2c3d4e5f6g7h8i9j**

---

Now what we have left is the parameter containing the authkey. Since our pattern before that parameter already contains a lot of information that will prevent it from matching links it shouldn't, we might as well just cut it off entirely. Alternatively, we could replace the value of authkey to accept a string containing anything, and this anything may be of arbitrary length.

Thus: **somesite.com/torrents.php?action=download&id=\d+**

Alternatively: **somesite.com/torrents.php?action=download&id=\d+&authkey=.+?**

---

As a last step, we will have to make this pattern actually work: some of the characters that were part of the original url are characters that have a specific meaning in regular expressions, those are for the most part "." (dot), "/" (forward slash) and "?" (question mark). To render them inert, we place a "\" (backslash) in front of them - we "escape" them:

Finally: **somesite\.com\/torrents\.php\?action=download&id=\d+**

This will match any link that follows the naming pattern of the original link.