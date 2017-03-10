require 'optparse'
require 'ostruct'
require 'closure-compiler'

this_script_dir = File.expand_path(File.dirname(__FILE__))
CGVIEW_JS_DIR = this_script_dir.sub(/scripts.*/, '')

# Command line options will be stored in *options*
options = OpenStruct.new

# Define and grab the options 
optparse = OptionParser.new do |opts|
  opts.summary_width = 30

  opts.banner = "Usage: build_cgview_html.rb [options]"
  opts.separator ""
  opts.separator "Required Arguments:"

  opts.on("-i", "--infile FILE", "CGview XML or JSON file") do |infile|
    options.infile = infile
  end

  opts.on("-o", "--out_prefix STRING", "Write html and json (if required) using this prefix") do |prefix|
    options.out_prefix = prefix
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
if !(options.infile && options.out_prefix) then
  puts "\nMissing Required Arguments!", "", optparse
  exit
end

# Convert xml to json if required
create_json = false
if (options.infile =~ /\.xml$/)
  cgview_xml_2_json_path = File.join(CGVIEW_JS_DIR, 'scripts', 'cgview_xml_2_json/cgview_xml_2_json.rb')
  system("ruby #{cgview_xml_2_json_path} -i '#{options.infile}' -o '#{options.out_prefix}.json'")
  create_json = true
end

# Build CGView.js
puts 'Building CGView.js'
build_cgviewjs_path = File.join(CGVIEW_JS_DIR, 'scripts', 'build.sh')
system("bash #{build_cgviewjs_path}")

# Minify javascript
puts "Minifying javascript"
cgview_js_path = File.join(CGVIEW_JS_DIR, 'src', 'CGView.js')
closure = Closure::Compiler.new(language_in: 'ECMASCRIPT6', language_out: 'ES5')
min_js = closure.compile(File.open(cgview_js_path, 'r'))
cgview_js_min_path = cgview_js_path.sub('.js', '') + ".min.js"
File.open(cgview_js_min_path, 'w') do |f|
  f.puts(min_js)
end

# Read template
template_path = File.join(File.dirname(__FILE__), 'template.html')
template = File.read(template_path)

# Add Stylesheet
puts "Adding stylesheet"
style_path = File.join(CGVIEW_JS_DIR, 'stylesheets', 'cgview.css')
styles = File.read(style_path)
template.sub!('$CGVIEWSTYLES$', styles)

# Add CGView.js
puts "Adding CGView.js"
template.sub!('$CGVIEWJS$', min_js)

# Add cgview.json to template
puts "Adding JSON"
json = create_json ?  File.read("#{options.out_prefix}.json") : File.read(options.infile)
template.sub!('$JSON$', json)

File.open("#{options.out_prefix}.html", 'w') do |f|
  f.puts(template)
end




# ruby scripts/build_cgview_html/build_cgview_html.rb -i data/tests/builder.json -o ~/Desktop/haemophilus_influenzae_genome
# ruby scripts/build_cgview_html/build_cgview_html.rb -i data/tests/builder.json -o ~/Desktop/reclinomonas_americana_mitochondrion




# cgvxml = CGViewXML.new(options.infile)
# cgvxml.write_json(options.outfile)
