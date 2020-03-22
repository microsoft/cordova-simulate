module.exports = function(req,res,next) {
    /*
    To call an exec method from the middleware:
    nodePlugins[service][method](success callback,failure callback,args as array,nodePlugins)

    Tou can also add custom methods/data to the simulate_gap file that do not map to an exec call:
    nodePlugins[service][data or method]
    */
    console.log(nodePlugins)
    next()
}