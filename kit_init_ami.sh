#!/usr/bin/env bash

line_dec="**************"

echo "${line_dec} Setting basic security check [START] ${line_dec}"
# Basic check
passwd -l root;
passwd -l centos;
timedatectl set-timezone UTC;

sed -i '/#PermitRootLogin yes/c\PermitRootLogin no' /etc/ssh/sshd_config;
echo -e "\tProtocol 2" >> /etc/ssh/ssh_config;
echo "${line_dec} Setting basic security check [DONE] ${line_dec}"

echo "${line_dec} Mounting /mnt [START] ${line_dec}"
# mount /mnt dir
mkfs.ext4 /dev/nvme1n1;
mkdir -p /mnt;
mount /dev/nvme1n1 /mnt;
echo '/dev/nvme1n1 /mnt     ext4     defaults,nofail     0     2' >> /etc/fstab;
mount -a;
# SEManage fcontext changes
semanage fcontext -a -t mnt_t "/mnt(.*)?";
restorecon -R -v -F /mnt;
echo $(df -h);
echo "${line_dec} Mounting /mnt [DONE] ${line_dec}"

echo "${line_dec} Adding swap space [START] ${line_dec}"
# Add swap space
dd if=/dev/zero of=/swapfile bs=1024 count=2097152; # Here we have given 2G space
mkswap /swapfile;
chmod 600 /swapfile;
swapon /swapfile;
echo '/swapfile               swap                    swap    defaults        0 0' >> /etc/fstab;
mount -a;
echo $(free -m);
echo "${line_dec} Adding swap space [DONE] ${line_dec}"

echo "${line_dec} Installing Required libs [START] ${line_dec}"
# Install required packages
yum update -y;
yum upgrade -y;
yum install ntp -y;
yum install vim -y;
yum install mlocate -y;
yum install lsof -y;
yum groupinstall "Development Tools" -y;
yum install epel-release -y;
yum install mysql-devel -y;
yum install mysql -y;
yum install wget -y;
yum install gcc-c++ patch readline readline-devel zlib zlib-devel -y;
yum install libyaml-devel libffi-devel openssl-devel make -y;
yum install libcurl-devel -y;
yum install memcached -y;
yum install ImageMagick-devel -y;
yum install python-devel -y;
yum install python -y;
yum install sqlite-devel -y;
yum install golang -y;
yum install gmp-devel -y;
yum install python36 -y
yum install httpd-tools -y
yum install htop -y
yum install postgresql -y
yum install ruby -y
yum install python36-pip -y
yum install libmaxminddb-devel -y
yum install perl-core zlib-devel -y
yum install java-1.8.0-openjdk -y

systemctl start ntpd;
systemctl enable ntpd;

pip3 install jinja2
pip3 install requests
echo "* soft nofile 500000" >> /etc/security/limits.conf;
echo "* hard nofile 500000" >> /etc/security/limits.conf;

touch /etc/environment;
echo "LANG=en_US.utf-8" >> /etc/environment;
echo "LC_ALL=en_US.utf-8" >> /etc/environment;

# Create user
adduser deployer
passwd -l deployer
groupadd devs
usermod -a -G devs deployer
echo "${line_dec} Installing Required libs [DONE] ${line_dec}"

echo "${line_dec} Installing RVM and Ruby [START] ${line_dec}"
export ruby_version='2.5.3'
export passenger_version='6.0.1'
# Install ruby
su - deployer -c "
gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB;
curl -sSL https://get.rvm.io | bash -s stable;
source /home/deployer/.rvm/scripts/rvm;
rvm install ${ruby_version};
";
echo "${line_dec} Installing RVM and Ruby [DONE] ${line_dec}"

# Setup passenger with nginx
echo "${line_dec} Installing passenger with nginx [START] ${line_dec}"

# Download nginx headers module
cd /opt;
wget https://github.com/openresty/headers-more-nginx-module/archive/v0.32.tar.gz;
tar -xzvf v0.32.tar.gz;
rm -f v0.32.tar.gz;

# Download geoip2 module from https://github.com/leev/ngx_http_geoip2_module/releases
cd /opt
wget https://github.com/leev/ngx_http_geoip2_module/archive/3.3.zip;
unzip 3.3.zip;
rm -f 3.3.zip;

su - deployer -c "
gem install bundler --no-document;
gem install passenger -v ${passenger_version} --no-document;
mkdir -p libs;
passenger-install-nginx-module --auto --auto-download --languages=ruby --prefix=/home/deployer/libs/nginx --extra-configure-flags=\"--with-http_gzip_static_module --with-http_ssl_module --add-module=/opt/headers-more-nginx-module-0.32 --add-module=/opt/ngx_http_geoip2_module-3.3\"
";
echo "${line_dec} Installing passenger with nginx [DONE] ${line_dec}"

