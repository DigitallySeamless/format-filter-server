var CONFIG = {};

CONFIG.broker_args = {
	port: 61613,
	host: 'localhost',
	debug: false
};

CONFIG.libreoffice_binary = "/usr/bin/soffice";
CONFIG.parallelism = 1;
CONFIG.tmpDirBase = '/tmp/ffsdir-';
CONFIG.staticDummyResult = '../resources/dummy.odt';
CONFIG.alwaysDummyOutput = false;
CONFIG.conversionTimeout = 10000;

module.exports = CONFIG;

