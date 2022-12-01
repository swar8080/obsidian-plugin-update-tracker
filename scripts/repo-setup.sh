#!/bin/bash
set -x

git config core.hooksPath .githooks;

cp node_modules/obsidian/index.js /tmp/obsidian-index-tmp.js
npm ci;
cp /tmp/obsidian-index-tmp.js node_modules/obsidian/index.js;
git add --force node_modules/obsidian/index.js;