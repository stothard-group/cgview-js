#!/bin/bash

# FIXME: get directory from the current script location
CGVIEW_DIR=~/workspace/stothard_group/cgview-js
CGVIEW_SERVER_DIR=~/workspace/stothard_group/cgview-server

# Join src files into one file
echo "Building CGView.js"
# ls ${CGVIEW_DIR}/dev/* | sort -r | xargs cat > ${CGVIEW_DIR}/src/CGView.js

cat ${CGVIEW_DIR}/dev/Viewer.js > ${CGVIEW_DIR}/src/CGView.js
cat ${CGVIEW_DIR}/dev/CGObject.js >> ${CGVIEW_DIR}/src/CGView.js
find ${CGVIEW_DIR}/dev ! -name Viewer.js ! -name CGObject.js | xargs cat >> ${CGVIEW_DIR}/src/CGView.js

echo "Convert ES6 to ES5..."
ruby ${CGVIEW_DIR}/scripts/convert_cgv_to_es5.rb -i ${CGVIEW_DIR}/src/CGView.js -o ${CGVIEW_DIR}/src/CGView.min.js

echo "Copying files to cgview-server..."
# cp ${CGVIEW_DIR}/src/CGView.js ${CGVIEW_SERVER_DIR}/app/assets/javascripts/CGView.js
cp ${CGVIEW_DIR}/src/CGView.min.js ${CGVIEW_SERVER_DIR}/app/assets/javascripts/CGView.min.js
cp ${CGVIEW_DIR}/stylesheets/cgview.css ${CGVIEW_SERVER_DIR}/app/assets/stylesheets/cgview.css

echo "Done!"



