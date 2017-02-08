require 'json'
require 'bio'


class CGViewJSON

  attr_accessor :config, :options, :seq_object, :sequence, :cgview, :seq_type, :features

  def initialize(sequence_path, options={})
    @cgview = {}
    @options = options
    @features = []
    read_config(options[:config]) if options[:config]
    read_sequence(sequence_path)
    extract_features
    build_cgview
  end

  def read_config(path)
    @config = {}
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
      locations = Bio::Locations.new(feature.position)
      @features.push({
        start: locations.range.first,
        stop: locations.range.last
      })
    end
  end

  def build_cgview
    @cgview[:mapTitle] = map_title
    @cgview[:sequence] = {seq: @sequence}
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
    JSON.generate(@xml_hash)
  end

  def write_json(path)
    File.open(path, 'w') { |f| f.write(self.to_json) }
  end

end

cgview = CGViewJSON.new("data/sequences/NC_001823.gbk")


