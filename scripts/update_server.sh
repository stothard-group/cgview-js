#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Build CGView.js and Documentation
$DIR/build.sh

#Copy CGview.js and CGview.css to cgview-server
SERVER_DIR=~/workspace/stothard_group/cgview-server/
echo "Copying CGView to: ${SERVER_DIR}"
cp $DIR/../src/CGView.js $SERVER_DIR/app/assets/javascripts/
cp $DIR/../stylesheets/cgview.css $SERVER_DIR/app/assets/stylesheets/
