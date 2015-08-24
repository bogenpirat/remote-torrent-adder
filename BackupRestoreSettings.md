# Introduction #

If you use multiple installations of Chrome on multiple PCs, you may want to use each installation with the same settings for the Remote Torrent Adder extension. Since options are numerous and may become even more numerous in the future, doing this manually can turn into a bit of a hassle. This details how you can backup and restore your settings from one installation into the next.


# Backup #

In your original installation, do this to backup your settings:
  1. open up the Remote Torrent Adder settings.
  1. from there, hit Ctrl+Shift+J to bring up the Developer Tools window.
  1. open up the Console by hitting the button in the lower left with the ">" on it
  1. type JSON.stringify(localStorage);

This will spit out a string containing every setting that the extension has saved in Chrome. Note that the JSON-String is output encapsulated with quotation marks, like this: "{"foo":"bar",...}". You only need to copy/save everything starting from the first curly bracket to the last curly bracket.


# Restore #

In the target installation, you do this to restore the previously saved settings:
  1. bring up the Console window inside the settings again
  1. type these lines:
```
tmp = {your json string here};
for(x in tmp) localStorage[x] = tmp[x];
```
At this point, you can refresh the options page. Your settings should be restored.