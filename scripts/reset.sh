#!/bin/bash
sh scripts/change-plugin-version.sh dataview 0.5.44;
cp scripts/dataview-v0.5.44-main.sample ../dataview/main.js
sh scripts/change-plugin-version.sh obsidian-excalidraw-plugin 1.7.22;
sh scripts/change-plugin-version.sh smart-random-note 0.1.3;
sh scripts/change-plugin-version.sh obsidian42-brat 0.6.1;