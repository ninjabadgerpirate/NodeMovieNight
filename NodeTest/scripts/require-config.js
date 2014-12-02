// Configure loading modules from the script directory,

var requireConfig = {
    nodeRequire: require,
    baseUrl: '/scripts/App',
    paths: {
        "jquery": "../jquery-2.1.1.min",
        "underscore": '../underscore.min',
        "bootstrap": "../bootstrap.min",
        "notify": "../notify.min",
        "jquery-history" : "../jquery.history"
    }
};
requirejs.config(requireConfig);