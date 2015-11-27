# jLouvain
**Corneliu S.**

--------------------------------------------------------------------------------

## Description
Formally, a community detection aims to partition a graph's vertices in subsets, such that there are many edges connecting between vertices of the same sub-set compared to vertices of different sub-sets; in essence, a community has many more ties between each constituent part than with outsiders. There are numerous algorithms present in the literature for solving this problem, a complete survey can be found in [1].  

One of the popular community detection algorithms is presented in [2]. This algorithm separates the network in communities by optimizing greedily a modularity score after trying various grouping operations on the network. By using this simple greedy approach the algorithm is computationally very efficient.

[1] Fortunato, Santo. "Community detection in graphs." Physics Reports 486, no. 3-5 (2010).

[2] V.D. Blondel, J.-L. Guillaume, R. Lambiotte, E. Lefebvre. "Fast unfolding of communities in large networks." J. Stat. Mech., 2008: 1008.

## Usage
### Import the script.

```
   <script type="text/javascript" src="jLouvain.js"></script>
```

### Sample Data Format
#### Node Data

```
   var node_data = ['id1', 'id2', 'id3']; // any type of string can be used as id
```

#### Edge Data

```
   var edge_data = [{source: 'id1', target:'id2', weight: 10.0},
                    {source: 'id2', target:'id3', weight: 20.0},
                    {source: 'id3', target:'id1', weight: 30.0}];
```

#### (Optional) Partition Data

```
   var init_part = {'id1':0, 'id2':0, 'id3': 1};
   // Object with ids of nodes as properties and community number assigned as value.
```

Run the Algorithm on your node and edge set by chaining the **nodes** and **edges** methods, optionally you can provide an intermediary community partition assignement with the **partition_init** method. [ **Order of chaining is important** ]

```
   var community = jLouvain().nodes(node_data).edges(edge_data).partition_init(init_part);
   var result  = community();
```
