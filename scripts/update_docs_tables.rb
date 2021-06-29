this_script_dir = File.expand_path(File.dirname(__FILE__))
CGVIEW_JS_DIR = this_script_dir.sub(/scripts.*/, '')

src_dir = File.join(CGVIEW_JS_DIR, 'src')
docs_path = File.join(CGVIEW_JS_DIR, 'demo', 'test.html')

klasses = ['Viewer', 'Feature', 'Plot', 'Track', 'Settings', 'Bookmark']

# Read tables from CGV classes
text = "\n"
klasses.each do |klass| 
  puts "Updating #{klass}..."
  klass_path = File.join(src_dir, "#{klass}.js")
  if File.exist?(klass_path)
    # Add Heading and link to class
    text += "\n## [#{klass}](api/#{klass}.html)\n"
    file = File.read(klass_path)
    # Actions and Events
    if file =~ /### Action and Events\n \*\n(.*?)\n \*\n/m
      table = $1
      table.gsub!(/^ \* ?/, '')
      # Add api directory to anchor links
      table.gsub!('(#', "(api/#{klass}.html#")
      # Add api directory to other Class links
      table.gsub!(/\]\(([A-Z])/, '](api/\1')
      # Replace docs links
      table.gsub!('../docs.html', '')
      # puts table
      text += table + "\n\n"
    else
      puts "- #{klass}: Actions not found!"
    end
    # Attributes
    # if file =~ /### Attributes\n \*\n(.*?)\n \*\n/m
    if file =~ /### Attributes\n \*\n(.*?)\n \*\n/m
      table = $1
      table.gsub!(/^ \* ?/, '')
      # Add api directory to links
      table.gsub!('(#', "(api/#{klass}.html#")
      # Add api directory to other Class links
      table.gsub!(/\]\(([A-Z])/, '](api/\1')
      # puts table
      # Add super scripts
      text += table + "\n\n"
      text += "#{$1}\n" if file =~ /(<sup>ic<\/sup>.*)$/
    else
      puts "- #{klass}: Attributes not found!"
    end
  else
    puts "File does not exist: '#{klass_path}'"
  end
end

# Put tables in doc.html
# puts text
docs_file = File.read(docs_path)
if docs_file =~ /<!-- REPLACE START -->.*<!-- REPLACE END -->/m
  puts "Replacing Tables in docs"
  docs_file.sub!(/<!-- REPLACE START -->.*<!-- REPLACE END -->/m, "<!-- REPLACE START -->#{text}<!-- REPLACE END -->")
  docs_path = File.join(CGVIEW_JS_DIR, 'demo', 'test.html')
  File.write("#{docs_path}.OUT.html", docs_file)
else
  puts "No REPLACE line found"
end







