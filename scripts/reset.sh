#!/bin/bash
sh scripts/change-plugin-version.sh dataview 0.5.44;
cp scripts/dataview-v0.5.44-main.sample ../dataview/main.js
sh scripts/change-plugin-version.sh obsidian-excalidraw-plugin 0.0.1;
sh scripts/change-plugin-version.sh random-structural-diary-plugin 0.0.1;
sh scripts/change-plugin-version.sh smart-random-note 0.0.1;