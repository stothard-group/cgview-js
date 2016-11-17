# Join src files into one file
echo "Building CGView.js"
# cat \
#   dev/Viewer.js \
#   dev/Debug.js \
#   dev/Utils.js \
#   # dev/JSVinit.js \
#   > src/CGView.js

# Create documentation
# jsdoc must be installed
# To install jsdoc globally:
# > npm install -g jsdoc
# Get a better template (use --template option) and create a tutorial (--tutorials)
# Help:
#   http://usejsdoc.org/index.html
#   https://github.com/davidshimjs/jaguarjs-jsdoc
echo "Building Documentation..."
jsdoc --configure scripts/jsdoc_conf.json --template scripts/jaguarjs-jsdoc --tutorials demo/ --destination docs --readme README.txt dev/*
echo "Done!"
