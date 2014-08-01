#news-interactive-narrative-charts

[XKCD](http://xkcd.com/657/) style narrative charts layout engine for [d3](http://d3js.org).

This is just a layout engine; how you go about presenting and styling the result
is entirely up to you.

## API

See docs... (todo)

## Internal data structures

The inputs to the layout are two arrays of character and scene objects. These
lists are then linked, grouped and sorted in various ways in an attempt to 
generate an optimal layout.

The resulting data structures are documented below.

### `groups`—an array of (character) group objects

Properties:
- `id` [int] a unique ID for the group
- `characters` [array of objects] an unordered array of characters assigned to this group
- `appearances` [array of objects] an *ordered* array of unique characters appearing in scenes assigned to this group (note that this is different from other `.appearances` properties)
- `min` [int] position on the y-axis that this group starts
- `max` [int] position on the y-axis that this group ends
- `medianCount` [int] the scenes in which this group is the median group of appearing characters
- `order` [int] the appearance order of this group

### `characters`—an array of character objects

Properties:
- `name` [string] the character's name
- `appearances` [array of objects] ordered array of appearances—see below for object structure
- `averageScenePosition` [number] the average group position of scenes this character appears in

### `appearances`

Properties:
- `character` [object] the character appearing
- `scene` [object] the scene the character is appearing in
- `y` [int] the y-axis position of this appearance relative to the scene

### `scenes`—an array of scene objects

Properties:
- `characters` [array of objects] an array of characters appearing in this scene
- `appearances` [array of objects] an array of apparances in this scene
- `group` [object] the group this scene belongs to (the median group of all characters in scene)
- `duration` [int] the duration of this scene (translated to x-axis space after the scene)
- `start` [int] the *raw* start position of the scene (scaled to available x-axis space)
- `height` [int] the height in pixels of this scene
- `x` [number] the x-axis position of the scene
- `y` [number] the y-axis position of the scene
