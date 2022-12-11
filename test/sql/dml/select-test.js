const SelectStatement = require('../../../sql/dml/select-statement');
const LimitClause = require('../../../sql/dml/limit-clause');
const SysVarExpr = require('../../../sql/expr/sys-var-expr');
const Identifier = require('../../../sql/identifier');
const MysqlParser = require('../../../sql/parser/mysql-parser');
const SqlName = require('../../../sql/sql-name');
const UserVarExpr = require('../../../sql/expr/user-var-expr');
const runIf = require('../../run-if');
const SqlError = require('../../../sql/sql-error');
const SqlContext = require('../../../sql/sql-context');

runIf(__filename, run);

function run() {
    const parser = new MysqlParser();

    describe('SelectStatement', () => {
        describe("select base", () => {
            let sql = "select ;";
            it(sql, () => {
                try {
                    parser.parse(sql);
                } catch (e) {
                    assert.ok(e instanceof SqlError);
                }
            });
        });

        describe("comment", () => {
            let sql = "/*test\r\nTest*/ select @@version_comment --test\n limit 1";
            it (sql, ((sql) => { return () => {
                let stmt = parser.parse(sql);
                let comments = stmt.comments;
                assert.equal(1, comments.length);
                let comment = comments[0];
                assert.equal('/*', comment.sign);
                assert.equal(true, comment.multi);
                assert.equal("test\r\nTest", comment.sql);
                assert.equal("/*test\r\nTest*/", comment.toString());
            }})(sql));
            
            sql = "-- test\n/*test\r\nTest*/ select @@version_comment --test\n limit 1";
            it (sql, ((sql) => { return () => {
                let stmt = parser.parse(sql);
                let comments = stmt.comments;
                assert.equal(2, comments.length);
                let comment = comments[0];
                assert.equal('--', comment.sign);
                assert.equal(false, comment.multi);
                assert.equal(" test", comment.sql);
                assert.equal("-- test", comment.toString());

                comment = comments[1];
                assert.equal('/*', comment.sign);
                assert.equal(true, comment.multi);
                assert.equal("test\r\nTest", comment.sql);
                assert.equal("/*test\r\nTest*/", comment.toString());
            }})(sql));

            sql = "-- test\n/*test\r\nTest*/ #test a\r\n select @@version_comment --test\n limit 1";
            it (sql, ((sql) => { return () => {
                let stmt = parser.parse(sql);
                let comments = stmt.comments;
                assert.equal(3, comments.length);
                let comment = comments[0];
                assert.equal('--', comment.sign);
                assert.equal(false, comment.multi);
                assert.equal(" test", comment.sql);
                assert.equal("-- test", comment.toString());

                comment = comments[1];
                assert.equal('/*', comment.sign);
                assert.equal(true, comment.multi);
                assert.equal("test\r\nTest", comment.sql);
                assert.equal("/*test\r\nTest*/", comment.toString());
                
                comment = comments[2];
                assert.equal('#', comment.sign);
                assert.equal(false, comment.multi);
                assert.equal("test a", comment.sql);
                assert.equal("#test a", comment.toString());
            }})(sql));
        });

        describe("select sys var and limit clause", () => {
            let sql = "select @@version_comment limit 1";
            let name = "version_comment";
            it(sql, sysVarBaseTest(sql, name));
            sql = "select @@version_comment limit 1;";
            it(sql, sysVarBaseTest(sql, name));
            sql = "select @@version_comment limit 1 ;";
            it(sql, sysVarBaseTest(sql, name));
            sql = "select/**/@@version_comment limit 1 ;";
            it(sql, sysVarBaseTest(sql, name));
            sql = "select @@version_comment/**/ limit 1 ;";
            it(sql, sysVarBaseTest(sql, name));
            sql = "select/**/@@version_comment /**/ limit /**/1/**/;";
            it(sql, sysVarBaseTest(sql, name, true));
            sql = "/**/select/**/@@version_comment /**/ limit /**/1/**/;";
            it(sql, sysVarBaseTest(sql, name, true, false, "/**/"));
            sql = "/**/select/**/@@`version_comment` /**/ limit /**/1/**/;";
            it(sql, sysVarBaseTest(sql, name, true, true, "/**/"));

            function sysVarBaseTest(sql, name, lmc, quoted, hdc = "") {
                return function() {
                    let stmt = parser.parse(sql);
                    assert.equal(stmt.constructor, SelectStatement);
                    assert.equal(sql, hdc + stmt.sql);

                    if (hdc) {
                        assert.equal(1, stmt.comments.length);
                        assert.equal("", stmt.comments[0].sql);
                        assert.equal(hdc, stmt.comments[0] + "");
                    }
        
                    let selExprs = stmt.selectExprs;
                    assert.equal(1, selExprs.length);
                    let vcVar = selExprs[0];
                    assert.equal(vcVar.constructor, SysVarExpr);
                    assert.equal(SysVarExpr.SCOPE_SESSION, vcVar.scope);
                    assert.equal(false, vcVar.globalVar);
                    assert.equal(true, vcVar.sessionVar);
                    if (quoted) assert.equal("@@`"+name+"`", vcVar.alias);
                    else assert.equal("@@"+name, vcVar.alias);
                    let identifier = vcVar.identifier;
                    assert.equal(identifier.constructor, Identifier);
                    assert.ok(identifier instanceof SqlName);
                    assert.equal(name, identifier.name);
                    assert.equal(name, identifier.alias);
                    assert.equal(!!quoted, identifier.quoted);
                    if (quoted) assert.equal("`", identifier.quotes);
                    else assert.equal("", identifier.quotes);
        
                    let lmClause = stmt.limitClause;
                    assert.ok(lmClause instanceof LimitClause);
                    assert.equal(0n, lmClause.offset);
                    assert.equal(1n, lmClause.rows);
                    if (lmc) assert.equal("limit /**/1", lmClause.sql);
                    else assert.equal("limit 1", lmClause.sql);
                };
            }
        });

        describe("select user var and limit clause", () => {
            let sql = "select @a limit 1";
            let name = "a";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @a limit 1;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @a limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select/**/@a limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @a limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select/**/@a /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true));
            sql = "/**/select/**/@a /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true, false, "/**/"));
            sql = "/**/select/**/@`a` /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true, true, "/**/"));
    
            sql = "select @ limit 1";
            name = "";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @ limit 1;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @ limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select/**/@ limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select @ limit 1 ;";
            it(sql, userVarBaseTest(sql, name));
            sql = "select/**/@ /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true));
            sql = "/**/select/**/@ /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true, false, "/**/"));
            sql = "/**/select/**/@`` /**/ limit /**/1/**/;";
            it(sql, userVarBaseTest(sql, name, true, true, "/**/"));
    
            function userVarBaseTest(sql, name, lmc, quoted, hdc = "") {
                return () => {
                    let stmt = parser.parse(sql);
                    assert.equal(stmt.constructor, SelectStatement);
                    assert.equal(sql, hdc + stmt.sql);

                    if (hdc) {
                        assert.equal(1, stmt.comments.length);
                        assert.equal("", stmt.comments[0].sql);
                        assert.equal(hdc, stmt.comments[0] + "");
                    }
        
                    let selExprs = stmt.selectExprs;
                    assert.equal(1, selExprs.length);
                    let userVar = selExprs[0];
                    assert.equal(userVar.constructor, UserVarExpr);
                    if (quoted) assert.equal("@`"+name+"`", userVar.alias);
                    else assert.equal("@"+name, userVar.alias);
                    
                    let sqlName = userVar.sqlName;
                    assert.equal(sqlName.constructor, SqlName);
                    assert.equal(name, sqlName.name);
                    assert.equal(name, sqlName.alias);
                    assert.equal(!!quoted, sqlName.quoted);
                    if (quoted) assert.equal("`", sqlName.quotes);
                    else assert.equal("", sqlName.quotes);
        
                    let lmClause = stmt.limitClause;
                    assert.ok(lmClause instanceof LimitClause);
                    assert.equal(0n, lmClause.offset);
                    assert.equal(1n, lmClause.rows);
                    if (lmc) assert.equal("limit /**/1", lmClause.sql);
                    else assert.equal("limit 1", lmClause.sql);
                };
            }
        });

        describe("select user var, sys var and limit clause", () => {
            let sql = "select @a, @@version_comment limit 1";
            let user = "a", sys = "version_comment";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @a, @@version_comment limit 1;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @a, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select/**/@a, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @a, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select/**/@a, @@version_comment /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true));
            sql = "/**/select/**/@a, @@version_comment /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true, false, "/**/"));
            sql = "/**/select/**/@`a`, @@`version_comment` /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true, true, "/**/"));
    
            sql = "select @, @@version_comment limit 1";
            user = "";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @, @@version_comment limit 1;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select/**/@, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select @, @@version_comment limit 1 ;";
            it(sql, varBaseTest(sql, user, sys));
            sql = "select/**/@, @@version_comment /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true));
            sql = "/**/select/**/@, @@version_comment /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true, false, "/**/"));
            sql = "/**/select/**/@``, @@`version_comment` /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, false, true, true, "/**/"));

            // Swap sequence of vars
            sql = "select @@version_comment, @a limit 1";
            user = "version_comment", sys = "a";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @a limit 1;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @a limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select/**/@@version_comment, @a limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @a limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select/**/@@version_comment, @a /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true));
            sql = "/**/select/**/@@version_comment, @a /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true, false, "/**/"));
            sql = "/**/select/**/@@`version_comment`, @`a` /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true, true, "/**/"));
    
            sql = "select @@version_comment, @ limit 1";
            sys = "";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @ limit 1;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @ limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select/**/@@version_comment, @ limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select @@version_comment, @ limit 1 ;";
            it(sql, varBaseTest(sql, user, sys, true));
            sql = "select/**/@@version_comment , @ /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true));
            sql = "/**/select/**/@@version_comment /*test*/, @ /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true, false, "/**/"));
            sql = "#\nselect/**/@@version_comment /*test*/, @ /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true, false, "#\n"));
            sql = "--\r\nselect/**/@@`version_comment`/*test*/ , @`` /**/ limit /**/1/**/;";
            it(sql, varBaseTest(sql, user, sys, true, true, true, "--\r\n"));
    
            function varBaseTest(sql, user, sys, swap = false, lmc = false, 
                    quoted = false, hdc = "") {
                return () => {
                    let stmt = parser.parse(sql);
                    assert.equal(stmt.constructor, SelectStatement);
                    assert.equal(sql, hdc + stmt.sql);

                    if (hdc) {
                        assert.equal(1, stmt.comments.length);
                        assert.equal("", stmt.comments[0].sql);
                        assert.equal(hdc.trim(), stmt.comments[0] + "");
                    }
        
                    let selExprs = stmt.selectExprs;
                    assert.equal(2, selExprs.length);

                    if (swap) { let t = user; user = sys; sys = t; }
                    let userVar = selExprs[swap? 1: 0];
                    assert.equal(userVar.constructor, UserVarExpr);
                    if (quoted) assert.equal("@`"+user+"`", userVar.alias);
                    else assert.equal("@"+user, userVar.alias);
                    
                    let sqlName = userVar.sqlName;
                    assert.equal(sqlName.constructor, SqlName);
                    assert.equal(user, sqlName.name);
                    assert.equal(user, sqlName.alias);
                    assert.equal(!!quoted, sqlName.quoted);
                    if (quoted) assert.equal("`", sqlName.quotes);
                    else assert.equal("", sqlName.quotes);

                    let vcVar = selExprs[swap? 0: 1];
                    assert.equal(vcVar.constructor, SysVarExpr);
                    assert.equal(SysVarExpr.SCOPE_SESSION, vcVar.scope);
                    assert.equal(false, vcVar.globalVar);
                    assert.equal(true, vcVar.sessionVar);
                    if (quoted) assert.equal("@@`"+sys+"`", vcVar.alias);
                    else assert.equal("@@"+sys, vcVar.alias);
                    let identifier = vcVar.identifier;
                    assert.equal(identifier.constructor, Identifier);
                    assert.ok(identifier instanceof SqlName);
                    assert.equal(sys, identifier.name);
                    assert.equal(sys, identifier.alias);
                    assert.equal(!!quoted, identifier.quoted);
                    if (quoted) assert.equal("`", identifier.quotes);
                    else assert.equal("", identifier.quotes);
        
                    let lmClause = stmt.limitClause;
                    assert.ok(lmClause instanceof LimitClause);
                    assert.equal(0n, lmClause.offset);
                    assert.equal(1n, lmClause.rows);
                    if (lmc) assert.equal("limit /**/1", lmClause.sql);
                    else assert.equal("limit 1", lmClause.sql);
                };
            }
        });

        describe("select global or session sys vars", () => {
            let sql = [
                'select @@global.autocommit',
                'select @@global .autocommit',
                'select @@global . autocommit',
                'select @@global/*test*/ . autocommit',
                'select @@global /*test*/ . /*test*/ autocommit;',
                'select @@session.autocommit',
                'select @@session .`autocommit`',
                'select @@session . `autocommit`',
                'select @@global.`autocommit`, @@session/*test*/ . `autocommit`',
                'select @@global.`autocommit` /*test*/, @@session /*test*/ . /*test*/ autocommit;'
            ];
            it (sql[0], () => {
                let stmt = parser.parse(sql[0]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global.autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });

            it (sql[1], () => {
                let stmt = parser.parse(sql[1]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global .autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });

            it (sql[2], () => {
                let stmt = parser.parse(sql[2]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global . autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });
            
            it (sql[3], () => {
                let stmt = parser.parse(sql[3]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global/*test*/ . autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });

            it (sql[4], () => {
                let stmt = parser.parse(sql[4]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global /*test*/ . /*test*/ autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });

            it (sql[5], () => {
                let stmt = parser.parse(sql[5]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.sessionVar);
                assert.equal(SysVarExpr.SCOPE_SESSION, expr.scope);
                assert.equal("@@session.autocommit", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });

            it (sql[6], () => {
                let stmt = parser.parse(sql[6]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.sessionVar);
                assert.equal(SysVarExpr.SCOPE_SESSION, expr.scope);
                assert.equal("@@session .`autocommit`", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(true, id.quoted);
            });

            it (sql[7], () => {
                let stmt = parser.parse(sql[7]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.sessionVar);
                assert.equal(SysVarExpr.SCOPE_SESSION, expr.scope);
                assert.equal("@@session . `autocommit`", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(true, id.quoted);
            });

            it (sql[8], () => {
                let stmt = parser.parse(sql[8]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global.`autocommit`", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(true, id.quoted);
                
                expr = stmt.selectExprs[1];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.sessionVar);
                assert.equal(SysVarExpr.SCOPE_SESSION, expr.scope);
                assert.equal("@@session/*test*/ . `autocommit`", expr.alias);
                id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(true, id.quoted);
            });

            it (sql[9], () => {
                let stmt = parser.parse(sql[9]);
                let expr = stmt.selectExprs[0];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.globalVar);
                assert.equal(SysVarExpr.SCOPE_GLOBAL, expr.scope);
                assert.equal("@@global.`autocommit`", expr.alias);
                let id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(true, id.quoted);
                
                expr = stmt.selectExprs[1];
                assert.ok(expr instanceof SysVarExpr);
                assert.ok(expr.sessionVar);
                assert.equal(SysVarExpr.SCOPE_SESSION, expr.scope);
                assert.equal("@@session /*test*/ . /*test*/ autocommit", expr.alias);
                id = expr.identifier;
                assert.equal("autocommit", id.name);
                assert.equal(false, id.quoted);
            });
        });

        describe("select replace or rewrite", () => {
            let parser = new MysqlParser();

            it("select @a, @@version_comment limit 1, 10", () => {
                let ctx = Object.create(new SqlContext());
                ctx.visitSysVar = (sysVar) => {
                    if (sysVar.name == "version_comment") {
                        sysVar.value = "MyCat Server(Open cloudDB)";
                    }
                    return sysVar;
                };
                let stmt = parser.parse("select @a, @@version_comment limit 1, 10", ctx);
                assert.equal("select @a, 'MyCat Server(Open cloudDB)' as `@@version_comment` limit 1, 10", stmt.sql);
            });

            it("select @a, @@`version_comment` limit 1, 10", () => {
                let ctx = Object.create(new SqlContext());
                ctx.visitSysVar = (sysVar) => {
                    if (sysVar.name == "version_comment") {
                        sysVar.value = "MyCat Server(Open cloudDB)";
                    }
                    return sysVar;
                };
                let stmt = parser.parse("select @a, @@`version_comment` limit 1, 10", ctx);
                assert.equal("select @a, 'MyCat Server(Open cloudDB)' as `@@``version_comment``` limit 1, 10", stmt.sql);
            });

            it("select @a, @@global.`version_comment` limit 1, 10", () => {
                let ctx = Object.create(new SqlContext());
                ctx.visitSysVar = (sysVar) => {
                    if (sysVar.name == "version_comment") {
                        sysVar.value = "MyCat Server(Open cloudDB)";
                    }
                    return sysVar;
                };
                let stmt = parser.parse("select @a, @@global.`version_comment` limit 1, 10", ctx);
                assert.equal("select @a, 'MyCat Server(Open cloudDB)' as `@@global.``version_comment``` limit 1, 10", stmt.sql);
            });

            it("/*test*/select @a, @@global.`version_comment` , @b, @d limit 1, 10;", () => {
                let ctx = Object.create(new SqlContext());
                ctx.visitSysVar = (sysVar) => {
                    if (sysVar.name == "version_comment") {
                        sysVar.value = "MyCat's Server(Open cloudDB)";
                    }
                    return sysVar;
                };
                ctx.visitUserVar = (userVar) => {
                    let name = userVar.name;
                    if (name == "b") {
                        userVar.value = 100;
                    } else if (name == "d") {
                        userVar.value = new Date(2022, 11, 7, 15, 6, 20, 99);
                    }
                    return userVar;
                };
                let stmt = parser.parse("/*test*/select @a, @@global.`version_comment` , @b, @d limit 1, 10;", ctx);
                assert.equal("select @a, 'MyCat''s Server(Open cloudDB)' as `@@global.``version_comment``` , 100 as `@b`, '2022-12-07 15:06:20.099' as `@d` limit 1, 10;", stmt.sql);
            });
        });

        describe("select multi-statements", () => {
            let sql = "select @a; select @b, @@c ; select @d LIMIT 1 offset 0";
            it (sql, () => {
                let stmts = parser.parse(sql);
                assert.equal(stmts.constructor, Array);
                assert.equal(3, stmts.length);

                let stmt = stmts[0];
                assert.equal("select @a;", stmt.sql);
                let expr = stmt.selectExprs[0];
                assert.equal("a", expr.name);
                let limit = stmt.limitClause;
                assert.equal(null, limit);

                stmt = stmts[1];
                assert.equal("select @b, @@c ;", stmt.sql);
                expr = stmt.selectExprs[0];
                assert.equal("b", expr.name);
                assert.ok(expr instanceof UserVarExpr);
                expr = stmt.selectExprs[1];
                assert.equal("c", expr.name);
                assert.ok(expr instanceof SysVarExpr);
                limit = stmt.limitClause;
                assert.equal(null, limit);

                stmt = stmts[2];
                assert.equal("select @d LIMIT 1 offset 0", stmt.sql);
                expr = stmt.selectExprs[0];
                assert.equal("d", expr.name);
                limit = stmt.limitClause;
                assert.equal(1, limit.rows);
                assert.equal(0, limit.offset);
            });
        });

        describe("select perf", () => {
            it ("select sys, user vars, limit and comment", () => {
                let parser = new MysqlParser();
                for (let i = 0; i < 1000/*00*/; ++i) {
                    for (let s of ["#\r\nselect/**/@@`version_comment`/*test*/ , @`` /**/ limit /**/1/**/;"]) {
                        let stmt = parser.parse(s);
                        assert.ok(stmt instanceof SelectStatement);
                    }
                }
            });
        });
    });
}

module.exports = run;
