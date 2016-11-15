require 'crack'
require 'json'

class CGViewXML

  attr_accessor :xml_string, :xml_hash, :cg_content_string, :gc_skew_string, :json

  def initialize(xml_file = nil)
    @xml_hash = {}
    if xml_file
      read_xml_file(xml_file)
    end
  end

  def read_xml_file(path)
    string = File.read(path)
    read_xml_string(string)
  end

  def read_xml_string(xml_string)
    @xml_string = xml_string
    pluralize_nodes
    extract_cg_content
    extract_gc_skew
    generate_hash
    generate_json
  end

  def pluralize_nodes
    # Make nodes that will become arrays plural
    @xml_string.gsub!('featureSlot', 'featureSlots')
    @xml_string.gsub!('feature ', 'features ')
    @xml_string.gsub!('feature>', 'features>')
    @xml_string.gsub!('featureRange', 'featureRanges')
  end

  def extract_cg_content
    if (@xml_string =~ /(<!-- GC content.*?<\/featureSlots>)/m)
      @cg_content_string = $1
      @xml_string.sub!(/<!-- GC content.*?<\/featureSlots>/m, "<featureSlots marker='cg_content' />")
    end
  end

  def extract_gc_skew
    if (@xml_string =~ /(<!-- GC skew.*?<\/featureSlots>)/m)
      @gc_skew_string = $1
      @xml_string.sub!(/<!-- GC skew.*?<\/featureSlots>/m, "<featureSlots marker='gc_skew' />")
    end
  end

  def generate_hash
    @xml_hash = Crack::XML.parse(@xml_string)
    add_cg_content
    add_gc_skew
    adjust_feature_thickness
  end

  def add_cg_content
    if @cg_content_string
      puts "Formatting CG Content..."
      cg_content_hash = patherize_slot(@cg_content_string)
      insert_slot_at_marker(cg_content_hash['featureSlots'], 'cg_content')
    end
  end
  def add_gc_skew
    if @gc_skew_string
      puts "Formatting GC Skew..."
      gc_skew_hash = patherize_slot(@gc_skew_string)
      insert_slot_at_marker(gc_skew_hash['featureSlots'], 'gc_skew')
    end
  end

  def patherize_slot(slot_string)
    hash = Crack::XML.parse(slot_string)
    ranges = hash['featureSlots']['features']['featureRanges']
    hash['featureSlots']['features']['featureRanges'] = nil
    bp = []
    proportionOfThickness = []
    color_positive = nil
    color_negative = nil
    ranges.each do |range|
      color_negative = range['color'] if range['radiusAdjustment'].to_f < 0.5
      color_positive = range['color'] if range['radiusAdjustment'].to_f >= 0.5
      bp << ( (range['stop'].to_i - range['start'].to_i) / 2 ).floor + range['start'].to_i
      sign = (range['radiusAdjustment'].to_f >= 0.5) ? 1 : -1
      proportionOfThickness << (sign * range['proportionOfThickness'].to_f).round(5)
    end
    path = {
      bp: bp,
      proportionOfThickness: proportionOfThickness
    }
    if color_positive != color_negative
      path[:colorPositive] = color_positive
      path[:colorNegative] = color_negative
    else
      path[:color] = color_positive
    end
    hash['featureSlots']['features']['featurePaths'] = path
    hash
  end

  def insert_slot_at_marker(slot, marker) 
    index = @xml_hash['cgview']['featureSlots'].find_index { |s| s['marker'] == marker }
    if index
      @xml_hash['cgview']['featureSlots'][index] = slot
    end
  end

  def adjust_feature_thickness
    backboneRadius = @xml_hash['cgview']['backboneRadius'].to_f
    defaultThickness = @xml_hash['cgview']['featureThickness']
    @xml_hash['cgview']['featureSlots'].each do |slot|
      thickness = slot['featureThickness'] || defaultThickness
      slot['proportionOfRadius'] = thickness.to_f / backboneRadius
    end
  end

  def generate_json
    @json = JSON.generate(@xml_hash)
  end

  def write_json(path)
    File.open(path, 'w') { |f| f.write(@json) }
  end

end
