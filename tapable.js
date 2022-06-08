import { AsyncParallelHook, SyncHook } from 'tapable';

class List {
    getRoutes() {

    }
}

class Car {
    constructor() {
        this.hooks = {
            accelerate: new SyncHook(["newSpeed"]),
            brake: new SyncHook(),
            calculateRoutes: new AsyncParallelHook(["source", "target", "routesList"])
        };
    }
    setSpeed(newSpeed) {
        // following call returns undefined even when you returned values
        this.hooks.accelerate.call(newSpeed);
    }

    useNavigationSystemPromise(source, target) {
        const routesList = new List();
        return this.hooks.calculateRoutes.promise(source, target, routesList).then((res) => {
            // res is undefined for AsyncParallelHook
            console.log("finish tap")
            return routesList.getRoutes();
        });
    }

    useNavigationSystemAsync(source, target, callback) {
        const routesList = new List();
        this.hooks.calculateRoutes.callAsync(source, target, routesList, err => {
            if (err) return callback(err);
            callback(null, routesList.getRoutes());
        });
    }
}

// 注册
const myCar = new Car();
myCar.hooks.accelerate.tap('Test 1', () => {
    console.log('accelerate')
})
myCar.hooks.calculateRoutes.tapPromise('tap2', (source, target) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('------tapPromise', source, target);
            resolve();
        }, 0);
    })
})

// 触发
myCar.setSpeed(100)

myCar.useNavigationSystemPromise(["1", "2", "3"], 1)

myCar.hooks.accelerate.tap("LoggerPlugin", newSpeed => console.log(`Accelerating to ${newSpeed}`));

myCar.hooks.calculateRoutes.tapPromise("GoogleMapsPlugin", (source, target, routesList) => {
    // return a promise
    return google.maps.findRoute(source, target).then(route => {
        routesList.add(route);
    });
});
myCar.hooks.calculateRoutes.tapAsync("BingMapsPlugin", (source, target, routesList, callback) => {
    bing.findRoute(source, target, (err, route) => {
        if (err) return callback(err);
        routesList.add(route);
        // call the callback
        callback();
    });
});

// You can still use sync plugins
myCar.hooks.calculateRoutes.tap("CachedRoutesPlugin", (source, target, routesList) => {
    const cachedRoute = cache.get(source, target);
    if (cachedRoute)
        routesList.add(cachedRoute);
})