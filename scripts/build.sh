#!/bin/bash

# CGVIEW_DIR=~/workspace/stothard_group/cgview-js
CGVIEW_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"/..

# Join src files into one file
echo "Building CGView.js"
# ls ${CGVIEW_DIR}/dev/* | sort -r | xargs cat > ${CGVIEW_DIR}/src/CGView.js

mkdir -p ${CGVIEW_DIR}/src

cat ${CGVIEW_DIR}/dev/Viewer.js > ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/Events.js >> ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/CGObject.js >> ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/Caption.js >> ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/CaptionItem.js >> ${CGVIEW_DIR}/src/CGView.js
find ${CGVIEW_DIR}/dev ! -name Viewer.js ! -name CGObject.js ! -name Events.js ! -name Caption.js ! -name CaptionItem.js | xargs cat >> ${CGVIEW_DIR}/src/CGView.js
# NOTE: I've found that by not using CGView as a module, the performance doubles
# echo "export default CGView;" >> ${CGVIEW_DIR}/src/CGView.js

# Create documentation
# jsdoc must be installed
# To install jsdoc globally:
# > npm install -g jsdoc
# Get a better template (use --template option) and create a tutorial (--tutorials)
# Help:
#   http://usejsdoc.org/index.html
#   https://github.com/davidshimjs/jaguarjs-jsdoc
# NOTE:
# Issue with tutorials:
# - http://stackoverflow.com/questions/26531651/jaguarjs-jsdoc-fails-with-referenceerror-when-using-tutorials
# - I added the filename line (line 500)
echo "Building Web Documentation..."
jsdoc --configure ${CGVIEW_DIR}/docs/jsdoc_conf.json --template ${CGVIEW_DIR}/docs/jaguarjs-jsdoc --destination ${CGVIEW_DIR}/docs/html --readme ${CGVIEW_DIR}/README.md --tutorials ${CGVIEW_DIR}/tutorials ${CGVIEW_DIR}/dev/*

# BUILD DASH DOCSET
# Note: use --private to display private symbols
# Location of original template: /usr/local/lib/node_modules/jsdoc-dash-template
# Note: It's best to remove old dash folder first
echo "Building Dash Documentation..."
rm -r ${CGVIEW_DIR}/docs/dash
jsdoc --configure ${CGVIEW_DIR}/docs/jsdoc_conf.json --destination ${CGVIEW_DIR}/docs/dash --private --template ${CGVIEW_DIR}/docs/dash-jsdoc --readme ${CGVIEW_DIR}/README.md --tutorials ${CGVIEW_DIR}/tutorials ${CGVIEW_DIR}/dev/*

echo "Done!"



