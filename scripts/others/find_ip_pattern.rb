threshold = 100
file_path = '/mnt/nginx/logs/ips.txt'
log_file_path = '/mnt/nginx/logs/access-ostWeb.log'

system('cat ' + log_file_path + ' | awk -v FS="(PROXY=|- HTTP_VIA)" \'{print $2}\' | awk -v FS="\"|," \'{print $2}\' | sort | uniq -c | sort -n > ' + file_path)

ip_patterns = []

File.open(file_path, "r").each_line do |line|
  line = line.strip

  line_parts = line.split(' ')

  curr_count = line_parts[0].to_i

  next if curr_count < threshold

  ip = line_parts[1]

  ip_parts = ip.split('.')

  curr_pattern = ip_parts[0] + '.' + ip_parts[1]

  next if ['10.20', '114.143'].include?(curr_pattern)

  ext_pattern = "#{ip_parts[0]}.#{ip_parts[1]}.#{ip_parts[2]}"
  puts "ext_pattern: #{ext_pattern}"
  next if ["66.249.92"].include?(ext_pattern)

  ip_patterns << '\"' + ip_parts[0] + '\.' + ip_parts[1]

end

puts 'tail -f ' + log_file_path + ' | grep "' + ip_patterns.uniq.join('\|') + '"'
