#!/bin/bash

# FIXME: get directory from the current script location
CGVIEW_DIR=~/workspace/cgview-js
CGVIEW_SERVER_DIR=~/workspace/proksee-server

CGVIEW_JS=${CGVIEW_DIR}/src/CGView.js

# Join src files into one file
echo "Building CGView.js"
# ls ${CGVIEW_DIR}/dev/* | sort -r | xargs cat > ${CGVIEW_DIR}/src/CGView.js

echo "import * as d3 from 'd3';" > ${CGVIEW_JS}
cat ${CGVIEW_DIR}/dev/Viewer.js >> ${CGVIEW_JS}
cat ${CGVIEW_DIR}/dev/Events.js >> ${CGVIEW_JS}
cat ${CGVIEW_DIR}/dev/CGObject.js >> ${CGVIEW_JS}
find ${CGVIEW_DIR}/dev ! -name Viewer.js ! -name Events.js ! -name CGObject.js | xargs cat >> ${CGVIEW_JS}
echo "export default CGView;" >> ${CGVIEW_JS}

# Code for minimizing CGView
# echo "Convert ES6 to ES5..."
# ruby ${CGVIEW_DIR}/scripts/convert_cgv_to_es5.rb -i ${CGVIEW_DIR}/src/CGView.js -o ${CGVIEW_DIR}/src/CGView.min.js

echo "Copying files to proksee-server..."
cp ${CGVIEW_JS} ${CGVIEW_SERVER_DIR}/app/javascript/CGView.js
# cp ${CGVIEW_DIR}/src/CGView.min.js ${CGVIEW_SERVER_DIR}/app/assets/javascripts/other/CGView.min.js
cp ${CGVIEW_DIR}/stylesheets/cgview.css ${CGVIEW_SERVER_DIR}/app/assets/stylesheets/cgview.css

echo "Done!"



