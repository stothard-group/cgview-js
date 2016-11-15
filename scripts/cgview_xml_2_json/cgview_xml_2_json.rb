require_relative 'cgview_xml'
require 'optparse'
require 'ostruct'

# Command line options will be stored in *options*
options = OpenStruct.new

# Define and grab the options 
optparse = OptionParser.new do |opts|
  opts.summary_width = 30

  opts.banner = "Usage: cgview_xml2json.rb [options]"
  opts.separator ""
  opts.separator "Required Arguments:"

  opts.on("-i", "--infile FILE", "CGview XML file") do |infile|
    options.infile = infile
  end

  opts.on("-o", "--outfile FILE", "Write JSON to this file") do |outfile|
    options.outfile = outfile
  end

  opts.separator ""
  opts.separator "General Options:"

  # This will print an options summary.
  opts.on('-h', '-?', '--help', "Show this message") do
    puts opts
    exit!
  end
  opts.separator ""
end

# Parse command line arguments
begin
  optparse.parse!(ARGV)
rescue Exception => e
  puts e, "", optparse
  exit
end

# Check for required arguments
if !(options.infile && options.outfile) then
  puts "\nMissing Required Arguments!", "", optparse
  exit
end

cgvxml = CGViewXML.new(options.infile)
cgvxml.write_json(options.outfile)


