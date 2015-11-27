module.exports = {
	"options": {
		"jshintrc": ".jshintrc"
	},
	"gruntfile": {
		"src": ["Gruntfile.js","grunt/*.js"]
	},
	"js": {
		options: {
			force: true
		},
		"src": "src/*.js"
	}
};
