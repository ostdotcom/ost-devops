#!/usr/bin/env bash

usage="./${0} --env <staging/production> --sub-env <sandbox/main> --app-stack <ost> --help"

while [ $# -gt 0 ]; do
    key=$1
    case ${key} in
        --env)
            shift
            export ENV=$1
            ;;
        --sub-env)
            shift
            export SUB_ENV=$1
            ;;
        --app-stack)
            shift
            export APP_STACK=$1
            ;;
        --help)
            echo $usage
            exit 0
            ;;
        *)
            echo $usage
            exit 1
            ;;
    esac
    shift
done

if [[ ${ENV} != "staging" && ${ENV} != "production" ]]; then
    echo "Invalid parameter '--env' => ${usage}"
    exit 1;
fi

if [[ ${SUB_ENV} != "sandbox" && ${SUB_ENV} != "main" ]]; then
    echo "Invalid parameter '--sub-env' => ${usage}"
    exit 1;
fi

if [[ ${APP_STACK} != "ost" ]]; then
    echo "Invalid parameter '--app-stack' => ${usage}"
    exit 1;
fi

stack_users="${ENV}-${SUB_ENV}-${APP_STACK}"

case ${stack_users} in
    "production-sandbox-ost")
        export final_users=("alpesh" "aman" "anagha" "dhananjay" "kedar" "pankaj" "shlok" "somashekhar" "sunil" "ben" "ryan");
        ;;
    "production-main-ost")
        export final_users=("alpesh" "aman" "kedar" "pankaj" "somashekhar" "sunil" "ben" "ryan");
        ;;
    *)
        echo "Invalid stack combination for final_users!"
        exit 1
        ;;
esac

declare -A sudo_users=(["bala"]=true ["amanpruthi"]=true);

function create_ssh_user(){
    local user_name=$1;
    local pub_key=$2;

    if [[ -z ${user_name} ]]; then
        echo "Invalid user name !"
        exit 1;
    fi

    if [[ -z ${pub_key} ]]; then
        echo "Invalid public key for user !"
        exit 1;
    fi

    # Check if user already present else create it
    getent passwd ${user_name}
    if [[ $? != 0 ]]; then
        adduser ${user_name}
        if [[ $? != 0 ]]; then
            echo "Error creation user ${user_name}"
            exit 1;
        fi
    else
        echo "User name (${user_name}) already exists."
    fi

    # Lock user password login
    passwd -l ${user_name}

    # Make sudoers entry if eligible
    if [[ ${sudo_users[$user_name]} == true ]]; then
        create_sudoers_file "${user_name}"
    fi

    # Create auth key file for user
    user_ssh_dir="/home/${user_name}/.ssh";
    auth_key_file="${user_ssh_dir}/authorized_keys";
    mkdir -p ${user_ssh_dir}
    chmod 700 ${user_ssh_dir}
    touch ${auth_key_file}
    chmod 600 ${auth_key_file}
    chown -R ${user_name}:${user_name} ${user_ssh_dir}

    # Copy user pub key contents to auth key file
    echo ${pub_key} > ${auth_key_file}

    echo ""
    echo "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
    echo ""
}

function create_sudoers_file(){

    local user_name=$1;

    echo "Updating sudoers file for user: ${user_name}"

    file="/etc/sudoers.d/${user_name}"
    touch ${file};
    chmod 600 ${file};

    cat > ${file} <<- EOT
# Created by custom script - $0 on $(date)

# User rules for ${user_name}
centos ALL=(ALL) NOPASSWD:ALL

# User rules for ${user_name}
centos ALL=(ALL) NOPASSWD:ALL
# EOF
EOT

    chmod 440 ${file};
}

declare -A ssh_users;

