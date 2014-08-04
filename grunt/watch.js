module.exports = {
	"gruntfile": {
		"files": ["Gruntfile.js","grunt/*.js"],
		"tasks": ["jshint:gruntfile"],
		"interrupt": true
	},
	"js": {
		"files": "narrative.js",
		"tasks": ["jshint:js","uglify:js","docco:js"],
		"interrupt": true
	},
	"version": {
		"files": ["package.json"],
		"tasks": "version",
		"interrupt": true
	}
};
