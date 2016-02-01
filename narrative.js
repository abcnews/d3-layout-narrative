// Narrative Charts
// ================
//
// `d3.layout.narrative()`
//
// The constructor takes no arguements. All relevant object properties should
// be set using the setter functions.
d3.layout.narrative = function(){

// Import jLouvian
// ---------------
// [jLouvian](https://github.com/upphiminn/jLouvain) is a open source (MIT)
// javascript implementation of the Louvian method of
// [community detection](https://www.wikiwand.com/en/Louvain_Modularity).
// Graph clustering algorithm
// --------------------------
//
// Author: Corneliu S. (github.com/upphiminn)
//
// Lightly cleaned up and documented by Simon Elvery.
//
// This is a javascript implementation of the Louvain
// community detection algorithm (http://arxiv.org/abs/0803.0476)
// Based on https://bitbucket.org/taynaud/python-louvain/overview
//
// TODO: Make this into an ES6 Module.

function jLouvain() {

	// Constants
	var __PASS_MAX = -1;
	var __MIN 	 = 0.0000001;

	// Local vars
	var original_graph_nodes;
	var original_graph_edges;
	var original_graph = {};
	var partition_init;

	// Helpers
	function make_set(array){
		var set = {};
		array.forEach(function(d){
			set[d] = true;
		});
		return Object.keys(set);
	}

	function obj_values(obj){
		 var vals = [];
		 for( var key in obj ) {
			 if ( obj.hasOwnProperty(key) ) {
				 vals.push(obj[key]);
			 }
		 }
		 return vals;
	}

	function get_degree_for_node(graph, node){
		var neighbours = graph._assoc_mat[node] ? Object.keys(graph._assoc_mat[node]) : [];
		var weight = 0;
		neighbours.forEach(function(neighbour){
			var value = graph._assoc_mat[node][neighbour] || 1;
			if(node === neighbour) {
				value *= 2;
			}
			weight += value;
		});
		return weight;
	}

	function get_neighbours_of_node(graph, node){
		if(typeof graph._assoc_mat[node] === 'undefined') {
			return [];
		}

		var neighbours = Object.keys(graph._assoc_mat[node]);
		return neighbours;
	}


	function get_edge_weight(graph, node1, node2){
		return graph._assoc_mat[node1] ? graph._assoc_mat[node1][node2] : undefined;
	}

	function get_graph_size(graph){
		var size = 0;
		graph.edges.forEach(function(edge){
			size += edge.weight;
		});
		return size;
	}

	function add_edge_to_graph(graph, edge){
		update_assoc_mat(graph, edge);

		var edge_index = graph.edges.map(function(d){
			return d.source+'_'+d.target;
		}).indexOf(edge.source+'_'+edge.target);

		if(edge_index !== -1) {
			graph.edges[edge_index].weight = edge.weight;
		} else {
			graph.edges.push(edge);
		}
	}

	function make_assoc_mat(edge_list){
		var mat = {};
		edge_list.forEach(function(edge){
			mat[edge.source] = mat[edge.source] || {};
			mat[edge.source][edge.target] = edge.weight;
			mat[edge.target] = mat[edge.target] || {};
			mat[edge.target][edge.source] = edge.weight;
		});

		return mat;
	}

	function update_assoc_mat(graph, edge){
		graph._assoc_mat[edge.source] = graph._assoc_mat[edge.source] || {};
		graph._assoc_mat[edge.source][edge.target] = edge.weight;
		graph._assoc_mat[edge.target] = graph._assoc_mat[edge.target] || {};
		graph._assoc_mat[edge.target][edge.source] = edge.weight;
	}

	function clone(obj){
		if(obj === null || typeof(obj) !== 'object') {
			return obj;
		}

		var temp = obj.constructor();

		for(var key in obj) {
			temp[key] = clone(obj[key]);
		}
		return temp;
	}

	//Core-Algorithm Related
	function init_status(graph, status, part){
		status['nodes_to_com'] = {};
		status['total_weight'] = 0;
		status['internals'] = {};
		status['degrees'] = {};
		status['gdegrees'] = {};
		status['loops'] = {};
		status['total_weight'] = get_graph_size(graph);

		if (typeof part === 'undefined'){
			graph.nodes.forEach(function(node,i){
				status.nodes_to_com[node] = i;
				var deg = get_degree_for_node(graph, node);
				if (deg < 0) {
					throw 'Bad graph type, use positive weights!';
				}
				status.degrees[i] = deg;
				status.gdegrees[node] = deg;
				status.loops[node] = get_edge_weight(graph, node, node) || 0;
				status.internals[i] = status.loops[node];
			});
		} else {
			graph.nodes.forEach(function(node){
				var com = part[node];
				status.nodes_to_com[node] = com;
				var deg = get_degree_for_node(graph, node);
				status.degrees[com] = (status.degrees[com] || 0) + deg;
				status.gdegrees[node] = deg;
				var inc = 0.0;

				var neighbours  = get_neighbours_of_node(graph, node);
				neighbours.forEach(function(neighbour){
					var weight = graph._assoc_mat[node][neighbour];
					if (weight <= 0) {
						throw "Bad graph type, use positive weights";
					}

					if (part[neighbour] === com) {
						if (neighbour === node) {
							inc += weight;
						} else {
							inc += weight/2.0;
						}
					}
				});
				status.internals[com] = (status.internals[com] || 0) + inc;
			});
		}
	}

	function __modularity(status){
		var links = status.total_weight;
		var result = 0.0;
		var communities = make_set(obj_values(status.nodes_to_com));

		communities.forEach(function(com){
			var in_degree = status.internals[com] || 0 ;
			var degree = status.degrees[com] || 0 ;
			if (links > 0) {
				result = result + in_degree / links - Math.pow((degree / (2.0*links)), 2);
			}
		});
		return result;
	}

	function __neighcom(node, graph, status){
		// compute the communities in the neighb. of the node, with the graph given by
		// node_to_com

		var weights = {};
		var neighboorhood = get_neighbours_of_node(graph, node);//make iterable;

		neighboorhood.forEach(function(neighbour){
			if (neighbour !== node) {
				var weight = graph._assoc_mat[node][neighbour] || 1;
				var neighbourcom = status.nodes_to_com[neighbour];
				weights[neighbourcom] = (weights[neighbourcom] || 0) + weight;
			}
		});

		return weights;
	}

	function __insert(node, com, weight, status){
		//insert node into com and modify status
		status.nodes_to_com[node] = +com;
		status.degrees[com] = (status.degrees[com] || 0) + (status.gdegrees[node]||0);
		status.internals[com] = (status.internals[com] || 0) + weight + (status.loops[node]||0);
	}

	function __remove(node, com, weight, status){
		//remove node from com and modify status
		status.degrees[com] = ((status.degrees[com] || 0) - (status.gdegrees[node] || 0));
		status.internals[com] = ((status.internals[com] || 0) - weight -(status.loops[node] ||0));
		status.nodes_to_com[node] = -1;
	}

	function __renumber(dict){
		var count = 0;
		var ret = clone(dict); //deep copy :)
		var new_values = {};
		var dict_keys = Object.keys(dict);
		dict_keys.forEach(function(key){
			var value = dict[key];
			var new_value = (typeof new_values[value] === 'undefined') ? -1 : new_values[value];
			if (new_value === -1) {
				new_values[value] = count;
				new_value = count;
				count = count + 1;
			}
			ret[key] = new_value;
		});
		return ret;
	}

	function __one_level(graph, status){
		//Compute one level of the Communities Dendogram.
		var modif = true,
			nb_pass_done = 0,
			cur_mod = __modularity(status),
			new_mod = cur_mod;

		while (modif && nb_pass_done !== __PASS_MAX) {
			cur_mod = new_mod;
			modif = false;
			nb_pass_done += 1;

			graph.nodes.forEach(eachNode);
			new_mod = __modularity(status);
			if(new_mod - cur_mod < __MIN) {
				break;
			}
		}

		function eachNode(node) {
			var com_node = status.nodes_to_com[node];
			var degc_totw = (status.gdegrees[node] || 0) / (status.total_weight * 2.0);
			var neigh_communities = __neighcom(node, graph, status);
			__remove(node, com_node, (neigh_communities[com_node] || 0.0), status);
			var best_com = com_node;
			var best_increase = 0;
			var neigh_communities_entries = Object.keys(neigh_communities);//make iterable;

			neigh_communities_entries.forEach(function(com){
				var incr = neigh_communities[com] - (status.degrees[com] || 0.0) * degc_totw;
				if (incr > best_increase){
					best_increase = incr;
					best_com = com;
				}
			});

			__insert(node, best_com, neigh_communities[best_com] || 0, status);

			if(best_com !== com_node) {
				modif = true;
			}
		}
	}

	function induced_graph(partition, graph){
		var ret = {nodes:[], edges:[], _assoc_mat: {}};
		var w_prec, weight;
		//add nodes from partition values
		var partition_values = obj_values(partition);
		ret.nodes = ret.nodes.concat(make_set(partition_values)); //make set
		graph.edges.forEach(function(edge){
			weight = edge.weight || 1;
			var com1 = partition[edge.source];
			var com2 = partition[edge.target];
			w_prec = (get_edge_weight(ret, com1, com2) || 0);
			var new_weight = (w_prec + weight);
			add_edge_to_graph(ret, {'source': com1, 'target': com2, 'weight': new_weight});
		});
		return ret;
	}

	function partition_at_level(dendogram, level){
		var partition = clone(dendogram[0]);
		for(var i = 1; i < level + 1; i++ ) {
			Object.keys(partition).forEach(eachKey);
		}
		return partition;

		function eachKey(key){
			var node = key;
			var com  = partition[key];
			partition[node] = dendogram[i][com];
		}
	}


	function generate_dendogram(graph, part_init){

		if (graph.edges.length === 0) {
			var part = {};
			graph.nodes.forEach(function(node){
				part[node] = node;
			});
			return part;
		}
		var status = {};

		init_status(original_graph, status, part_init);
		var mod = __modularity(status);
		var status_list = [];
		__one_level(original_graph, status);
		var new_mod = __modularity(status);
		var partition = __renumber(status.nodes_to_com);
		status_list.push(partition);
		mod = new_mod;
		var current_graph = induced_graph(partition, original_graph);
		init_status(current_graph, status);

		while (true){
			__one_level(current_graph, status);
			new_mod = __modularity(status);
			if(new_mod - mod < __MIN) {
				break;
			}

			partition = __renumber(status.nodes_to_com);
			status_list.push(partition);

			mod = new_mod;
			current_graph = induced_graph(partition, current_graph);
			init_status(current_graph, status);
		}

		return status_list;
	}

	var core = function(){
		var dendogram = generate_dendogram(original_graph, partition_init);
		return partition_at_level(dendogram, dendogram.length - 1);
	};

	core.nodes = function(nds){
		if(arguments.length > 0){
			original_graph_nodes = nds;
		}
		return core;
	};

	core.edges = function(edgs){
		if (typeof original_graph_nodes === 'undefined') {
			throw 'Please provide the graph nodes first!';
		}

		if (arguments.length > 0) {
			original_graph_edges = edgs;
			var assoc_mat = make_assoc_mat(edgs);
			original_graph = { 'nodes': original_graph_nodes,
							   'edges': original_graph_edges,
							   '_assoc_mat': assoc_mat };
		}
		return core;
	};

	core.partition_init = function(prttn){
		if(arguments.length > 0){
			partition_init = prttn;
		}
		return core;
	};

	return core;
}

// Define all the variables.
var narrative,
	scenes,	characters, introductions, links,
	size, orientation, pathSpace, scale,
	labelSize, labelPosition, groupMargin, scenePadding,
	groups;

// Set some defaults.
size = [1,1];
scale = 1;
pathSpace = 10;
labelSize = [100,15];
labelPosition = 'right';
scenePadding = [0,0,0,0];
groupMargin = 0;
orientation = 'horizontal';

// Public functions (the API)
// ==========================
// The narrative object which is returned and exposes the public API.
narrative = {};

// Scenes
// ------
//
// `narrative.scenes([array])`
//
// Set or get the scenes array. If an array is passed, sets the narrative's
// scenes to the passed array, else returns the scenes array.
narrative.scenes = function(_) {
	if (!arguments.length) {
		return scenes;
	}
	scenes = _;
	return narrative;
};

// Characters
// ----------
//
// `narrative.characters([array])`
//
// Set or get the characters array. If an array is passed, sets the
// narrative's characters array, otherwise returns the characters array.
narrative.characters = function(_) {
	if (!arguments.length) {
		return characters;
	}
	characters = _;
	return narrative;
};

// Size
// ----
//
// `narrative.size([array])`
//
// Set or get the size of the layout. A two element array `[width,height]`. Note
// that this is considered a guide for the layout algorithm.
// See `narrative.extent()` for getting the final size of the layout.
narrative.size = function(_) {
	if (!arguments.length) {
		return size;
	}
	size = _;
	return narrative;
};

// Orientation
// -----------
//
// `narrative.orientation([orientation])`
//
// *Incomplete:* Only the default (horizontal) option is fully supported.
//
// Set the orientation to use for the layout. The choices are `'horizontal'` (default)
// or `'vertical'`. In a horizontal orientation 'time' runs from left to right
// and in vertical, top to bottom.
narrative.orientation = function(_) {
	if (!arguments.length) {
		return orientation;
	}
	orientation = _;
	return narrative;
};

// Extent
// ------
//
// `narrative.extent()`
//
// Get the extent of the space used by the layout. This is useful for adjusting
// the size of the containing element after the layout has been calculated.
//
// Despite being able to set the size (see `narrative.size()`), it's not always
// possible to contain the chart in the available space. This function will
// provide a `[width,height]` array of the layout extent *after* the layout has
// run.
narrative.extent = function(){
	return scenes.concat(introductions).reduce(function(max, d){
		var bounds = d.bounds();
		if (bounds[1][1] > max[1]) {
			max[1] = bounds[1][1];
		}
		if (bounds[1][0] > max[0]) {
			max[0] = bounds[1][0];
		}
		return max;
	}, [0,0]);
};

// Path space
// ----------
//
// `narrative.pathSpace([number])`
//
// Set or get the space available to each character's path.
narrative.pathSpace = function(_) {
	if (!arguments.length) {
		return pathSpace;
	}
	pathSpace = _;
	return narrative;
};

// Group margin
// ------------
//
// `narrative.groupMargin([margin])`
//
// The characters are divided into groups based on the strength of their relationships
// (i.e. co-appearances in scenes). These groups are then arranged in a way designed
// to reduce congestion in the centre of the chart. To give thelayout a more open
// feel, a group margin can be set.
narrative.groupMargin = function(_) {
	if (!arguments.length) {
		return groupMargin;
	}
	groupMargin = _;
	return narrative;
};

// Scene padding
// -------------
//
// `narrative.scenePadding([array])`
//
// By default scenes have a height equal to `character height × character count`
// and a width of zero. You may want to allow for extra space around scenes so
// collisions with labels can be avoided. To set a padding pass an array of values
// matching the CSS padding argument order `[top, right, bottom, left]`.
narrative.scenePadding = function(_) {
	if (!arguments.length) {
		return scenePadding;
	}
	scenePadding = _;
	return narrative;
};

// Label size
// ----------
//
// `narrative.labelSize([array])`
//
// Set or get the default space to allocate in the layout for character labels.
// Must be a two element array `[width,height]`. Label sizes specific to each
// character which will override these defaults can be set by defining `height`
// and `width` properties on individual character objects.
narrative.labelSize = function(_) {
	if (!arguments.length) {
		return labelSize;
	}
	labelSize = _;
	return narrative;
};

// Label position
// --------------
//
// `narrative.labelPosition([string])`
//
// Set or get the default label position for character labels. Valid options are
// `above`, `below`, `left`, `right`. This can be overridden by setting defining
// a `labelPosition` property on individual character objects.
narrative.labelPosition = function(_) {
	if (!arguments.length) {
		return labelPosition;
	}
	labelPosition = _;
	return narrative;
};

// Links
// -----
//
// `narrative.links()`
//
// Returns an array of links. Each link is consecutive appearances for a given
// character. Links are an object with `source` and `target` properties which
// are both appearance objects.
narrative.links = function() {
	return links;
};

// Link
// ----
//
// `narrative.link()`
//
// Returns a function for generating path strings for links.
// Links are objects with `source` and `target` properties which each contain
// an `x` and `y` property. In the context of the narrative chart these are
// either character apperance or introduction nodes.
narrative.link = function() {
	var curvature = 0.5;

	// ### Link path
	//
	// `link([object])`
	//
	// This function should be used to set the `path` attribute of links when
	// displaying the narrative chart. It accepts an object and returns a path
	// string linking the two.
	function link(d) {
		var x0,x1,y0,y1,cx0,cy0,cx1,cy1,ci;

		// Set path end positions.
		x0 = (d.source.scene) ? d.source.scene.x + d.source.x : d.source.x;
		y0 = (d.source.scene) ? d.source.scene.y + d.source.y : d.source.y;
		x1 = (d.target.scene) ? d.target.scene.x + d.target.x : d.target.x;
		y1 = (d.target.scene) ? d.target.scene.y + d.target.y : d.target.y;

		// Set control points.
		if (orientation === 'vertical') {
			ci = d3.interpolateNumber(y0, y1);
			cx0 = x0;
			cy0 = ci(curvature);
			cx1 = x1;
			cy1 = ci(1-curvature);
		} else {
			ci = d3.interpolateNumber(x0, x1);
			cx0 = ci(curvature);
			cy0 = y0;
			cx1 = ci(1-curvature);
			cy1 = y1;
		}

		return "M" + x0 + "," + y0 +
			"C" + cx0 + "," + cy0 +
			" " + cx1 + "," + cy1 +
			" " + x1 + "," + y1;
	}

	// ### Curvature
	//
	// `link.curvature([number])`
	//
	// Set or get the curvature which should be used to generate links. Should be
	// in the range zero to one.
	link.curvature = function(_) {
		if (!arguments.length) {
			return curvature;
		}
		curvature = _;
		return link;
	};

	return link;
};

// Introductions
// -------------
//
// `narrative.introductions()`
//
// Get an array of character introductions for plotting on the graph. Introductions
// are nodes (usually with labels) displayed before the first scene in which each
// character appears.
narrative.introductions = function() {
	return introductions;
};

// Layout
// ------
//
// `narrative.layout()`
//
// Compute the narrative layout. This should be called after all options and
// data have been set and before attempting to use the layout's output for
// display purposes.
narrative.layout = function() {
	computeSceneCharacters();
	computeCharacterGroups();
	setSceneGroups();
	computeGroupAppearances();
	sortGroups();
	computeGroupPositions();
	computeCharacterGroupPositions();
	sortGroupAppearances();
	computeSceneTiming();
	computeAppearancePositions();
	computeScenePositions();
	createIntroductionNodes();
	computeIntroductionPositions();
	createLinks();
	return narrative;
};

// Return the public API.
return narrative;

// Private functions
// =================

// Initial data wrangling
// ----------------------
//
// Populate the scenes with characters from the characters array.
// This method also cleanses the data to exclude characters which appear only once
// and scenes with fewer than two characters.
function computeSceneCharacters() {

	var appearances, finished;

	// Create a map of scenes to characters (i.e. appearances).
	appearances = [];
	scenes.forEach(function(scene){
		scene.characters.forEach(function(character) {

			// If the character isn't an object assume it's an index from the characters array.
			character = (typeof character === 'object') ? character : characters[character];

			// Note forced character positions and sizes.
			character._x = character.x || false;
			character._y = character.y || false;
			character._width = character.width || false;
			character._height = character.height || false;

			// Add this appearance to the map.
			appearances.push({character: character, scene: scene});

			// Setup some properties on the character and scene that we'll need later.
			scene.appearances = [];
			scene.bounds = getSceneBounds;
			character.appearances = [];
		});

		// note forces scene positions.
		scene._x = scene.x || false;
		scene._y = scene.y || false;
	});

	// Recursively filter appearances so we ultimately only include characters
	// with more than a single appearance and scenes with more than a single
	// character.
	while(!finished) {
		finished = true;
		appearances = appearances.filter(filterAppearances);
	}

	// Filter appearances.
	//
	// TODO: this could probably be more efficient (maybe with an index https://gist.github.com/AshKyd/adc7fb024787bd543fc5)
	function filterAppearances(appearance){
		var counts, keep;

		counts = appearances.reduce(function(c, a){

			if (appearance.character === a.character) {
				c[0]++;
			}

			if (appearance.scene === a.scene) {
				c[1]++;
			}

			return c;

		}, [0,0]);

		keep = counts[0] >= 1 && counts[1] >= 1;
		finished = finished && keep;

		return keep;
	}

	// Re-construct `characters` and `scenes` arrays with filtered appearances.
	characters = [];
	scenes = [];
	appearances.forEach(function(appearance){

		// Cross reference scenes and characters based on appearances.
		appearance.scene.appearances.push(appearance);
		appearance.character.appearances.push(appearance);

		if (characters.indexOf(appearance.character) === -1) {
			characters.push(appearance.character);
		}

		if (scenes.indexOf(appearance.scene) === -1) {
			scenes.push(appearance.scene);
		}
	});
}

// Character clustering
// --------------------
//
// Cluster characters based on their co-occurence in scenes
function computeCharacterGroups() {
	var nodes, edges, clusters, partitioner, groupsMap, initGroups;

	// An array of character indexes.
	nodes = characters.map(function(d,i){return i;});

	initGroups = characters.reduce(function(g,d,i){
		if (d.initialgroup) {
			g[i] = +d.initialgroup;
		}
		return g;
	},{});

	// Calculate the edges based on a character's involvement in scenes.
	edges = [];
	scenes.forEach(function(scene){
		edges = edges.concat(sceneEdges(scene.appearances));
	});

	// Consolidate edges into a unique set of relationships with a weighting
	// based on how often they appear together.
	edges = edges.reduce(function(result, edge) {
		var resultEdge;

		resultEdge = result.filter(function(resultEdge){
			return (resultEdge.target === edge[0] || resultEdge.target === edge[1]) &&
				(resultEdge.source === edge[0] || resultEdge.source === edge[1]);

		})[0] || {source: edge[0], target: edge[1], weight: 0};

		resultEdge.weight++;

		if (resultEdge.weight === 1) {
			result.push(resultEdge);
		}

		return result;
	}, []);

	// Generate the groups.
	partitioner = jLouvain().nodes(nodes).edges(edges);

	if (initGroups) {
		partitioner.partition_init(initGroups);
	}
	clusters = partitioner();

	// Put all characters in groups with bi-directional reference.
	groups = [];
	groupsMap = {};
	characters.forEach(function(character, i){
		var groupId, group;
		groupId = clusters[i];
		group = groupsMap[groupId];
		if (!group) {
			group = {id: groupId, characters: []};
			groups.push(group);
			groupsMap[groupId] = group;
		}
		group.characters.push(character);
		character.group = group;
	});

	// Creates a single link between each pair of characters in a scene.
	function sceneEdges(list) {
		var i, j, matrix;
		matrix = [];
		for (i=list.length;i--;){
			for (j=i;j--;){
				matrix.push([characters.indexOf(list[i].character),characters.indexOf(list[j].character)]);
			}
		}
		return matrix;
	}
}

// Group scenes
// ------------
//
// Each scene is assigned to a group based on the median character group for
// characters appearing in that scene.
// *Note:* "median" here is a mistake, it should be mode.
function setSceneGroups() {
	scenes.forEach(function(scene){
		var groupCounts, groupCountsMap, medianGroup;

		groupCounts = [];
		groupCountsMap = {};
		scene.appearances.forEach(function(appearance){
			var count, index;

			index = groups.indexOf(appearance.character.group);
			count = groupCountsMap[index];

			if (!count) {
				count = {groupIndex: index, count: 0};
				groupCountsMap[index] = count;
				groupCounts.push(count);
			}
			count.count++;
		});

		groupCounts.sort(function(a,b){
			return a.count-b.count;
		});

		medianGroup = groups[groupCounts.pop().groupIndex];
		// While we're here record how many scenes this group is the modal group for.
		medianGroup.medianCount = medianGroup.medianCount || 0;
		medianGroup.medianCount++;
		scene.group = medianGroup;
	});
}

// Group appearances
// -----------------
//
// Assign unique set of characters to each group based on appearances in
// scenes belonging to that group.
function computeGroupAppearances() {
	scenes.forEach(function(scene){
		var characters;
		characters = scene.appearances.map(function(a){
			return a.character;
		});
		scene.group.appearances = scene.group.appearances || [];
		scene.group.appearances = scene.group.appearances.concat(characters.filter(function(character){
			return scene.group.appearances.indexOf(character) === -1;
		}));
	});
}

// Sort groups
// -----------
//
// Sort the array of groups so groups which are most often the median are at
// the extremes of the array. The centre most group should be the group which
// is least often the median group of a scene.
function sortGroups() {
	var alt, sortedGroups, group, i;

	// First sort by the group's medianCount property (the number of times the
	// group is the median group in a scene).
	groups.sort(function(a,b){
		return b.medianCount-a.medianCount;
	});

	// Specify order property and shuffle out groups into an ordered array.
	sortedGroups = [];
	i = 0;
	while (groups.length) {
		group = (alt) ? groups.pop() : groups.shift();
		group.order = i;
		i++;
		sortedGroups.push(group);
		alt = !alt;
	}

	groups = sortedGroups;
}

// Group positions
// ---------------
//
// Compute the actual min and max y-positions of each group.
function computeGroupPositions() {
	var max;
	max = 0;
	groups.forEach(function(group){
		group.min = max;
		group.max = max = characterGroupHeight(group.appearances.length) + group.min;
		max += groupMargin;
	});
}

// Character group positions
// -------------------------
//
// Compute the position of each character within its group.
function computeCharacterGroupPositions() {
	characters.forEach(function(character){
		var sum, count;
		sum = count = 0;
		character.appearances.forEach(function(appearance) {
			count++;
			sum += groups.indexOf(appearance.scene.group);
		});
		character.averageScenePosition = sum/count;
	});

	groups.forEach(function(group){
		group.characters.sort(function(a,b){
			var diff;
			// Average scene position.
			diff = a.averageScenePosition - b.averageScenePosition;
			if (diff !== 0) {
				return diff;
			}

			return characters.indexOf(a)-characters.indexOf(b);
		});
	});
}

// Sort group appearances
// ----------------------
//
// Group appearances (`group.appearances`) is an array
// of all characters which appear in scenes assigned to this group.
function sortGroupAppearances() {
	groups.forEach(function(group){
		group.appearances.sort(function(a,b){
			var diff;

			// Try simple group order.
			diff = a.group.order-b.group.order;
			if (diff !== 0) {
				return diff;
			}

			// Average scene position.
			diff = a.averageScenePosition - b.averageScenePosition;
			if (diff !== 0) {
				return diff;
			}

			// Array position.
			return characters.indexOf(a)-characters.indexOf(b);
		});
	});
}

// Scene timing
// ------------
//
// Compute the scene timing.
//
// TODO: support dates
function computeSceneTiming() {
	var duration = 1;
	scenes.forEach(function(scene){
		scene.start = scene.start || duration;
		scene.duration = scene.duration || 1;
		duration += scene.duration;
	});

	scale = ((orientation === 'vertical') ? size[1]-labelSize[1] : size[0]-labelSize[0])/duration;
}

// Character positions
// -------------------
//
// Compute the position of characters within a scene.
function computeAppearancePositions() {

	scenes.forEach(function(scene){

		scene.appearances.sort(function(a,b){
			var diff;

			// Try simple group order.
			diff = a.character.group.order-b.character.group.order;
			if (diff !== 0) {
				return diff;
			}

			// For characters in the same group use average scene position.
			diff = a.character.averageScenePosition - b.character.averageScenePosition;
			if (diff !== 0) {
				return diff;
			}

			// All else failing use main characters array order to keep things consistent.
			return characters.indexOf(a.character)-characters.indexOf(b.character);
		});

		scene.appearances.forEach(function(appearance,i) {
			if (orientation === 'vertical') {
				appearance.y = scenePadding[0];
				appearance.x = characterPosition(i) + scenePadding[3];
			} else {
				appearance.y = characterPosition(i) + scenePadding[0];
				appearance.x = scenePadding[3];
			}
		});

	});
}

// Position scenes
// ---------------
//
// Compute the actual x and y positions for each scene.
function computeScenePositions() {

	scenes.forEach(function(scene) {
		var sum, avg, appearances;

		scene.height = characterGroupHeight(scene.appearances.length) + scenePadding[0] + scenePadding[2];
		scene.width = scenePadding[1] + scenePadding[3];

		appearances = scene.appearances.filter(function(appearance){
			return appearance.character.group !== scene.group;
		});

		if (!appearances.length) {
			appearances = scene.appearances;
		}

		sum = appearances.reduce(function(total, appearance){
			return total += characterPosition(scene.group.appearances.indexOf(appearance.character)) + scene.group.min;
		}, 0);

		avg = sum/appearances.length;

		if (orientation === 'vertical') {
			scene.x = scene._x || Math.max(0, Math.min(size[0], avg - scene.width/2));
			scene.y = scene._y || Math.max(0, Math.min(size[1], scale * scene.start + labelSize[1]));
		} else {
			scene.x = scene._x || Math.max(0, Math.min(size[0], scale * scene.start + labelSize[0]));
			scene.y = scene._y || Math.max(0, Math.min(size[1], avg - scene.height/2));
		}
	});

}

// Introduction nodes
// ------------------
//
// Create a collection of character 'introduction' nodes. These are nodes which
// are displayed before the first appearance of each character.
function createIntroductionNodes() {
	var appearances;

	appearances = characters.map(function(character){
		return character.appearances[0];
	});

	introductions = [];
	appearances.forEach(function(appearance){

		var introduction, x, y;

		// Create the introduction object.
		introduction = {
			character: appearance.character,
			bounds: getLabelBounds
		};

		// Set the default position.
		if (orientation === 'vertical') {

			x = appearance.scene.x + appearance.x;
			y = appearance.scene.y - 0.5 * scale;

			// Move x-axis position to the dedicated label space if it makes sense.
			// if (x-labelSize[0] < labelSize[0]) {
			// 	x = labelSize[0];
			// }
		} else {

			x = appearance.scene.x - 0.5 * scale;
			y = appearance.scene.y + appearance.y;

			// Move x-axis position to the dedicated label space if it makes sense.
			if (x-labelSize[0] < labelSize[0]) {
				x = labelSize[0];
			}
		}

		if (orientation === 'vertical') {
			introduction.x = appearance.character._x || Math.max(0 + labelSize[0]/2, Math.min(size[0]-labelSize[0]/2, x));
			introduction.y = appearance.character._y || Math.max(0, Math.min(size[1]-labelSize[1], y));
		} else {
			introduction.x = appearance.character._x || Math.max(0, Math.min(size[0]-labelSize[0], x));
			introduction.y = appearance.character._y || Math.max(0 + labelSize[1]/2, Math.min(size[1]-labelSize[1]/2, y));
		}

		introduction.width = appearance.character._width || labelSize[0];
		introduction.height = appearance.character._height || labelSize[1];

		appearance.character.introduction = introduction;
		introductions.push(introduction);

	});
}

// Introduction positions
// ----------------------
//
// Layout the introduction nodes so that wherever possible they don't overlap
// scenes or each other.
function computeIntroductionPositions() {

	var collidables, intros;

	// Get a list of things introductions can collide with.
	collidables = introductions.concat(scenes);

	// Use a copy of the introductions array so we can sort it without changing
	// the main array's order.
	intros = introductions.slice();

	// Sort by y-axis position top to bottom.
	intros.sort(function(a,b){
		return a.y-b.y;
	});

	// Attempt to resolve collisions.
	intros.forEach((orientation === 'vertical') ? resolveCollisionsVertical : resolveCollisionsHorizontal);

	// Resolve collisions with horizontal layout.
	function resolveCollisionsHorizontal(introduction){

		var moveOptions, collisionBounds, introBounds, move, _y, collisions, movable;

		// Get the full list of items this introduction collides with
		collisions = collidesWith(introduction);

		// No need to continue if there are no collisions.
		if (!collisions){
			return;
		}

		// Move colliding items out of the way if possible.
		movable =  collisions.filter(function(collision){ return (collision.character); });
		movable.forEach(moveCollision);

		// Now only consider immovables (i.e. scene nodes).
		collisions = collisions.filter(function(collision){ return !(collision.character); });

		// No need to continue if there are no collisions.
		if (!collisions){
			return;
		}

		// Get a bounding box for all remaining colliding nodes.
		collisionBounds = bBox(collisions);
		introBounds = introduction.bounds();

		// Record the original y-axis position so we can revert if a move is a failure.
		_y = introduction.y;

		// Calculate the two move options (up or down).
		moveOptions = [collisionBounds[1][1] - introBounds[0][1], collisionBounds[0][1] - introBounds[1][1]];

		// Sort by absolute distance. Try the smallest move first.
		moveOptions.sort(function(a,b){
			return Math.abs(a)-Math.abs(b);
		});

		// Try the move options in turn.
		while (move = moveOptions.shift()) {

			introduction.y += move;
			collisions = collidesWith(introduction);

			if (collisions) {
				if (move > 0 && collisions.every(isMovable)) {
					collisions.forEach(moveCollision);
					break;
				} else {
					introduction.y = _y;
				}
			} else {
				break;
			}
		}

		// Move the colliding nodes.
		function moveCollision(collision) {
			collision.y += introduction.bounds()[1][1] - collision.bounds()[0][1];
		}
	}

	// Resolve collisions with vertical layout.
	function resolveCollisionsVertical(introduction){

		var moveOptions, collisionBounds, introBounds, move, _y, collisions, movable;

		// Get the full list of items this introduction collides with
		collisions = collidesWith(introduction);

		// No need to continue if there are no collisions.
		if (!collisions){
			return;
		}

		// Move colliding items out of the way if possible.
		movable = collisions.filter(function(collision){ return (collision.character); });
		movable.forEach(moveCollision);

		// Now only consider immovables (i.e. scene nodes).
		collisions = collisions.filter(function(collision){ return !(collision.character); });

		// No need to continue if there are no collisions.
		if (!collisions){
			return;
		}

		// Get a bounding box for all remaining colliding nodes.
		collisionBounds = bBox(collisions);
		introBounds = introduction.bounds();

		// Record the original y-axis position so we can revert if a move is a failure.
		_y = introduction.y;

		// Calculate the two move options (up or down).
		moveOptions = [collisionBounds[1][1] - introBounds[0][1], collisionBounds[0][1] - introBounds[1][1]];

		// Sort by absolute distance. Try the smallest move first.
		moveOptions.sort(function(a,b){
			return Math.abs(a)-Math.abs(b);
		});

		// Try the move options in turn.
		while (move = moveOptions.shift()) {

			introduction.y += move;
			collisions = collidesWith(introduction);

			if (collisions) {
				if (move > 0 && collisions.every(isMovable)) {
					collisions.forEach(moveCollision);
					break;
				} else {
					introduction.y = _y;
				}
			} else {
				break;
			}
		}

		// Move the colliding nodes.
		function moveCollision(collision) {
			collision.y += introduction.bounds()[1][1] - collision.bounds()[0][1];
		}
	}

	// Is the supplied node movable?
	function isMovable(collision) {
		return (collision.character);
	}

	// Create a bounding box around a collection of nodes.
	function bBox(arr) {
		var x0,x1,y0,y1;
		x0 = d3.min(arr, function(d){
			return d.bounds()[0][0];
		});
		x1 = d3.max(arr, function(d) {
			return d.bounds()[1][0];
		});
		y0 = d3.min(arr, function(d){
			return d.bounds()[0][1];
		});
		y1 = d3.max(arr, function(d) {
			return d.bounds()[1][1];
		});
		return [[x0,y0],[x1,y1]];
	}

	// Gets a list of all other nodes that this introduction collides with.
	function collidesWith(introduction) {
		var i, ii, collisions;
		collisions = [];
		for (i=0,ii=collidables.length;i<ii;i++) {
			if (introduction !== collidables[i] && collides(introduction.bounds(), collidables[i].bounds())) {
				collisions.push(collidables[i]);
			}
		}
		return (collisions.length) ? collisions : false;
	}

	// Check for overlap between two bounding boxes.
	function collides(a,b) {
		return !(
			// Verticals.
			a[1][0] <= b[0][0] ||
			b[1][0] <= a[0][0] ||

			// Horizontals.
			a[1][1] <= b[0][1] ||
			b[1][1] <= a[0][1]);
	}

}

// Links
// -----
//
// Create a collection of links between appearances.
function createLinks() {
	links = [];

	characters.forEach(function(character){
		var i;

		// Links to intro nodes.
		links.push({
			character: character,
			source: character.introduction,
			target: character.appearances[0]
		});

		// Standard appearance links.
		for (i=1;i<character.appearances.length;i++) {
			links.push({
				character: character,
				source: character.appearances[i-1],
				target: character.appearances[i]
			});
		}
	});
}

// Utility functions
// =================
//
// Get the actual y-axis position of a character with the given (zero based) index.
function characterPosition(index) {
	return index * pathSpace + pathSpace / 2;
}

// Get the actual height of a group based on a character count.
function characterGroupHeight(count) {
	return characterPosition(count) - pathSpace/2;
}

// Scene bounds
// ------------
//
// This is attached to all scene objects as `scene.bound` and returns the bounds
// for the scene node.
function getSceneBounds(){
	return [[this.x,this.y],[this.x+this.width,this.y+this.height]];
}

// Label bounds
// ------------
//
// This is attached to all character objects as `character.bounds` and returns
// the bounds of the character's introduction label.
function getLabelBounds(){
	switch(labelPosition) {
		case('left'):
			return [[this.x-this.width,this.y-this.height/2],[this.x,this.y+this.height/2]];
		case('above'):
			return [[this.x-this.width/2,this.y-this.height],[this.x+this.width/2,this.y]];
		case('right'):
			return [[this.x,this.y-this.height/2],[this.x+this.width,this.y+this.height/2]];
		case('below'):
			return [[this.x-this.width/2,this.y],[this.x+this.width/2,this.y+this.height]];
	}

}

};
