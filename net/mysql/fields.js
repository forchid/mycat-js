class Fields {

    static type(value) {
        if (value === null || value === undefined) {
            return Fields.FIELD_TYPE_VAR_STRING;
        }

        let c = value.constructor;
        switch (c) {
            case BigInt:
                return Fields.FIELD_TYPE_LONGLONG;
            case Number:
                let v = Math.floor(value);
                if (v === value) {
                    if (v > 0xffffffff) {
                        return Fields.FIELD_TYPE_LONGLONG;
                    } else {
                        return Fields.FIELD_TYPE_LONG;
                    }
                } else {
                    return Fields.FIELD_TYPE_DOUBLE;
                }
            case Date:
                return Fields.FIELD_TYPE_TIMESTAMP;
            default:
                return Fields.FIELD_TYPE_VAR_STRING;
        }
    }

    static get FIELD_TYPE_LONG() { return 3; }

    static get FIELD_TYPE_DOUBLE() { return 5; }

    static get FIELD_TYPE_TIMESTAMP() { return 7; }

    static get FIELD_TYPE_LONGLONG() { return 8; }

    static get FIELD_TYPE_DATE() { return 10; }

    static get FIELD_TYPE_TIME() { return 11; }

    static get FIELD_TYPE_VARCHAR() { return 15; }

    static get FIELD_TYPE_VAR_STRING() { return 253; }

}

module.exports = Fields;
