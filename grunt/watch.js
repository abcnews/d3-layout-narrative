module.exports = {
	"gruntfile": {
		"files": ["Gruntfile.js","grunt/*.js"],
		"tasks": ["jshint:gruntfile"],
		"interrupt": true
	},
	"js": {
		"files": "src/**/*.js",
		"tasks": ["jshint:js","smash","uglify:js","docco:js"],
		"interrupt": true
	},
	"version": {
		"files": ["package.json"],
		"tasks": "version",
		"interrupt": true
	}
};
