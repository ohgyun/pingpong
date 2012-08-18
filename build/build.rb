#!/usr/bin/ruby

FILE_NAME = '../src/pingpong.js'
OUTPUT_FILE_PRE = '../release/pingpong-'
OUTPUT_FILE_SUF = '.min.js'
TEMP_COMPRESSED_FILE_NAME = 'tmp_compressed'

VERSION_PATTERN = /version\s*:\s*'([\d|\.]+)'/
LICENSE_PHRASE_PATTERN = /\/\/-/

license_phrase = []
version = -1
matches = nil
output_file_name = nil
output_file = nil

# Extract information from file
File.open(FILE_NAME).each_line do |line|

  # find license phrase
  license_phrase.push(line) if line =~ LICENSE_PHRASE_PATTERN

  # find version
  matches = VERSION_PATTERN.match(line)
  if matches
    version = matches[1]
    break
  end

end

if version == -1
  puts "Can't find version information"
  exit 0
end


# Create output file with license phrase
output_file_name = OUTPUT_FILE_PRE + version + OUTPUT_FILE_SUF
output_file = File.open(output_file_name, 'w')
license_phrase.each { |line| output_file.puts(line) }


# Compress script file
`
  java -jar compiler.jar \
  --js #{FILE_NAME} \
  --js_output_file #{TEMP_COMPRESSED_FILE_NAME}
`

# Append compressed script to output file
File.open(TEMP_COMPRESSED_FILE_NAME, 'r').each_line do |line|
  output_file << line
end


# Closing
output_file.close
`rm #{TEMP_COMPRESSED_FILE_NAME}`


puts "Build complete (version: #{version})"
exit 0
