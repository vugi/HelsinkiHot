#!/bin/sh

SRC="../public/js/src"
DIST="../public/js/dist"

echo "Compile .js files from folder $SRC to $DIST"

java -jar compiler.jar \
  --js=$SRC/LabelOverlay.js \
  --js=$SRC/HelsinkiHot.js \
  --js=$SRC/Heatmap.js \
  --js=$SRC/MapHelper.js \
  --js=$SRC/Socket.js \
  --js_output_file=$DIST/helsinkihot.js
