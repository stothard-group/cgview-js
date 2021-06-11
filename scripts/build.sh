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
find ${CGVIEW_DIR}/dev ! -name OLD* ! -name Viewer.js ! -name CGObject.js ! -name Events.js | xargs cat >> ${CGVIEW_DIR}/src/CGView.js
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
# TESTING
jsdoc --configure ./docs/jsdoc_conf.json --destination ~/Desktop/docs --readme ./README.md --tutorials ./tutorials ./src/*

# BUILD DASH DOCSET
# Note: use --private to display private symbols
# Location of original template: /usr/local/lib/node_modules/jsdoc-dash-template
# Note: It's best to remove old dash folder first
echo "Building Dash Documentation..."
rm -r ${CGVIEW_DIR}/docs/dash
jsdoc --configure ${CGVIEW_DIR}/docs/jsdoc_conf.json --template ${CGVIEW_DIR}/docs/dash-jsdoc --destination ${CGVIEW_DIR}/docs/dash --private --readme ${CGVIEW_DIR}/README.md --tutorials ${CGVIEW_DIR}/tutorials ${CGVIEW_DIR}/dev/*

echo "Done!"

# --------------------------------------------------------------------------------
# TROUBLESHOOTING
# --------------------------------------------------------------------------------
# If there are node errors, you may need to update the packages. I did the following to fix issues:
# - For testing, I copy the docs directory and problem solve before performing on the main docs directory
# - jaguarjs-jsdoc:
#   - delete node_modules directory and package-lock
#   - run "npm install"
# - dash-jsdoc:
#   - I added underscore to package.json file
#   - npm install would not work for some reason
#     - So I created a new directory ran "npm init" added "underscore" to it and installed
#     - Then I copied the "underscore" directory to the dash-jsdoc node modules
#   - For the sqlite issue, I went into "/node_modules/sequelize":
#     - I upgrade sqlite (under devDependencies) to: "sqlite3": "^4.1.0"
#     - Then run "npm install"

# To use newer version of npm for now:
# /usr/local/Cellar/node/12.12.0/bin/npm install

