#!/bin/bash
#
# Copyright 2013, KO GmbH, Magdeburg, Germany
#

set -e

if [ `uname` = Linux ]
then
	ulimit -m unlimited
	ulimit -s unlimited
fi
ulimit -d unlimited
ulimit -v unlimited

if [ -z "$FFS_BASE" ] ; then
	export FFS_BASE=$HOME/opt/ffs
fi

tcpport=61614

if netstat -nl | grep LISTEN | grep ^tcp | grep -q $tcpport
then
	echo "port $tcpport is already in LISTEN state."
	echo "terminating..."
	exit 1
fi

$FFS_BASE/broker/apache-activemq-5.9.0/bin/activemq start
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
