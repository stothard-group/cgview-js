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
      next if feature.position.nil?
      locations = Bio::Locations.new(feature.position)
      if locations.length > 1
        # FIXME Complex Feature...What Now
        next
      end
      location = locations.first
      @features.push({
        start: location.from,
        stop: location.to,
        strand: location.strand
      })
      # NOTE: This converts the array of qualifiers to a easily accessible hash.
      # However, there is a risk some information is lost when two or more qualifiers are the same.
      qualifiers = feature.assoc
      # WHY locus_tag and not gene
      gene_name = qualifiers['locus_tag']
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


