# Obsidian Plugin Update Checker

- [Features](#features)
  * [Know when installed plugins have updates](#know-when-installed-plugins-have-updates)
  * [View a list of updates](#view-a-list-of-updates)
  * [Read the release notes to see what's changed](#read-the-release-notes-to-see-whats-changed)
  * [Evaluate the riskiness of upgrading](#evaluate-the-riskiness-of-upgrading)
      - [Statistics on new versions](#statistics-on-new-versions)
      - [Wait a few days before showing updates](#wait-a-few-days-before-showing-updates)
      - [View code changes between versions of a plugin](#view-code-changes-between-versions-of-a-plugin)
- [Feature Ideas](#feature-ideas)
  * [Keeping your plugin update list clean](#keeping-your-update-list-clean)
  * [Install new versions through the plugin](#install-new-versions-through-the-plugin)
  * [More security heuristics](#more-security-heuristics)
- [Checking for updates in other plugins using the API](#checking-for-updates-in-other-plugins-using-the-api)

# Features

## Know when installed plugins have updates

This small icon is added to the status bar:

![image](https://user-images.githubusercontent.com/17691679/193410461-5882744b-670a-4cf9-9606-2864dba148d1.png): When 5 plugins have updates

![image](https://user-images.githubusercontent.com/17691679/193410447-395cb124-289d-4e92-b236-4d313bdc6bc8.png): When all plugins are up-to-date

## View a list of updates

Click the plugin icon to see the list:

![image](https://user-images.githubusercontent.com/17691679/193410392-09211af5-d875-444b-9a5e-3d06c00d7e35.png)

## Read the release notes to see what's changed

Release notes are safely rendered as markdown

![image](https://user-images.githubusercontent.com/17691679/193410513-047060a1-c631-4b48-81f1-204ff6011714.png)

![image](https://user-images.githubusercontent.com/17691679/193410498-88444760-8c97-4da2-a0ac-9d4e384886d8.png)

## Evaluate the riskiness of upgrading

#### Statistics on new versions

Older versions with more downloads are likely more stable and secure
![image](https://user-images.githubusercontent.com/17691679/193410588-aa858192-7c17-447a-825c-a2a8e55cf15b.png)

#### Wait a few days before showing updates

![image](https://user-images.githubusercontent.com/17691679/193410812-78bfeb0f-02a5-41f5-8632-c1c682b85830.png)

#### View code changes between versions of a plugin 

Clicking *Code Changes* will bring you to a page like https://github.com/blacksmithgu/obsidian-dataview/compare/0.5.43...0.5.46#files_bucket.

<sub>⚠️ The code in the git diff may be different than what's installed. Obsidian downloads a separate `main.js` file from the github release, which the author could add any code to.</sub>

# Feature Ideas

## Keeping your update list clean
- Option to hide/dismiss a new version of a plugin
- Option to "snooze"/hide a new version of a plugin until a time that you specify
- Setting to exclude disabled plugins from update counts
- Add a toggle to show/hide disabled plugins

## Install new versions through the plugin
- Download the plugins main.js, style.css and manifest.json and replace the current ones installed

## More security heuristics
- On a sandboxed machine, does building the `main.js` from source produce the same code as the github release asset?
- Were new dependencies added to `package.json`?
- Has the `main.js` github release asset been updated since the version was published?

# Checking for updates in other plugins using the API

The API used to get plugin version info is free for anyone to use. This could be helpful for alerting your plugin's users about updates in a custom way.

The API uses cacheing/servless to keep costs low, avoid hitting github rate limits, and scale automatically. Note that results are currently cached for 30 minutes, and a cache miss can have a couple seconds latency.


Request:

```
POST https://jc5gpa3gs7o2uge6iq5mgjd53q0daomi.lambda-url.us-east-1.on.aws

{
    "currentPluginVersions": [
        {
            "obsidianPluginId": "dataview",
            "version": "0.5.44"
        },
        {
            "obsidianPluginId": "obsidian-excalidraw",
            "version": "1.7.15"
        }
    ]
}
```

Response, which contains info on the 10 latest versions of the plugin that are greater than the version requested:
```
[
    {
        "obsidianPluginId": "dataview",
        "pluginName": "Dataview",
        "pluginRepositoryUrl": "https://github.com/blacksmithgu/obsidian-dataview",
        "newVersions": [
            {
                "releaseId": 76774596,
                "versionName": "0.5.46",
                "versionNumber": "0.5.46",
                "minObsidianAppVersion": "0.13.11",
                "notes": "# 0.5.46\n\n- Fix #1412: Fix bad `file.cday` and `file.ctime` comparisons due to wrong timezone being set. Ugh.\n",
                "areNotesTruncated": false,
                "downloads": 32002,
                "publishedAt": "2022-09-10T00:17:38Z",
                "updatedAt": "2022-09-10T00:17:38Z"
            },
            {
                "releaseId": 76553504,
                "versionName": "0.5.45",
                "versionNumber": "0.5.45",
                "minObsidianAppVersion": "0.13.11",
                "notes": "# 0.5.45\n\n- #1400: Properly use the group by field for the group name.\n- Fix bad table highlighting in some themes.\n",
                "areNotesTruncated": false,
                "downloads": 4198,
                "publishedAt": "2022-09-08T05:24:23Z",
                "updatedAt": "2022-09-08T05:24:23Z"
            }
        ]
    },
    {
        "obsidianPluginId": "obsidian-excalidraw-plugin",
        "pluginName": "Excalidraw",
        "pluginRepositoryUrl": "https://github.com/zsviczian/obsidian-excalidraw-plugin",
        "newVersions": [
            {
                "releaseId": 78165428,
                "versionName": "Excalidraw 1.7.22",
                "versionNumber": "1.7.22",
                "minObsidianAppVersion": "0.15.6",
                "notes": "# Fixed\r\n- Text size in sticky notes increased when opening the drawing or when editing a sticky note [#824](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/824)\r\n- ToDo rendering did not work properly when there were parsed links in the text\r\n- Horizontal text alignment in sticky notes did not honor text alignment setting when resizing text. The text was always aligned center even when text alignment was left or right. [#5720](https://github.com/excalidraw/excalidraw/issues/5720)",
                "areNotesTruncated": false,
                "downloads": 6955,
                "publishedAt": "2022-09-26T17:43:53Z",
                "updatedAt": "2022-09-26T17:43:27Z"
            }
        ]
    }
]
```
