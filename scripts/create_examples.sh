# Runs CGViewBuilder for the examples
# Uses GenBank and config files

# Relative position of data directory to this script
DATA_DIR="../docs/data"

# Path to CGViewBuilder
CGViewBuilder='../../cgview-builder/cgview_builder_cli.rb'

PWD=$(pwd)
DIR=$(dirname $0)
cd $DIR || exit

IDs=('NC_001823' 'CP021212' 'NC_000908' 'GCF_000335355' 'NZ_CP016793' 'NZ_CP028842')

for id in ${IDs[@]}; do
  echo "Running CGView Builder for '${id}'"
  ruby $CGViewBuilder --sequence "${DATA_DIR}/seq/${id}.gbk" --config "${DATA_DIR}/config/${id}.yaml" --outfile "${DATA_DIR}/json/${id}.json"
done

cd $PWD

echo 'Done!'
