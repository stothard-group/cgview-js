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
    @xml_string.gsub!('legend ', 'legends ')
    @xml_string.gsub!('legend>', 'legends>')
    @xml_string.gsub!('legendItem', 'legendItems')
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
    confirm_featureslots_is_array
    confirm_features_is_array
    confirm_legends_is_array
    confirm_legend_items_is_array
    adjust_fonts
    move_ranges_to_features
    adjust_feature_thickness
  end

  def add_cg_content
    if @cg_content_string
      puts "Formatting CG Content..."
      cg_content_hash = ploterize_slot(@cg_content_string)
      insert_slot_at_marker(cg_content_hash['featureSlots'], 'cg_content')
    end
  end
  def add_gc_skew
    if @gc_skew_string
      puts "Formatting GC Skew..."
      gc_skew_hash = ploterize_slot(@gc_skew_string)
      insert_slot_at_marker(gc_skew_hash['featureSlots'], 'gc_skew')
    end
  end

  def ploterize_slot(slot_string)
    hash = Crack::XML.parse(slot_string)
    ranges = hash['featureSlots']['features']['featureRanges']
    hash['featureSlots'].delete('features')
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
    plot = {
      bp: bp,
      proportionOfThickness: proportionOfThickness
    }
    if color_positive != color_negative
      plot[:colorPositive] = color_positive
      plot[:colorNegative] = color_negative
    else
      plot[:color] = color_positive
    end
    hash['featureSlots']['arcPlot'] = plot
    hash
  end

  def insert_slot_at_marker(slot, marker) 
    index = @xml_hash['cgview']['featureSlots'].find_index { |s| s['marker'] == marker }
    if index
      @xml_hash['cgview']['featureSlots'][index] = slot
    end
  end

  # FeatureSlots should be an array but if only one is present is will be a hash
  def confirm_featureslots_is_array
    if @xml_hash['cgview']['featureSlots'].class == Hash
      @xml_hash['cgview']['featureSlots'] = [ @xml_hash['cgview']['featureSlots'] ]
    end
  end

  # Features should be an array but if only one is present is will be a hash
  def confirm_features_is_array
    @xml_hash['cgview']['featureSlots'].each do |slot|
      if slot['features'].class == Hash
        slot['features'] = [ slot['features'] ]
      end
    end
  end

  def legendsPresent?
    @xml_hash['cgview']['legends']
  end

  # Legends should be an array but if only one is present is will be a hash
  def confirm_legends_is_array
    if legendsPresent?
      if @xml_hash['cgview']['legends'].class == Hash
        @xml_hash['cgview']['legends'] = [ @xml_hash['cgview']['legends'] ]
      end
    end
  end

  # LegendItems should be an array but if only one is present is will be a hash
  def confirm_legend_items_is_array
    if legendsPresent?
      @xml_hash['cgview']['legends'].each do |legend|
        if legend['legendItems'].class == Hash
          legend['legendItems'] = [ legend['legendItems'] ]
        end
      end
    end
  end

  def adjust_font(font_string)
    # Change family
    font_string.downcase!
    font_string.sub!('sansserif', 'sans-serif')
    # Change size
    font_string.sub!(/,\s*(\d+)\s*$/) do |m|
      size = $1.to_i
      if (size >= 50)
        ', 30'
      elsif (size >= 20)
        ', 12'
      else
        ', 10'
      end
    end
  end

  # Font family names need to be altered to match css styles
  # Font sizes need to be reduced
  def adjust_fonts
    puts "Adjusting fonts..."
    # Legends
    if legendsPresent?
      @xml_hash['cgview']['legends'].each do |legend|
        legend_font = legend['font']
        if legend_font
          legend['font'] = adjust_font(legend_font)
        end
        legend['legendItems'].each do |legendItem|
          legend_item_font = legendItem['font']
          if legend_item_font
            legendItem['font'] = adjust_font(legend_item_font)
          end
        end
      end
    end
    # Other fonts
    ruler_font = @xml_hash['cgview']['rulerFont']
    if ruler_font
      @xml_hash['cgview']['rulerFont'] = adjust_font(ruler_font)
    end
    label_font = @xml_hash['cgview']['labelFont']
    if label_font
      @xml_hash['cgview']['labelFont'] = adjust_font(label_font)
    end

  end

  def move_ranges_to_features
    @xml_hash['cgview']['featureSlots'].each do |slot|
      next unless slot['features']
      slot['features'].each do |feature|
        range = feature['featureRanges']
        if range.class == Array
          puts "Oh Noes! There is a feature with more than one range."
          puts range
          # exit
        elsif range
          range.each do |key, value|
            feature[key] = value
          end
          feature.delete('featureRanges')
        end
      end
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
