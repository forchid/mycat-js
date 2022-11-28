class CommandCounter {

    initDB = 0;
    query = 0;

    stmtPrepare = 0;
    stmtSendLongData = 0;
    stmtReset = 0;
    stmtExecute = 0;
    stmtClose = 0;

    ping = 0;
    kill = 0;
    quit = 0;
    heartbeat = 0;
	other = 0;

}

module.exports = CommandCounter;
