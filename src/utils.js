const global = new Function('return this')();

function flatObject() {
    return Object.create(null);
}

function getSymbol(obj, filter, deep = true) {
    const {prototype} = Object;
    let symbol;
    do {
        symbol = Object.getOwnPropertySymbols(obj).find((symbol) => {
            return filter(symbol.toString().slice(7, -1));
        })
    } while (!symbol && (obj = Object.getPrototypeOf(obj)) && obj !== prototype && deep);
    return symbol || null;
}

const symbols= Object.create(null);

const isJoiSchema= (obj)=> {
    return !!(symbols.joi || (symbols.joi= getSymbol(obj, (name)=> name==='@hapi/joi/schema')));
};

module.exports = {
    global,
    flatObject,
    getSymbol,
    isJoiSchema
};
