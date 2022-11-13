# Obsidian Plugin Update Tracker

- [Features](#features)
  * [Know when installed plugins have updates](#know-when-installed-plugins-have-updates)
  * [View a list of updates](#view-a-list-of-updates)
  * [Read the release notes to see what's changed](#read-the-release-notes-to-see-whats-changed)
  * [Install Plugin Updates](#install-plugin-updates)
  * [Evaluate the riskiness of upgrading](#evaluate-the-riskiness-of-upgrading)
      - [Statistics on new versions](#statistics-on-new-versions)
      - [Wait a few days before showing updates](#wait-a-few-days-before-showing-updates)
      - [View code changes between versions of a plugin](#view-code-changes-between-versions-of-a-plugin)
  * [Ignore Specific Plugin Updates](#ignore-specific-plugin-updates) 
- [Installation Link](#installation)     
- [Feature Ideas](#feature-ideas)
  * [Keeping your plugin update list clean](#keeping-your-update-list-clean)
  * [Theme update tracking](#theme-update-tracking)
  * [More security heuristics](#more-security-heuristics)
- [Checking for updates in other plugins using the API](#checking-for-updates-in-other-plugins-using-the-api)

# Features

## Know when installed plugins have updates

**Desktop:**

This small icon is added to the status bar:

![image](https://user-images.githubusercontent.com/17691679/193410461-5882744b-670a-4cf9-9606-2864dba148d1.png): When 5 plugins have updates

![image](https://user-images.githubusercontent.com/17691679/193410447-395cb124-289d-4e92-b236-4d313bdc6bc8.png): When all plugins are up-to-date

**Mobile/Tablet:**

This ribbon action is shown when there's at least one update available:

![image](https://user-images.githubusercontent.com/17691679/201494579-ec481261-728d-4ac1-81dd-2d754420bf69.png)

Note that the update count is currently not shown on mobile/tablet. This icon can also be hidden from settings.

## View a list of updates

When updates are available, click the plugin icon to see the list:

<img width="1169" alt="image" src="https://user-images.githubusercontent.com/17691679/198849416-6186f041-eac5-431b-8e39-b1ae4d41a656.png">

## Read the release notes to see what's changed

Release notes are safely rendered as markdown

![image](https://user-images.githubusercontent.com/17691679/193410513-047060a1-c631-4b48-81f1-204ff6011714.png)

![image](https://user-images.githubusercontent.com/17691679/193410498-88444760-8c97-4da2-a0ac-9d4e384886d8.png)

## Install Plugin Updates

![Screen_Recording_2022-10-29_at_3_43_48_PM_AdobeExpress (1)](https://user-images.githubusercontent.com/17691679/198850850-5f61dba0-31a7-4d9e-aab5-8776850d3897.gif)

## Evaluate the riskiness of upgrading

#### Statistics on new versions

Older versions with more downloads are likely more stable and secure
![image](https://user-images.githubusercontent.com/17691679/193410588-aa858192-7c17-447a-825c-a2a8e55cf15b.png)

#### Wait a few days before showing updates

![image](https://user-images.githubusercontent.com/17691679/193410812-78bfeb0f-02a5-41f5-8632-c1c682b85830.png)

#### View code changes between versions of a plugin 

Clicking *Code Changes* will bring you to a page like https://github.com/blacksmithgu/obsidian-dataview/compare/0.5.43...0.5.46#files_bucket.

<sub>⚠️ The code in the git diff may be different than what's installed. Obsidian downloads a separate `main.js` file from the github release, which the author could add any code to.</sub>

## Ignore Specific Plugin Updates
Hide new plugin versions that you don't want to install from the plugin icon count and update list:

https://user-images.githubusercontent.com/17691679/200182586-c0a237ff-3cf4-4693-b1c5-9051b599e1ae.mov

# Installation
Visit this URL: obsidian://show-plugin?id=obsidian-plugin-update-tracker

# Feature Ideas

Vote on or suggest other features here: https://strawpoll.com/polls/NMnQBOJwWg6

## Keeping your update list clean
- Option to "snooze"/hide a new version of a plugin until a time that you specify
- Setting to exclude disabled plugins from update counts
- Add a toggle to show/hide disabled plugins

## Theme Update Tracking

## More security heuristics
- On a sandboxed machine, does building the `main.js` from source produce the same code as the github release asset?
- Were new dependencies added to `package.json`?
- Has the `main.js` github release asset been updated since the version was published?

# Checking for updates in other plugins using the API

The API used to get plugin version info is free for anyone to use. This could be helpful for alerting your plugin's users about updates in a custom way.

The API uses cacheing/servless to keep costs low, avoid hitting github rate limits, and scale automatically. Note that results are currently cached for 30 minutes so a large number of cache misses can cause high latency.


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
            "obsidianPluginId": "obsidian-excalidraw-plugin",
            "version": "1.7.25"
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
        "pluginRepoPath": "blacksmithgu/obsidian-dataview",
        "newVersions": [
            {
                "releaseId": 79493021,
                "versionName": "0.5.47",
                "versionNumber": "0.5.47",
                "minObsidianAppVersion": "0.13.11",
                "notes": "# 0.5.47\n\nImproves `date + duration` behavior when either the date or duration are null.\n",
                "areNotesTruncated": false,
                "downloads": 45232,
                "fileAssetIds": {
                    "manifestJson": 80616557,
                    "mainJs": 80616558
                },
                "publishedAt": "2022-10-11T06:24:26Z",
                "updatedAt": "2022-10-11T06:24:26Z"
            },
            {
                "releaseId": 76774596,
                "versionName": "0.5.46",
                "versionNumber": "0.5.46",
                "minObsidianAppVersion": "0.13.11",
                "notes": "# 0.5.46\n\n- Fix #1412: Fix bad `file.cday` and `file.ctime` comparisons due to wrong timezone being set. Ugh.\n",
                "areNotesTruncated": false,
                "downloads": 43628,
                "fileAssetIds": {
                    "manifestJson": 77407853,
                    "mainJs": 77407852
                },
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
                "downloads": 4199,
                "fileAssetIds": {
                    "manifestJson": 77205985,
                    "mainJs": 77205984
                },
                "publishedAt": "2022-09-08T05:24:23Z",
                "updatedAt": "2022-09-08T05:24:23Z"
            }
        ]
    },
    {
        "obsidianPluginId": "obsidian-excalidraw-plugin",
        "pluginName": "Excalidraw",
        "pluginRepositoryUrl": "https://github.com/zsviczian/obsidian-excalidraw-plugin",
        "pluginRepoPath": "zsviczian/obsidian-excalidraw-plugin",
        "newVersions": [
            {
                "releaseId": 80829877,
                "versionName": "Excalidraw 1.7.26",
                "versionNumber": "1.7.26",
                "minObsidianAppVersion": "0.15.6",
                "notes": "## Fixed\r\n- Transcluded block with a parent bullet does not embed sub-bullet [#853](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/853)\r\n- Transcluded text will now exclude ^block-references at end of lines\r\n- Phantom duplicates of the drawing appear when \"zoom to fit\" results in a zoom value below 10% and there are many objects on the canvas [#850](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/850)\r\n- CTRL+Wheel will increase/decrease zoom in steps of 5% matching the behavior of the \"+\" & \"-\" zoom buttons.\r\n- Latest updates from Excalidarw.com\r\n  - Freedraw flip not scaling correctly [#5752](https://github.com/excalidraw/excalidraw/pull/5752)\r\n  - Multiple elements resizing regressions [#5586](https://github.com/excalidraw/excalidraw/pull/5586)\r\n\r\n## New - power user features\r\n- Force the embedded image to always scale to 100%. Note: this is a very niche feature with a very particular behavior that I built primarily for myself (even more so than other features in Excalidraw Obsidian - also built primarily for myself 😉)... This will reset your embedded image to 100% size every time you open the Excalidraw drawing, or in case you have embedded an Excalidraw drawing on your canvas inserted using this function, every time you update the embedded drawing, it will be scaled back to 100% size. This means that even if you resize the image on the drawing, it will reset to 100% the next time you open the file or you modify the original embedded object. This feature is useful when you decompose a drawing into separate Excalidraw files, but when combined onto a single canvas you want the individual pieces to maintain their actual sizes. I use this feature to construct Book-on-a-Page summaries from atomic drawings.\r\n- I added an action to the command palette to temporarily disable/enable Excalidraw autosave. When autosave is disabled, Excalidraw will still save your drawing when changing to another Obsidian window, but it will not save every 10 seconds. On a mobile device (but also on a desktop) this can lead to data loss if you terminate Obsidian abruptly (i.e. swipe the application away, or close Obsidian without first closing the drawing). Use this feature if you find Excalidraw laggy.",
                "areNotesTruncated": false,
                "downloads": 877,
                "fileAssetIds": {
                    "manifestJson": 82708877,
                    "mainJs": 82708880
                },
                "publishedAt": "2022-10-29T12:36:26Z",
                "updatedAt": "2022-10-29T12:36:10Z"
            }
        ]
    }
]
```
