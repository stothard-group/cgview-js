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

  opts.banner = "Usage: convert_cgv_to_es5.rb [options]"
  opts.separator ""
  opts.separator "Required Arguments:"

  opts.on("-i", "--infile FILE", "CGview ES6  file") do |infile|
    options.infile = infile
  end

  opts.on("-o", "--outfile FILE", "CGview ES5 file") do |outfile|
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
# if !(options.infile && options.outfile) then
#   puts "\nMissing Required Arguments!", "", optparse
#   exit
# end


# Build CGView.js
puts 'Building CGView.js'
build_cgviewjs_path = File.join(CGVIEW_JS_DIR, 'scripts', 'build.sh')
system("bash #{build_cgviewjs_path}")

# Minify javascript
puts "Minifying javascript"
cgview_js_path = File.join(CGVIEW_JS_DIR, 'src', 'CGView.js')
closure = Closure::Compiler.new(language_in: 'ECMASCRIPT6', language_out: 'ES5')
# closure = Closure::Compiler.new(language_in: 'ECMASCRIPT6', language_out: 'ES5_STRICT')
min_js = closure.compile(File.open(cgview_js_path, 'r'))
cgview_js_min_path = cgview_js_path.sub('.js', '') + ".min.js"
File.open(cgview_js_min_path, 'w') do |f|
  f.puts(min_js)
end