ssh_users["amanpruthi"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD5ZSUFObanow4loQiOqzj+g+7hRbuEM6CRNb0jpiiO30Av4ib1vs3Z5AY3ioY0fZz6P/X0rhEGS/IplzwDPlIvcqxaEJ7juyhX+ASR29A3OpGlDpxL7VwWdMDQuYdX6aQ/qRPthd0qKjcuq7jJF3cOdQy6EfDZxLVU7IBPR/L2SIE4ye3PdQLUmq3+dyp0pQHGM2trJkCyVM+xf/h3GtJV9Fv2TYl/KZcQgGLhbYVnL0Tr7KbcHTrC55nL8rmg+BRE6/Hg/60ScVuClRyY46KiPeaQya9mov0qwT2fQZgYJ8aAaS2fMGsTPasau35fatwTrx6e49/8BsJzcXhnPlj3 amanpruthi@Amans-MacBook-Pro.local";

ssh_users["alpesh"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDHmxLXelukaFZxEJhUfZAkZ8MiyP3EjSK98sXqeMVixHdvxG5IaF3dhR0dUChiUsdqEGHNjG0HulZY5wGv490DWKaF2WxOiD7WuMVYBuIzkr307ZXogCLbuw0ovaUbjRBUmTAd1AQLda/QFHPOUSjO9rydAbNMfiquZexVUetg7SzGeJkiG3djQEqNEOD2gd3ZPxxoHoJydbzByciuvgOpwU5mb20fuUUw0Hi2rtPGUTBs5TTcTRUFq66VWqK7laAZ/3NYhY7gqlDiBwSmFeC90kBViBz1Z5KY0dh00D6G6i8oQgy/B4b9nXK0738AA1uXzaU/1Vnwk/pXQ38mibd6lynAEtGgZttxvYcgiYGSz+0k1tigNX1j4SBi66KKx/C/FevnLuZJ2d/h5AFh592n6Cshueg9RTJSncruhLTxw+AHJ7yjSOdDKwmEZ4/sTWsbutq30M0N6TDZyc+Yxn/Md8opQYOZ8vVUx+Z6J16Jn/GJyK+ZOtdroR5jqrQUmhAWNfZ8GiwnoDZi2DwveK1mA9svm1BK5mDd/GjOpaw13RGjI1+fAC6quX5jMVUf7dM0eq8kiiIr/EJ/aGo/EpSadq7lqBCSH3/wKJc69wwe3jV5CZyjy/0U6z4OMmTPlnKXkt2XPK06+WLDV0WSi+53i2vcRdzC6SM3pMR2pr14aQ== alpeshmodi@Alpeshs-MacBook-Pro.local";

ssh_users["kedar"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDEv2g9/9bgE7YqWcKT3+0n+jkG5PG5cuIXg2YWeEn7ZM55WY2tq3Vneh0qaORDmA6tWUoYbJlxNqu0EOla50ONWK8sMDara/S3ucLkSIuLBrAxPWWpfBZW3/gokxfIaDxOHh9Qy0TU0YiwusxwoyyYMxv/QB6W4pBP8oZ7nSgDA8fGhtXUG6l1iWtIijkhCrl6kfid4QmfEDMxOtpg2lcMnf0G8AbAJmp5im/d1U8rVtmEuj0kWibhdukJANOlxxUasDSCSAipz5ezl/1E4vWwNe7U3BQAZWdxdWlWxbpRwXErEFixSw0LwDwzaMwYsudi7UGciLo8g+39JFO6EMHH kedarchandrayan@Kedars-MacBook-Pro-2.local";

ssh_users["sunil"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCvh1VwKFJMkU8y7fUWt+bQ7rT9KvXToJOzE/iUVeMMl7y76ytBy2c1/KaXKGBUgpWkzTVVmIX80JYDi+sHsGPKviTYXuUvi7u39blKmZ/cW1g8dlW1PWrB+vfvCMdgzicMOc9mL1xMK81S2mAz5Pa55Op2DKfoRa3345+/4BKkFQPDmBc6/CT8QwHBXiqGTcwUtMjqtHr8Hpzgl/dF+sTgJoV+jAht4L1lWvV/uyoeA33z4nooP6JNQeWoOTKC5eqh4Ht+9CbobhGkdUGkjJLYsvnYJO/u/zcxJdxgZOyJ+PVnpZjRwcfiZe+0KUAEz/yOTCj+Wv/pWUquYYD3H+vR sunil@fab.com";

ssh_users["bala"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDdP8h2FcJLMHK9gVLDzkUh+o5BjDSYJyphLEUSlssoeWG/WNUzSt6fH18TRZE+xUg2XqyENsNVc+HDWSiq1vkRPwNbI5E1jrFhLgiooLAfkCsm47rEgNls6m7BiAN3FfWjN1UqKPxm5gPzNiDElZcVG34vVdYhtAhuqKgHCBCDHlxuBOzV0tFZbwc9vpkh1RL8VzBuenMqv0mEltOdZTJO5TOwiKTWe/VsdSKjDgr0HcRvSbo3szhlE7CPXk5/zCsdbgSgZHwcJNkLlBd7pRBqcSFdgyUsydgJNbVspGXPzQIIMFVI8ZIz9U/9Zm4FRpW9BK7zDbcvRVSLkADJFnrsH83H6qWgRyLnJ8mxcLjgfZLRXR2GfBh7zJNBx1NgM9IkRBxBEV1ObgYrPc/jAoAwRqXpbJEV206gSHNeS3YetiGRZYxthiP12J6gou6guilE6Cm0od8ZNa5c+f3HV2BS/AXt2Db67hfUkiVscm0KAmnqZTZHF+ZVCdegng4CUsueuJkYAuVjhpkeQ7t1K/LAoD4F6GZDMTwEjC2DiE83M69qggyCR9UoJ86LkKg39COaTAjcLll9LWXHrLB3wzZ2eRwOf51dS9M7d8qH17ydYmfy8ji275jXRBeFkl5vKiPrPpjm4cMxje2nQLzjNhkUl65G9Aq9jQ6wrNN/Rw3Inw== bala@ost.com";

ssh_users["aman"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDnQpAM1BkxlPFyK6t7k7RpwHM6GxxWVqTmdIXbaf20TJVo+QpyR4p7l9SrkgdqKh7JbFH+xv/tthLHGkCCFVN31VSFVpqrEAAteUpqfPkM3isu1jHHqduNlkGSNu/DEqf/WxL92h3jF7MJy7n2wqE55WYYPXTr86BBwYnX5OgktZS3c5TgHCN3WqgmUS8f8lLySCuULkWNom1OwMOT38y3cDnjhk5J3QXcS5xGNxy62VB1fzKPxJ6YGic3FaGwl0ABjuVGWpnJssq6LkNcBgPHsuKdW5rxCwqN2eGHpfV0IaX1lcl8NPsOWuZhEF/QQj7V7FhhFf0q+kYIzgm5eABlP0aLaVw1iILf0nUelomZoCuhFhewVHYJxCHrZQWyJ3qkc8JXTZZg19C66dlbzJco08Wmd+vhdbzqENkRnhN1ybFPA6nt1cD1ZdiVETh0crEm8RV5aJ2hLOtH9kViv68YaH9z1cvRA38vA+MEJnyqIkYsRikSE+G7a1uHSL4vNqkRFtcMzMKl0r8y5sbw6AhnhGHQUxcKU3Cqu5SvAXueyokgPsom76IzLzthuFJM3yyn5aq+YIG5KiBiWfGBdpPpnmHI6AqiHEZfM1LsRGISR8ksQtDSf1xwfTO4wi+GMKDgt6xFPpYvB5mSogaJSQwoE1W5UrqdQO9qDUC8WBt0ZQ== aman@ost.com";

ssh_users["anagha"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCpdZaNULSZ8rvTWGXHAiYhg1T16H4G3KXDGrZqA5FHfavoTGzR6dstSLP2x4c+mtCHTOKUARt2ZBWrcPlPhmWaiJU2mnCwxTKaJPh4iseRjI4lohekkYbDO1GT9vFk959GbDqMWPQOXB4Ap+AQ6BBmP+PvdhSh8RTAB27bx6b6/axW6UWZoN4I49qriikS1+B/wslGwpms9287TE06XMdmkoEgXEAjg4LEynqUTG1Nbav9PgqOAoToLih5NN+d0K2Z7ss0Fy40P8B5/G1YUM7eiT3NKtQmYDW2qEdiDhKva6powCSOvTN8xA46nmY5UN1QQJF4tvK4GBjbD6FNMY6h anagha@ost.com";

ssh_users["dhananjay"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDngHPKQNZWd6p/oSSaWDYcZlv4Yt/+oBWFat56PsZ4bKFpf76WKfi0oqT0eY2yH1xqXfRCTaaUg7H/dz4bGM0DUx4G+QXw+jZ/akacLiQJ4kgx845CJMaS3MuIidc80ZIIdh0tiAGtVoLXVSKRTDVa7mbUHkCxQavpMKmd8yIyrcoO3R8+D96kQ80MARakuY1GkYy4SHrydoBhPqhplv6vOXphYPjy+FeIKWPt6vut/W7E9Ltg6Q1cDy3ZTfx23v6OWieaozgSflZAwCcMy8P+FUbOIarhFW3Iui6J2kcE8RaTNt/jevjlK9Ejen7fXB7dhhbX7heNZxmXjYJIIjHPC66lulzRXmiGMZtJj0HPrOOlVyaAleFYN8ru6PQczhoIHcEBttkd9tuYvlWRsMAZVAcHPRMPeBp0q5RwL9Kk/OfQeLdZH3OOYQl8B1DyKNGQZpQjO/iIe/MYkWhMZWoYemVPI2Q+XblAmr8nA7qCUsdKFzMrtgSpDfiOcPjQbzOuy+rC7frsYUAIFyfIO8kI8SxhIF43jLZb/Z6sBt2KOH0PQzjBw6W6LnSnxdtoNyRzogxod8pscLpWrCzcyyzYO/rHT9eyPxo85RtL2d8bkR8326vShtj6pdEOvHPIY37rWx+/CAW16VEcqjp8fywJQxVjZyrlX5VmWfSdeqrt5Q== dhananjay@ost.com";

ssh_users["somashekhar"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDP+3PP0rpst5LYhCOXGtgmnZmRn23X0HDVcqwAg5qMBNRrw433v41Z/WQUu0BbDj+lmyObpK5bycDeVv4ydTTtN8lIaoUNbrTjAGxtwerkr9YrE0LAE9MnYyPbRf7PqqQjktaIk0wjW0zqAOvcmoTns5GxaJOg3gnFU08V3xpsmfGOBLNPMhcFy1g3e4nIuh08kJpdL35QORrokjUKeNlXlyl2zmoSYUrNFbGUMlEZVgkxEZ2DJ7CVanC7mV4oB3jcmUHhbNaIwq7iq7LfpqpUEUu48pMQs2Zy0wpDk7Mr3XQiMy3Kcyc+P4N6dAwhSg+8PyPbMS6UZ6bA9bb2NJC/3d/Xv6MeaZZ3VAdYYUhHxAJyC1TDIlBIXsGGfhsnIeAjb5DSw0oXPMq3YGHlifsFes4Xl5jq7SPhRfsBu8SJkrgF2qoKN5AS6dlHKgd+GWZqTPhmBBPWsZv1pY5ICBDic0AW2qJUX3eRpjpVfTM69iMlTQDyHgNFUTO8Cydt+g6DuFgUZyFDcENUScfRkTOVP/vHlsPlDhSXHRLpEltHwfd0+m0/dNK9FPQDZpNisOiCwhh10D8JYn9qxnAXo1ut597N0XwLbnW7LWcYiV4ZGjMQHjAuNjOrtSr1xlKmgGrFifkVoJqQyHw/MHuDfaMbI2iV2WGpyUzEraRQWN+GFQ== somashekhar@ost.com";

ssh_users["pankaj"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDaWHss/kw8dslviBvcVxTsToyYtIhglnHE/cN6aoMbfz+gyDwHZ5EUOQjEgrr0SuORAFTsUqIInyRjI25WbfvAqlayPuSbKH4hkmUO8TBtv6RfXvmAzJbpaBMtOykniCXoKVH8N+ZAG2nP+umm5jlgK6aaYI9XPSTJkEpci3ATzZepYokFuScajf7UbiS7RsK5jhdqyhufWZqFmZcF4NMRfm5U4k6AIb0dnqMSeDz3YFSDJomcd1VNh5lT+HXeSmSL5qzoEbWE2O9YX4gfRTJPwnVFSh9SO7G+wUxJM5LNtzGtdABTk4nFii9WCBrDh7BA9NmxqacuIi/2SvDCVUzf pankaj@Pankajs-MacBook-Pro.local";

ssh_users["shlok"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCe7RwOxMxscv/Cpdyrshy6vfmCKBXlZCf1mZ1WRlgV2dCFPkQZvrG8mM+U67bS3xvdEFaTB5vKhCNWaOqcVPZnzgMod7HqqBYggio+FYIZJinz4MxYL+IKGy7UGWgm3x0p+xsaLBfjkAxPKmpE75F5MdhVJmNWyaQRxXiKtXIc/afh14ixPyuz/8syh74pqKeav9Bq2rIJ82GDrXb+TUg3u50ADXBjI2BRBvmAHAtmNl1Mr2q/pDISWw3a6vTEzFimR1bL6BEiRCH+nQMTfnxOcPoN39GkREHMROBF2haJGTQJ167KAZyKZpUg5vajjCRgvcAEt2F/s+N7CAUO7oXgtXISgNoITOrOU8GGRsBO005lZBKaayCcqzMAYyqjJf3eE6MD3MWCOegF9tmqoPmtiVbq8lRc/IBxvbVuGp4UNRxJ8iIcZgjF09LfHzbNlHM4+GPbJvWEuJo4CnhqQ7CQT5ZlqNvcT9tATzTMrbaCWgEAiEWOjzH2Rg8V2OBirEqhX5Wg5xE+koKnfwfdiwxfEwHlurTxxdHcrBITdEMLvbNXtiJ3Ndq8QYDEwKt0bAQtwqhkL8641JQnJNG3qEeHW4C3ra5xS1FygbqphCt02g3FATmDyz1sXE2LJ94VuzMsKuu2zbpvHU28Lu8+LbqLtYyp8ba+dqrRIg6HDoIZQQ== shlok@ost.com";


ssh_users["ben"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCuLE9eI6/Zl+XPQsZMgOvn0q8Qmv/Mxjx402RKusbN1PBcVsI3jFDmdjJn0VfwkOavHjYtyrDn7zF3FIChKHTb75ppLEbDw4QSM0vcaDgLC3XR9vNYNXlNpkomG0bbW4Bl77UH0L/W5uDNHHYsliEmkYeJNAqwteY29goAZRNPKVXRZxQzyGExpdKsDChdrd+fKgmjGcLD1en5UJsrb+2jAdPNJlltUvS+3W0U84yLy1VAlakjp/Kgii+F0PhE0VnFVmAomnh/Ym/JYvTJo0KhQyToghpjVJSrwyA7E/4TPj2I9S+8BAhkwqi+V75Tj0WjrwzRA4Gg8mH4bg5OhMoBAxBcx+NrvwuEOluWydZ1/WbnNyzMDhRR2BYS7n20da1nJso5RgiajpA22Zzqe5B+BUhoaOqOXkxO4AdgR5zebeyGW6LvA3ALFSnJzfzVqXnMEmSwWewRL6k9k0OKotGPnpPwN2hGraxVYQh3U0VgTY7RfYEJ0G90M7gIqmiDHjTCfORFNw329Ejd/6jebnzinNJD0bZcLvv0aHhgFdB/PDivMR5Y0vxJonL6pObCmsFA/qEnFDS9GDuDCoRZsGfbfId+oHnvUvCaW0TSAqBQ3tR1tXsBNA2+OArBfgQCgx6OU/mRr6wUY4mwbXn8JYkIB0T2rH1qGpgff0esKSDOEw== ben@mosaiclabs.eu";

ssh_users["ryan"]="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDqLsEVlCP/3HPJQJaRuWRC8hXu+s0el+HpEXkdEmVb6HwmfPREs0KIGgWRoeFV4eceoYOeALcJmQKVbZB0LXIYgH9IwQqxxQxZ5cQlX9GjX1h1iBpePJ0bLQBQmClw/gdjWr2MVpttIgIVpwzxCEzGEJPWx/mYgo3CLbKwiglG1+/Kc589YLnhpQi2CPk8KZ6Zv5GzQM9SYyJMBxpz3HgT8EahaQ+/O9U9ihXkrtcasJpw91YNnMog92OrSW4iK39lS8sZbkH5ntZO1F7POGzmwBVB4luIydj259B3Bos3PewDqM0M9DS6bH85krLVJ0Is3PUSdpfY0IsaZ6NqgfucO7pmAinOiTA4H2jFfkgYhj/yaSEp+pIkiXlVUmZtFvjHb2YrDFxl/xecgvcYAQFdU9Bc1KLINNUnEFDLwy5llr1JDwFx3KLZAzutQf2OXkJ6O3zR4QxMDT4hoDAK82sf9oUtEXx5LrBKP7pdgZ+3d7MCRdvIHNjSIiZfYx8eENFmKSrNhk7l4JkKizFYhupUheZ935ENRJLib6DtzY+/YhCk3LtJLDbS5vhkFGsiV8YGy6jV2ziGem/DS3rxqcwWn028+YwggCKofgNp6N26GmTIpkdNl7ytPFMtGa44YqPCOH6dRis3AZ9C/n574HTj8LCiAQbfhtXuGpiXPPDcJw== ryanbubinski@mbpro15-ryanb.local";

#echo "All keys => ${!ssh_users[@]}"

for user_name in "${final_users[@]}"; do

    pub_key=${ssh_users[$user_name]["pub_key"]};
    echo "Creating user: ${user_name}"

    create_ssh_user "${user_name}" "${pub_key}"
done
