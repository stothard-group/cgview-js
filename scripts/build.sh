#!/bin/bash

# FIXME: get directory from the current script location
CGVIEW_DIR=~/workspace/stothard_group/cgview-js

# Join src files into one file
echo "Building CGView.js"
# ls ${CGVIEW_DIR}/dev/* | sort -r | xargs cat > ${CGVIEW_DIR}/src/CGView.js

cat ${CGVIEW_DIR}/dev/Viewer.js > ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/CGObject.js >> ${CGVIEW_DIR}/src/CGView.js
find ${CGVIEW_DIR}/dev ! -name Viewer.js ! -name CGObject.js | xargs cat >> ${CGVIEW_DIR}/src/CGView.js

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
echo "Building Documentation..."
# jsdoc --configure ${CGVIEW_DIR}/scripts/jsdoc_conf.json --template ${CGVIEW_DIR}/scripts/jaguarjs-jsdoc --destination ${CGVIEW_DIR}/docs --readme ${CGVIEW_DIR}/README.md --tutorials ${CGVIEW_DIR}/tutorials ${CGVIEW_DIR}/dev/*
jsdoc --configure ${CGVIEW_DIR}/scripts/jsdoc_conf.json --template ${CGVIEW_DIR}/scripts/jaguarjs-jsdoc --destination ${CGVIEW_DIR}/docs --readme ${CGVIEW_DIR}/README.md ${CGVIEW_DIR}/dev/*

# TESTING FOR JSV
# JSV_DIR=~/workspace/wishartlab/jsv
# echo $JSV_DIR
# jsdoc --configure ${CGVIEW_DIR}/scripts/jsdoc_conf.json --template ${CGVIEW_DIR}/scripts/jaguarjs-jsdoc --destination ~/Desktop/jsv-docs --readme ${JSV_DIR}/README.md ${JSV_DIR}/dev/*

echo "Copying Tutorials"
ln -s ../tutorials/basic_map.html docs/basic_map.html
ln -s ../tutorials/sequence_map.html docs/sequence_map.html


echo "Done!"



