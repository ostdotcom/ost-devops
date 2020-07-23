require 'json'

file_name = ARGV[0]
temp_env_file = ARGV[1]

#begin

  file_content = File.read(file_name)
  data = JSON.parse(file_content)

  open(temp_env_file, 'w') { |f|
    data.each do |k, v|
      f.puts "export #{k}=#{v}"
    end
  }

# rescue Exception => ex
#   puts "Error parsing file!"
#   exit!
# end
