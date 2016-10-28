# Join src files into one file
echo "Building CGView.js"
cat \
  dev/Viewer.js \
  dev/Debug.js \
  dev/Utils.js \
  # dev/JSVinit.js \
  > src/CGView.js
# Create documentation
# echo "Building Documentation..."
# doxx -s dev/ -T docs/ -t JSpectraViewer --template doxx/template.jade
echo "Done!"
