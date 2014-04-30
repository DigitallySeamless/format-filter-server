#!/bin/bash
#
# Copyright 2013, KO GmbH, Magdeburg, Germany
#

set -e

ulimit -d unlimited
ulimit -m unlimited
ulimit -s unlimited
ulimit -v unlimited

if [ -z "$FFS_BASE" ] ; then
	export FFS_BASE=$HOME/opt/ffs
fi

tcpport=61614

if netstat -nl | grep LISTEN | grep ^tcp | grep -q $tcpport
then
	echo "port $tcpport is in LISTEN state..."
else
	echo "port $tcpport is not in LISTEN state..."
	exit 1
fi

$FFS_BASE/broker/apache-activemq-5.9.0/bin/activemq stop
