#!/bin/bash
set -x
pluginId=$1;
pluginVersion=$2;

startDir=`pwd`;

cd ../$pluginId;
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i ".bak" "s/\"version\".*,/\"version\": \"$pluginVersion\",/" manifest.json
else
  sed -i.bak "s/\"version\".*,/\"version\": \"$pluginVersion\",/" manifest.json
fi
cat manifest.json;

cd $startDir;