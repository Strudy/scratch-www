var defaults = require('lodash.defaults');
var fastlyConfig = require('../../bin/lib/fastly-config-methods');
var route_json = require('../../src/routes.json');
var tap = require('tap');

var testRoutes = [
    {
        name: 'less-traveled',
        pattern: '^/?$',
        routeAlias: '/?$',
        view: 'less-traveled/less-traveled',
        title: 'Robert Frost Goes Here'
    },
    {
        name: 'more-traveled',
        pattern: '^/more?$',
        routeAlias: '/more?$',
        view: 'more-traveled/more-traveled',
        title: 'Robert Frost Does Not Go Here'
    }
];

var routes = route_json.map(function (route) {
    return defaults({}, {pattern: fastlyConfig.expressPatternToRegex(route.pattern)}, route);
});
var extraAppRoutes = [
    // Homepage with querystring.
    // TODO: Should this be added for every route?
    '/\\?',
    // View html
    '/[^\/]*\.html$'
];


tap.test('getStaticPaths', function (t) {
    var staticPaths = fastlyConfig.getStaticPaths(__dirname, '../../build/*');
    t.type(staticPaths, 'object');
    t.end();
});

tap.test('getViewPaths', function (t) {
    var viewPaths = fastlyConfig.getViewPaths(testRoutes);
    t.type(viewPaths, 'object');
    t.equal(viewPaths[0], '/?$');
    t.equal(viewPaths[1], '/more?$');
    t.end();
});

tap.test('pathsToCondition', function (t) {
    var condition = fastlyConfig.pathsToCondition(['/?$', '/more?$']);
    t.type(condition, 'string');
    t.equal(condition, 'req.url~"^(/?$|/more?$)"');
    t.end();
});

tap.test('getAppRouteCondition', function (t) {
    var condition = fastlyConfig.getAppRouteCondition('../../build/*', routes, extraAppRoutes, __dirname);
    t.type(condition, 'string');
    t.end();
});

tap.test('testSetBackend', function (t) {
    var backend = fastlyConfig.setBackend('wemust', 'goback', 'marty');
    t.equal(backend, '' +
        'if (marty) {\n' +
        '    set req.backend = wemust;\n' +
        '    set req.http.host = \"goback\";\n' +
        '}\n'
    );
    t.end();
});

tap.test('testSetForward', function (t) {
    var forward = fastlyConfig.setForwardHeaders('alwaysforward');
    t.equal(forward, '' +
        'if (alwaysforward) {\n' +
        '    if (!req.http.Fastly-FF) {\n' +
        '        if (req.http.X-Forwarded-For) {\n' +
        '            set req.http.Fastly-Temp-XFF = req.http.X-Forwarded-For ", " client.ip;\n' +
        '        } else {\n' +
        '            set req.http.Fastly-Temp-XFF = client.ip;\n' +
        '        }\n' +
        '    } else {\n' +
        '        set req.http.Fastly-Temp-XFF = req.http.X-Forwarded-For;\n' +
        '    }\n' +
        '    set req.grace = 60s;\n' +
        '    return(pass);\n' +
        '}\n'
    );
    t.end();
});

tap.test('testSetTTL', function (t) {
    var ttl = fastlyConfig.setResponseTTL('itsactuallyttyl');
    t.equal(ttl, '' +
        'if (itsactuallyttyl) {\n' +
        '    set beresp.ttl = 0s;\n' +
        '    set beresp.grace = 0s;\n' +
        '    return(pass);\n' +
        '}\n'
    );
    t.end();
});
