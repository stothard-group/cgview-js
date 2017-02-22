require 'json'
require 'yaml'
require 'bio'


class CGViewJSON

  VERSION = '1.0'

  attr_accessor :config, :options, :seq_object, :sequence, :cgview, :seq_type, :features,
                :tracks, :debug, :captions

  def initialize(sequence_path, options={})
    @cgview = initialize_cgview
    @options = options
    @features = []
    @debug = options[:debug]
    read_config(options[:config]) if options[:config]
    read_sequence(sequence_path)
    extract_features
    build_feature_types
    build_legend
    build_captions
    build_tracks
    build_cgview
  end

  def initialize_cgview
    {
      version: VERSION,
      settings: {},
      sequence: {},
      featureTypes: [],
      captions: [],
      legend: {},
      features: [],
      layout: { tracks: [] }
    }

  end

  def read_config(path)
    @config = symbolize(YAML.load_file(path)['cgview'])
    @cgview[:settings] = @config[:settings]
    @cgview[:sequence] = @config[:sequence]
    @cgview[:legend] = @config[:legend]
    @cgview[:layout][:tracks] = @config[:layout] && @config[:layout][:tracks] || []
  end

  def symbolize(obj)
    if obj.is_a? Hash
      return obj.inject({}) do |memo, (k, v)|
        memo.tap { |m| m[k.to_sym] = symbolize(v) }
      end
    elsif obj.is_a? Array
      return obj.map { |memo| symbolize(memo) }
    end
    obj
  end

  def read_sequence(path)
    flatfile = Bio::FlatFile.auto(path)
    # Determine Sequence file type
    case flatfile.dbclass.to_s
    when 'Bio::GenBank'
      @seq_type = :genbank
    when 'Bio::EMBL'
      @seq_type = :embl
    when 'Bio::FastaFormat'
      @seq_type = :fasta
    else
      @seq_type = :raw
    end

    # Extract sequence
    if @seq_type == :raw
      @sequence = File.read(path).gsub(/[^A-Za-z]/, '').upcase
    else
      @seq_object = flatfile.first
      @sequence = @seq_object.to_biosequence.to_s.upcase
    end
  end

  def extract_features
    return unless [:embl, :genbank].include?(@seq_type)
    features_to_skip = ['source', 'gene', 'exon']
    # TODO: look into complex features from xml-builder
    @seq_object.features.each do |feature|
      next if features_to_skip.include?(feature.feature)
      next if feature.position.nil?
      locations = Bio::Locations.new(feature.position)
      unless locations.first == locations.last
        # FIXME Complex Feature...What Now
        next
      end
      # Feature Name
      # NOTE: This converts the array of qualifiers to a easily accessible hash.
      # However, there is a risk some information is lost when two or more qualifiers are the same.
      qualifiers = feature.assoc
      name = qualifiers['gene'] || qualifiers['locus_tag'] || qualifiers['note'] || feature.feature
      # Feature Location
      location = locations.first
      # Skip features with the same length as the sequence
      next if location.from == 1 && location.to == @seq_object.length
      # Create Feature
      @features.push({
        type: feature.feature,
        label: name,
        start: location.from,
        stop: location.to,
        strand: location.strand,
        source: "sequence-features"
      })
    end
  end

  def build_feature_types
    types = []
    config_types = {}
    default_decoration = 'arrow' # This can be overridden in config file
    # Read config file types
    if @config[:featureTypes].is_a?(Array)
      @config[:featureTypes].each { |t| config_types[t[:name]] = t }
      if config_types['DEFAULT']
        default_decoration = config_types['DEFAULT'][:decoration]
      end
    end
    feature_type_names = @features.map { |f| f[:type] }.uniq
    # Add config feature types that are present in features (Intersection)
    config_names_to_add = config_types.keys & feature_type_names
    config_names_to_add.each do |name|
      types << config_types[name]
    end
    # Create new feature types and use default decoration
    missing_type_names = feature_type_names - config_types.keys
    missing_type_names.each do |name|
      types << { name: name, decoration: default_decoration }
    end
    @cgview[:featureTypes] += types
  end

  def build_legend
    config_items = {}
    default_legend_name = nil
    # Read config file legend items
    if @config[:legend] && @config[:legend][:legendItems].is_a?(Array)
      @config[:legend][:legendItems].each { |i| config_items[i[:text]] = i }
      default_legend_name =  @config[:legend][:default]
    end
    # FIXME: add default legend if one does not exist
    @features.each do |feature|
      if config_items[feature[:type]]
        feature[:legend] = config_items[feature[:type]][:text]
      else
        feature[:legend] = config_items[default_legend_name][:text]
      end
    end
    # Intersection of legend names (They will be in the same order as the config
    feature_legend_names = config_items.keys & @features.map { |f| f[:legend] }.uniq
    items = []
    feature_legend_names.each { |n| items.push config_items[n] }
    @cgview[:legend][:legendItems] = items
  end

  def build_captions
    @captions = []
    config_captions = @config[:captions].is_a?(Array) ? @config[:captions] : []
    config_captions.each do |caption|
      if caption[:captionItems]
        @captions << caption
      elsif caption[:id] == 'title' && map_title != ""
        caption[:captionItems] = [ { text:  map_title}]
        @captions << caption
      end
    end
  end

  def build_tracks
    @tracks = [
      {
        name: 'Features',
        readingFrame: 'combined',
        strand: 'separated',
        position: 'both',
        contents: {
          features: {
            source: 'sequence-features'
          }
        }
      }
    ]
  end

  def build_cgview
    if @debug
      @cgview[:sequence][:seq] = "SEQUENCE WOULD GO HERE"
      @cgview[:features] += @features[1..5]
    else
      @cgview[:sequence][:seq] = @sequence
      @cgview[:features] += @features
    end
    @cgview[:layout][:tracks] += @tracks
    @cgview[:captions] += @captions
  end


  def map_title
    if @options[:mapTitle]
      @options[:mapTitle]
    elsif @seq_type == :raw
      ''
    else
      @seq_object.definition
    end
  end

  def to_json
    JSON.generate({ cgview: @cgview })
  end

  def write_json(path)
    File.open(path, 'w') { |f| f.write(self.to_json) }
  end

end

debug = false
# debug = true
file = "data/sequences/NC_001823.gbk"
file = "data/sequences/NC_000907.gbk"
# file = "data/sequences/NC_000913.gbk"
cgview = CGViewJSON.new(file, config: "scripts/cgview_json_builder/config.yaml", debug: debug)

cgview.write_json("/Users/jason/workspace/stothard_group/cgview-js/data/tests/builder.json")

