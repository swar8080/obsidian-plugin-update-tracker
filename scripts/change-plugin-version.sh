#!/bin/bash
set -x
pluginId=$1;
pluginVersion=$2;

startDir=`pwd`;

cd ../$pluginId;
sed -i .bak "s/\"version\".*,/\"version\": \"$pluginVersion\",/" manifest.json;
cat manifest.json;

cd $startDir;