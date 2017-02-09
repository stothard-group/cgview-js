#!/bin/bash

# FIXME: get directory from the current script location
CGVIEW_DIR=~/workspace/stothard_group/cgview-js

# Join src files into one file
echo "Building CGView.js"
ls ${CGVIEW_DIR}/dev/* | sort -r | xargs cat > ${CGVIEW_DIR}/src/CGView.js

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
echo "Building Documentation..."
jsdoc --configure ${CGVIEW_DIR}/scripts/jsdoc_conf.json --template ${CGVIEW_DIR}/scripts/jaguarjs-jsdoc --destination ${CGVIEW_DIR}/docs --readme ${CGVIEW_DIR}/README.txt ${CGVIEW_DIR}/dev/* 
echo "Done!"