echo "${line_dec} Installing pip and AWS CLI [START] ${line_dec}"
# Install Pip and AWS CLI
su - deployer -l -c "
export PATH=~/.local/bin:$PATH;
source ~/.bash_profile;
pip3 --version;
pip3 install --upgrade awscli --user;
aws --version;
";
echo "${line_dec} Installing pip and AWS CLI [DONE] ${line_dec}"

echo "${line_dec} Installing GETH [START] ${line_dec}"
# Install stable geth
export geth_version='1.8.23'
cd /opt;
git clone https://github.com/ethereum/go-ethereum;
cd go-ethereum/;
git checkout v${geth_version};
make all;
ln -s /opt/go-ethereum/build/bin/geth /usr/bin/geth;
echo "${line_dec} Installing GETH [DONE] ${line_dec}"

echo "${line_dec} Installing NodeJS [START] ${line_dec}"
# Install nodejs
cd /opt;
wget https://nodejs.org/dist/v8.9.0/node-v8.9.0-linux-x64.tar.xz;
tar -xvf node-v8.9.0-linux-x64.tar.xz;
rm -f node-v8.9.0-linux-x64.tar.xz;

cd /opt;
fldr="node-v10.16.3-linux-x64"
file="${fldr}.tar.xz"
wget https://nodejs.org/download/release/v10.16.3/${file};
tar -xvf ${file};
rm -f ${file};
ln -s /opt/${fldr}/bin/node /usr/bin/node;
ln -s /opt/${fldr}/bin/npm /usr/bin/npm;
node -v;
npm install pm2 -g
ln -s /opt/${fldr}/lib/node_modules/pm2/bin/pm2 /usr/bin/pm2

echo "${line_dec} Installing NodeJS [DONE] ${line_dec}"

echo "${line_dec} Installing Redis [START] ${line_dec}"
# Install redis server
redis_version='4.0.12'
cd /opt;
wget -c http://download.redis.io/releases/redis-${redis_version}.tar.gz;
tar -xvzf redis-${redis_version}.tar.gz;
cd redis-${redis_version};
make;
make install;
echo "${line_dec} Installing Redis [DONE] ${line_dec}"

echo "${line_dec} Installing Ruby for others [START] ${line_dec}"
# Install ruby for all users
sudo su -l -c "
gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB;
curl -sSL https://get.rvm.io | bash -s stable;
source /etc/profile.d/rvm.sh;
rvm install ${ruby_version};
gem install god --no-document;
";
echo "${line_dec} Installing Ruby for others [DONE] ${line_dec}"

echo "${line_dec} Installing latest version of openssl [START] ${line_dec}"
cd /usr/local/src/;
wget https://www.openssl.org/source/old/1.1.1/openssl-1.1.1c.tar.gz;
tar -xzvf openssl-1.1.1c.tar.gz;
cd openssl-1.1.1c;
./config --prefix=/usr/local/ssl --openssldir=/usr/local/ssl shared zlib
make
make test
make install
echo "/usr/local/ssl/lib" > /etc/ld.so.conf.d/openssl-1.1.1c.conf
ldconfig -v
mv /bin/openssl /bin/openssl.backup
cat > /etc/profile.d/openssl.sh <<- EOT
#Set OPENSSL_PATH
OPENSSL_PATH="/usr/local/ssl/bin"
export OPENSSL_PATH
PATH=\$PATH:\$OPENSSL_PATH
export PATH
EOT
chmod +x /etc/profile.d/openssl.sh
source /etc/profile.d/openssl.sh
echo $PATH
echo `openssl version -a`
echo "${line_dec} Installing latest version of openssl [DONE] ${line_dec}"

echo "${line_dec} Installing nrpe client [START] ${line_dec}"
useradd -s /sbin/nologin nagios
passwd -l nagios
rm -rf /tmp/*
cd /tmp
wget -O nrpe.tar.gz https://github.com/NagiosEnterprises/nrpe/releases/download/nrpe-3.2.1/nrpe-3.2.1.tar.gz
tar xzf nrpe.tar.gz
cd /tmp/nrpe-3.2.1/
sh configure --enable-command-args --with-nagios-user=deployer --with-command-group=deployer --with-nagios-group=deployer --with-ssl=/usr/local/ssl/bin/openssl --with-ssl-lib=/usr/lib/x86_64-linux-gnu --with-need-dh=no
make all
make install
make install-config
echo >> /etc/services
echo '# Nagios services' >> /etc/services
echo 'nrpe    5666/tcp' >> /etc/services

make install-init
cd /tmp
wget --no-check-certificate -O nagios-plugins.tar.gz https://github.com/nagios-plugins/nagios-plugins/archive/release-2.2.1.tar.gz
tar zxf nagios-plugins.tar.gz
cd /tmp/nagios-plugins-release-2.2.1/
sh tools/setup
sh configure --with-nagios-user=deployer --with-nagios-group=deployer --with-command-group=deployer --with-openssl
make
make install

systemctl enable nrpe
systemctl restart  nrpe

echo "${line_dec} Installing nrpe client [DONE] ${line_dec}"

echo "^^^^^^^ Completed ^^^^^^^";
