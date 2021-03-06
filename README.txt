
== Format Filtering Server ==

=== purpose and approach ===

The Format Filtering Server (FFS) provides file format conversion
services via HTTP interface. A document is received via 
HTTP-POST and the converted document is sent back as HTTP reply.

The messaging server ActiveMQ is used as a platform to achieve
horizontal scalability. Many conversion nodes can be connected
to the system and "consume" conversion-jobs from the respective
queues. Scalability can be achieved on the HTTP side by connecting
multiple HTTP-components to the messaging server.

The current status of implementation employs LibreOffice for
converting input to the ODT format. Valid input formats are:
* plain/text,
* MS-OOXML-Documents (.docx),
* MS-Binary-Word-Documents (.doc)

=== implementation details ===

The flow of format filtering components is as follows:

http_post -> conversion -> http_reply -> cleanup 

=== http_post ===
* receives incoming http requests
* creates dedicated workspace (tmpdir)
* writes input document to filesystem

=== conversion ===
* calls LibreOffice headlessly and executes actual conversion
* input/output files are read/written from workspace directory
* implements timeout handling

=== http_reply ===
* sends output document as HTTP reply
* runs in same worker/process as http_post (different queues)

=== cleanup ===
* cleans workspace
* (disabled in current code, for development)

=== configuration ===
* specifiy path to libreoffice binary in config.js CONFIG.libreoffice_binary

=== startup ===
* $cd format-filter-server
* $./start-broker.sh
* $cd code 
* $node run.js httpd
* $node run.js conversion

== testing ==

=== command line snippets ===

curl --data-binary @/tmp/your_example.docx http://127.0.0.1:16080/ > /tmp/your_example.odt
curl --data "Hello World!" http://127.0.0.1:16080/ > /tmp/your_example.odt
