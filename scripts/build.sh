#!/bin/bash
# Join src files into one file
echo "Building CGView.js"
ls dev/* | sort -r | xargs cat > src/CGView.js

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
jsdoc --configure scripts/jsdoc_conf.json --template scripts/jaguarjs-jsdoc --destination docs --readme README.txt dev/* 
echo "Done!"



