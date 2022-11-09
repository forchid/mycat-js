# Welcome to mycat-js, the fibjs database cluster.
A branch of [MyCat-Server](https://github.com/MyCATApache/Mycat-Server) based on [Fibjs](https://github.com/fibjs/fibjs).
Try to solve the complicated NIO asynchronously programming issue in MyCat-server by using fibjs coroutine, and 
optimize the MyCat-server(the java version).

## The main features in mycat-js are:
- Very stable, fast, full-test and open source
- Table horizontal partition intra or inter data nodes
- Master-slave read/write splitting, and automatic failover in multi-master mode
- Support MySQL, PostgreSQL, H2database, HSQLDB and SQLite database backends
- Server cluster based on zookeeper, embedded and server modes
- IO/SQL parsing tasks run in coroutines, and big computation tasks in worker threads
- Easy to use and deploy
