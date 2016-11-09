require 'crack'
require 'json'

# input_path = "../../data/cgview_1_no_cg.xml"
# output_path = "../../data/cgview_1_no_cg.json"
input_path = "../../data/cgview_1.xml"
output_path = "../../data/cgview_1.json"
# input_path = "../../examples/example_3/cgview.xml"
# output_path = "../../data/cgview_3.json"
# input_path = "../../data/reduced_cgview.xml"
# output_path = "../../data/TEST.json"

input = File.read(input_path)


# Replace some names
input.gsub!('featureSlot', 'featureSlots')
input.gsub!('feature ', 'features ')
input.gsub!('feature>', 'features>')
input.gsub!('featureRange', 'featureRanges')




# Convert GC Content to Feature Path
# Path should have baseline:
#  - proportion of slot
#  - color
#  - array of bp: ( (stop - start) / 2 ) + start
#  - array of proportionOfThickness
#     - proportionOfThickness
#     - (+/-): if radiusAdjustment is below 50 store propOfThickness as a negative
#     - 4 decimal places max
#  - array of windows

# hash['cgview']['featureSlots']

cg_input = nil
if (input =~ /(<!-- GC content.*?<\/featureSlots>)/m)
  cg_input = $1
  input.sub!(/<!-- GC content.*?<\/featureSlots>/m, '')
  puts "Altering CG Content"
end

# Remove GC Skew
if (input =~ /(<!-- GC skew.*?<\/featureSlots>)/m)
  # cg_input = $1
  input.sub!(/<!-- GC skew.*?<\/featureSlots>/m, '')
  puts "Removing Skew"
end

hash = Crack::XML.parse(input)

if cg_input
  cg_hash = Crack::XML.parse(cg_input)
  ranges = cg_hash['featureSlots']['features']['featureRanges']
  cg_hash['featureSlots']['features']['featureRanges'] = nil
  bp = []
  proportionOfThickness = []
  ranges.each do |range|
    bp << ( (range['stop'].to_i - range['start'].to_i) / 2 ).floor + range['start'].to_i
    sign = (range['radiusAdjustment'].to_f >= 0.5) ? 1 : -1
    proportionOfThickness << (sign * range['proportionOfThickness'].to_f).round(5)
  end
  path = {
    bp: bp,
    proportionOfThickness: proportionOfThickness
  }
  cg_hash['featureSlots']['features']['featurePaths'] = path
  hash['cgview']['featureSlots'] << cg_hash['featureSlots']
end



# Adjust featureThickness to be a proportion of the backboneRadius
backboneRadius = hash['cgview']['backboneRadius'].to_f
defaultThickness = hash['cgview']['featureThickness']
hash['cgview']['featureSlots'].each do |slot|
  thickness = slot['featureThickness'] || defaultThickness
  slot['proportionOfRadius'] = thickness.to_f / backboneRadius
end


json = JSON.generate(hash)

File.open(output_path, 'w') { |f| f.write(json) }
