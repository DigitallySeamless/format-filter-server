#!/bin/bash
#

start_broker(){
	if netstat -nl | grep LISTEN | grep ^tcp | grep -q $tcpport
	then
		echo "port $tcpport is already in LISTEN state."
	else

		$FFS_BASE/broker/apache-activemq-5.9.0/bin/activemq start | grep pidfile
		declare -i i
		i=0
		while [ $i -lt 20 ]
		do
			if netstat -nl | grep LISTEN | grep ^tcp | grep -q $tcpport
			then
				echo "activemq now listening."
				break
			fi
			sleep 1 ; echo -n .
			i=i+1
		done
		echo ""
	fi
}

stop_broker(){
	if netstat -nl | grep LISTEN | grep ^tcp | grep -q $tcpport
	then
		echo "port $tcpport is in LISTEN state..."
	else
		echo "port $tcpport is not in LISTEN state..."
		exit 1
	fi

	$FFS_BASE/broker/apache-activemq-5.9.0/bin/activemq stop | grep Stopping
}


start_job(){
	if [ -f  /tmp/ffs-${1}.pid ] && [ -d /proc/$(cat /tmp/ffs-${1}.pid) ]; then
		echo "${1} job is already running"
	else
		pushd code >/dev/null
		nohup node run.js ${1} > /dev/null 2>&1 &
		if [ $? -eq 0 ]; then
			echo $! > /tmp/ffs-${1}.pid
			echo "Started job ${1}"
		else
			echo "Failed to start ${1} job"
			exit 1
		fi
		popd >/dev/null
	fi
}

stop_job(){
	if [ -f  /tmp/ffs-${1}.pid ] && [ -d /proc/$(cat /tmp/ffs-${1}.pid) ]; then
		kill $(cat /tmp/ffs-${1}.pid)
		if [ $? -eq 0 ]; then
			rm /tmp/ffs-${1}.pid
			echo "${1} job stopped"
		else 
			echo "Failed to stop ${1} job"
			exit 1
		fi
	else 
		if [ -f  /tmp/ffs-${1}.pid ]; then
			rm /tmp/ffs-${1}.pid
		fi
		echo "${1} job is not running"
	fi
}

is_running(){
	if [ -f  /tmp/ffs-${1}.pid ] && [ -d /proc/$(cat /tmp/ffs-${1}.pid) ]; then
		echo "${1} job is running  (pid '$(cat /tmp/ffs-${1}.pid)')"
	else 
		if [ -f  /tmp/ffs-${1}.pid ]; then
			rm /tmp/ffs-${1}.pid
		fi
		echo "${1} job is not running"
	fi
}

start()
{
	echo "Starting Filter format server"
	start_broker

	start_job httpd
	start_job conversion
}


stop()
{
	echo "Stopping Filter format server"
	stop_job conversion
	stop_job httpd

	stop_broker
}

status(){
	$FFS_BASE/broker/apache-activemq-5.9.0/bin/activemq status | grep running

	is_running httpd
	is_running conversion
}

setup(){
	echo "Not implemented"
}


#set -e
if [ -z "$FFS_BASE" ] ; then
	export FFS_BASE=$HOME/opt/ffs
fi

tcpport=61614


if [ `uname` = Linux ]
then
	ulimit -m unlimited
	ulimit -s unlimited
fi
ulimit -d unlimited
ulimit -v unlimited


case "$1" in
start)
    start
    ;;
stop)
    stop
    ;;
restart)
    stop && start
    ;;
force-reload)
    stop
    start
    ;;
setup)
    setup
    ;;
status)
    status
    ;;
*)
    echo "Usage: $0 {start|stop|restart|force-reload|status|setup}"
    exit 1
esac

exit 0
