class Cat {

    name = '';
    age  = 0;

    init() {
        this.name = 'mycat';
        this.age = 10;
        console.log('init a cat');
    }

    meow() {
        console.log('mi\'a mi\'a ...');
    }
}

module.exports = Cat;
