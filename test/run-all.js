require('./run-if')(__filename, run);

function run() {
    require('./buffer/buffer-pool-test')();
    require('./config/system-config-test')();
    require('./config/loader/xml/xml-rule-loader-test')();
    require('./config/loader/xml/xml-schema-loader-test')();
    require('./config/loader/xml/xml-server-loader-test')();
    require('./handler/handler-test')();
    require('./util/io-helper-test')();
    require('./util/mysql-password-test')();
    require('./util/scheduler-test')();
    require('./util/string-splitter-test')();
    require('./util/string-helper-test')();
    require('./util/type-helper-test')();
    require('./util/object-helper-test')();
}
