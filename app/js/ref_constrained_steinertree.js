// Please use your own token here. See https://cesium.com/learn/ion/cesium-ion-access-tokens/
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4OGZjZGIwZC03ODlhLTRmNGEtOGMyMC1kZTRlNzI3OGFjNzkiLCJpZCI6NjQxNzYsImlhdCI6MTYyODg2MDY2M30.4Qs7AJNdHE8AA3SG6vJLhZORa6L3ln9oHwuH5NasJfw';

var viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: Cesium.createWorldTerrain()
});
//var viewer = new Cesium.Viewer('cesiumContainer');
var scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = true;

var tileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());

viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(2.5300413122436995/Math.PI*180, -0.6599949374176008/Math.PI*180, 1000)
});

//parameters
const threshold_distance = 300; //metres
const pole_height = 9;  //9 metres above the terrain height
//horizontl and vertical view angles of the viewshed function
// const horizontalAngle = 180 - 0.1;  //degree
// const verticalAngle = 180 - 0.1;  // degree
const cost_cite = 1;
const P_tx = 10 ** (60/10) / 1000;   // 60dBm in watts
const fc = 26 * (10 ** 9);   // RF = 26GHz
const wavelength = 3 * (10 ** 8) / fc;    // wavelength in metres
const BW = 10 ** 9;    // bandwidth in Hz 
const unit_demand = 50 * (10 ** 5);  // peak time demand per person in bits/s
const kB = 1.380649 * (10 ** (-23));   // Boltzmann constant in J*K^(-1)
const temperature = 300;    // temperature in K
const P_noise = kB * temperature * BW;  // thermal noise power in watts
const max_capacity_per_layer = 5.1;  // bits / (second * Hz * num_of_layers)
const num_layers = 2;

/* Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
* items are added to the end of the queue and removed from the front.
*/
//This will be used later for constructing a breadth first spanning tree from a graph
function Queue(){

    // initialise the queue and offset
    var queue  = [];
    var offset = 0;

    // Returns the length of the queue.
    this.getLength = function(){
        return (queue.length - offset);
    };

    // Returns true if the queue is empty, and false otherwise.
    this.isEmpty = function(){
        return (queue.length === 0);
    };

    /* Enqueues the specified item. The parameter is:
        *
        * item - the item to enqueue
        */
    this.enqueue = function(item){
        queue.push(item);
    };

    this.dequeueend = function(){
        
        // if the queue is empty, return immediately
        if (queue.length === 0) {return undefined;}

        return queue.pop();
        
    };

    /* Dequeues an item and returns it. If the queue is empty, the value
        * 'undefined' is returned.
        */
    this.dequeue = function(){

        // if the queue is empty, return immediately
        if (queue.length === 0) {return undefined;}

        // store the item at the front of the queue
        var item = queue[offset];

        // increment the offset and remove the free space if necessary
        if (++ offset * 2 >= queue.length){
        queue  = queue.slice(offset);
        offset = 0;
        }

        // return the dequeued item
        return item;

    };

    /* Returns the item at the front of the queue (without dequeuing it). If the
        * queue is empty then undefined is returned.
        */
    this.peek = function(){
        return (queue.length > 0 ? queue[offset] : undefined);
    };

}

// create a graph class with capacities
class Graph {
    // defining vertex array and
    // adjacent list
    constructor()
    {
        this.vertices = [];
        this.AdjList = {};
        this.capacities = {};
        //this.flows = {};
    }
  
    // functions to be implemented
  
    // add vertex to the graph
    addVertex(v)
    {
        // initialize the adjacent list with a
        // null array
        if (!(this.vertices.includes(v))){
            this.vertices.push(v);
            this.AdjList[v] = {};
            this.capacities[v] = {};
        }
    }
  
    // add edge to the graph
    addEdge(v, w, weight, capacity)
    {
        // get the list for vertex v and put the
        // vertex w denoting edge between v and w
        this.AdjList[v][w] = weight;
        this.capacities[v][w] = capacity;
        //this.flows[v][w] = 0;
    
        // Since graph is undirected,
        // add an edge from w to v also
        this.AdjList[w][v] = weight;
        this.capacities[w][v] = capacity;
        //this.flows[w][v] = 0;
    }


    // delete vertex and all corresponding edges from the graph
    deleteVertex(v) 
    {   
        // delete from the vertices array
        let index = this.vertices.indexOf(v);
        if (index > -1) {
            this.vertices.splice(index, 1);
        }
        
        // delete corresponding edges
        delete this.AdjList[v];
        delete this.capacities[v];
        //delete this.flows[v];
        for (let i = 0; i < Object.keys(this.AdjList).length; i++){
            delete this.AdjList[Object.keys(this.AdjList)[i]][v];
            delete this.capacities[Object.keys(this.AdjList)[i]][v];
            //delete this.flows[Object.keys(this.AdjList)[i]][v];
        }
    }
    // return number of vertices
    noOfVertices()
    {
        return this.vertices.length;
    }

    // set flow of edge (v,w) to f if (v,w) exists
    /* setFlow(v, w, f)
    {
        if ((this.vertices.includes(v)) && (this.vertices.includes(w))) {
            if (this.AdjList[v].includes(w)) {
                this.flows[v][w] = f;
                this.flows[w][v] = f;
            } else {
                console.log('Edge (' + v + ', ' + w + ') does not exist.');
            }
        } else {
            console.log('Vertex ' + v + 'and/or ' + w + ' do not exist.');
        }
    } */

    // reset all flows to zero
    /* resetFlows()
    {
        for (let i = 0; i < this.noOfVertices(); i++){
            for (let j = 0; j < Object.keys(this.flows[this.vertices[i]]).length; j++){
                this.flows[this.vertices[i]][Object.keys(this.AdjList[this.vertices[i]])[j]] = 0;
            }
        }
    } */
  
    // Prints the vertex and adjacency list
    printGraph()
    {   
        console.log('**********************************');
        for (let i = 0; i < this.noOfVertices(); i++){
            console.log(this.vertices[i] + ': {');
            for (let j = 0; j < Object.keys(this.AdjList[this.vertices[i]]).length; j++){
                console.log(Object.keys(this.AdjList[this.vertices[i]])[j] + ': ' + Object.values(this.AdjList[this.vertices[i]])[j]); 
            }
            console.log('}')
        }
        console.log('**********************************');
    }

    // find the vertex with minimum distance
    vertexWithMinDistance(distances, visited) {
        let minDistance = Infinity,
            minVertex = null;
        for (let vertex in distances) {
            let distance = distances[vertex];
            if (distance < minDistance && !visited.has(vertex)) {
                minDistance = distance;
                minVertex = vertex;
            }
        }
        return minVertex;
    }

    // Dijksta's algorithm
    dijkstra(source) {
        // parents is the list of parent node of each node 
        // distances is the list of the distances from the source to all other nodes
        let distances = {},
            parents = {},
            visited = new Set();
        for (let i = 0; i < this.vertices.length; i++) {
            if (this.vertices[i] === source) {
                distances[source] = 0;
            } else {
                distances[this.vertices[i]] = Infinity;
            }
            parents[this.vertices[i]] = null;
        }
        
        let currVertex = this.vertexWithMinDistance(distances, visited);

        while (currVertex !== null) {
            let distance = distances[currVertex],
                neighbors = this.AdjList[currVertex];
            for (let neighbor in neighbors) {
                let newDistance = distance + neighbors[neighbor];
                if (distances[neighbor] > newDistance) {
                    distances[neighbor] = newDistance;
                    parents[neighbor] = currVertex;
                }
            }
            visited.add(currVertex);
            currVertex = this.vertexWithMinDistance(distances, visited);
        }

        //console.log(parents);
        //console.log(distances);
        return [parents, distances];
    }
  
}

//adding nodes

var Fibre_POP = {'F0': [new Cesium.Cartographic(2.5301302489208677, -0.6599806625632476, 15.387962821362766)],
    'F1': [new Cesium.Cartographic(2.530099215810696, -0.6600168820104643, 10.591713605761377)],
    /*'F2': [new Cesium.Cartographic(2.5300531811422724, -0.6600300399139316, 14.864855992576771)],
    'F3': [new Cesium.Cartographic(2.530189745389745, -0.6599913191711606, 29.016131236598046)],*/
    'F4': [new Cesium.Cartographic(2.53008676572664, -0.6599826716651905, 13.028086722351231)],
    //'F5': [new Cesium.Cartographic(2.530160849712574, -0.6599350184186169, 21.85299467881667)]
}; // {nodename0: [location0 in cartographic], ...} example: we can get the nodes location as Fibre_POP[nodename0]
var Fibre_POP_name_array = Object.keys(Fibre_POP);
var num_fibrenodes = Fibre_POP_name_array.length;

var Demand_Nodes = {'D0': [new Cesium.Cartographic(2.530129331870291, -0.6599669957296387, 24.837265564395175), 60 * unit_demand],
    'D1': [new Cesium.Cartographic(2.53013960220091, -0.6599640503251012, 24.83678490893599), 100 * unit_demand],
    'D2': [new Cesium.Cartographic(2.5301601779521468, -0.6599426461041569, 23.92147550625919), 30 * unit_demand],
    'D3': [new Cesium.Cartographic(2.5300945601208222, -0.660012301906103, 33.892782697399035), 50 * unit_demand],
    'D4': [new Cesium.Cartographic(2.5300753604221273, -0.660021658629016, 15.529107527796233), 80 * unit_demand],
    'D5': [new Cesium.Cartographic(2.5300607640720956, -0.65998773879639, 28.433301833404517), 50 * unit_demand],
    'D6': [new Cesium.Cartographic(2.530080474498102, -0.6599660136792199, 54.749117489877264), 80 * unit_demand],
    /*'D7': [new Cesium.Cartographic(2.5300790690499118, -0.659942897167339, 47.49798890057283), 60 * unit_demand],
    'D8': [new Cesium.Cartographic(2.530104721738898, -0.6599281931439027, 25.750077866479028), 20 * unit_demand],
    'D9': [new Cesium.Cartographic(2.530011819225692, -0.6600306809497662, 41.12524835776956), 20 * unit_demand],
    'D10': [new Cesium.Cartographic(2.530044590968935, -0.6600125507291591, 72.2845320065688), 50 * unit_demand],
    'D11': [new Cesium.Cartographic(2.5300373200851793, -0.6600333487077498, 57.81198209540763), 40 * unit_demand],*/
    'D12': [new Cesium.Cartographic(2.530111024023634, -0.6600478565643118, 41.45409682784946), 20 * unit_demand],
    /*'D13': [new Cesium.Cartographic(2.5301938264490746, -0.6600152209967933, 50.14972751656062), 30 * unit_demand],
    'D14': [new Cesium.Cartographic(2.5301527690082644, -0.6600045839670474, 79.63807038314013), 60 * unit_demand],*/
    'D15': [new Cesium.Cartographic(2.530143138721106, -0.659998491786552, 28.429306484748068), 40 * unit_demand],
    //'D16': [new Cesium.Cartographic(2.530171635817686, -0.6599672625197199, 27.58469783312392), 30 * unit_demand],
    'D17': [new Cesium.Cartographic(2.530122941180479, -0.6600081600395825, 49.49686626853022), 60 * unit_demand],
    'D18': [new Cesium.Cartographic(2.530113014918447, -0.6599777792243331, 42.13778203101787), 45 * unit_demand],
    //'D19': [new Cesium.Cartographic(2.5300613055498147, -0.6600321479310043, 16.649321027156404), 10 * unit_demand]
}; // {nodename0: [location0 in cartographic, demand0], nodename1: [location1 in cartographic, demand1]...} example: we can get the nodes location as Demand_Nodes[nodename0][0]
var Demand_Nodes_name_array = Object.keys(Demand_Nodes);
var Demands_array = [];
for (let i = 0; i < Demand_Nodes_name_array.length; i++) {
    Demands_array.push(Demand_Nodes[Demand_Nodes_name_array[i]][1]);
}
console.log(Demands_array);
var num_demandnodes = Demand_Nodes_name_array.length;

var Potential_Sites = {'P0': [new Cesium.Cartographic(2.5301651369056026, -0.6599438203279397, 20.6472509012533)],
    'P1': [new Cesium.Cartographic(2.5301707114918672, -0.6599576458587132, 21.52101062939217)],
    'P2': [new Cesium.Cartographic(2.5301503851172527, -0.6599636528228986, 18.823973914900137)],
    'P3': [new Cesium.Cartographic(2.5301258828987883, -0.6599708256045693, 15.538956100126317)],
    'P4': [new Cesium.Cartographic(2.530119273721893, -0.6599534456642682, 17.042052882522132)],
    'P5': [new Cesium.Cartographic(2.5301546674108835, -0.6599238954663995, 24.225349286391765)],
    'P6': [new Cesium.Cartographic(2.530111605840141, -0.659936628817124, 20.547682377602605)],
    'P7': [new Cesium.Cartographic(2.5300932963796514, -0.6600040638205054, 11.552358847624769)],
    'P8': [new Cesium.Cartographic(2.5300829471654644, -0.6600220846779822, 11.15517686400833)],
    'P9': [new Cesium.Cartographic(2.530061984510498, -0.6600280187988536, 13.422172663038836)],  
    'P10': [new Cesium.Cartographic(2.5300837191721017, -0.6599840451697327, 12.93278995030106)],
    'P11': [new Cesium.Cartographic(2.530089647752755, -0.6599905288945636, 12.246051653600777)],
    'P12': [new Cesium.Cartographic(2.5300607405537114, -0.659989366710684, 19.883645935794263)],   
    /*'P13': [new Cesium.Cartographic(2.530041235846701, -0.659995819260072, 25.868152783130277)],
    'P14': [new Cesium.Cartographic(2.530050792811441, -0.6600192996616082, 17.634959958243087)],*/
    'P15': [new Cesium.Cartographic(2.53009260813788, -0.6600191133883819, 10.887284348836292)],
    'P16': [new Cesium.Cartographic(2.530138318764143, -0.6599932108493948, 15.04365120749942)],
    //'P17': [new Cesium.Cartographic(2.5301445017614386, -0.6600045479508555, 14.741708643579685)],
    'P18': [new Cesium.Cartographic(2.5301330866553196, -0.659979246497873, 15.680443332736523)],
    //'P19': [new Cesium.Cartographic(2.530165518271586, -0.6599982315540728, 22.15474203994201)],
    'P20': [new Cesium.Cartographic(2.530114739053083, -0.6600140607473017, 11.539971280441229)],
    /*'P21': [new Cesium.Cartographic(2.530129232209384, -0.6600089455634728, 12.625281634855611)],
    'P22': [new Cesium.Cartographic(2.5301817162231384, -0.6599834425694533, 27.954231556180783)],
    'P23': [new Cesium.Cartographic(2.5301784965633276, -0.6599926805970577, 26.981720620378464)],*/
    'P24': [new Cesium.Cartographic(2.5301784127310842, -0.6599737955911489, 26.810913686895628)],
    /*'P25': [new Cesium.Cartographic(2.5301866515445948, -0.6599967701375284, 27.960877253458264)],
    'P26': [new Cesium.Cartographic(2.530194906003677, -0.6600073780892083, 24.301681270314603)],
    'P27': [new Cesium.Cartographic(2.5301979950351003, -0.6600204774262278, 18.002951922417292)],
    'P28': [new Cesium.Cartographic(2.530044463850177, -0.6600339691469527, 17.24848574675694)],
    'P29': [new Cesium.Cartographic(2.5300278968750973, -0.6600378596517211, 19.642154143175794)],
    'P30': [new Cesium.Cartographic(2.5300117396667345, -0.6600435797485288, 19.278512067652052)],
    'P31': [new Cesium.Cartographic(2.5300050035803334, -0.6600266026926189, 24.533326679449303)],
    'P32': [new Cesium.Cartographic(2.529997796801994, -0.6600083091962474, 28.068663227529694)],
    'P33': [new Cesium.Cartographic(2.530019621711647, -0.6600053144321422, 29.446982759693164)],*/
    'P34': [new Cesium.Cartographic(2.5300785106692083, -0.6599704956379364, 14.025257724183378)],
    /*'P35': [new Cesium.Cartographic(2.530070590537258, -0.6599562924145197, 15.152976168659713)],
    'P36': [new Cesium.Cartographic(2.5300695990821316, -0.6599470714228683, 15.651365009568659)],
    'P37': [new Cesium.Cartographic(2.5300888338421244, -0.6599428941357929, 16.568345943864344)],*/
    'P38': [new Cesium.Cartographic(2.5301043300228176, -0.6600286707009794, 9.832080322728707)],
    'P39': [new Cesium.Cartographic(2.5301053028740315, -0.6599769207358253, 13.982315350872803)], 
    //'P40': [new Cesium.Cartographic(2.53004691965869, -0.6600085145823349, 21.30402536751334)]
};  // {nodename0: [location0 in cartographic], ...}
var Potential_Sites_name_array = Object.keys(Potential_Sites);
var num_potentialcites = Potential_Sites_name_array.length;

var pole_name_array = Fibre_POP_name_array.concat(Demand_Nodes_name_array.concat(Potential_Sites_name_array)); // [fibre nodes, demand nodes, potential cites]
console.log(pole_name_array);

var pole_object = {};   // {fibre nodes: [fibre nodes locations], demand nodes: [demand nodes locations], potential sites: [potential sites locations]}, locations are in cartesian3
var pole_array_cartesian = [];
var objectsToExclude = [];
for (let i = 0; i < num_fibrenodes; i++){
    Fibre_POP[Fibre_POP_name_array[i]][0].height = Fibre_POP[Fibre_POP_name_array[i]][0].height + pole_height;
    pole_array_cartesian.push(Cesium.Cartographic.toCartesian(Fibre_POP[Fibre_POP_name_array[i]][0]));
    pole_object[Fibre_POP_name_array[i]] = Cesium.Cartographic.toCartesian(Fibre_POP[Fibre_POP_name_array[i]][0]);
    objectsToExclude.push(viewer.entities.add({
        position: pole_array_cartesian[i], //Cesium.Cartographic.toCartesian(clickPosition),
        point: {
            color: Cesium.Color.RED,
            pixelSize: 10,
        },
    })); 
}

for (let i = 0; i < num_demandnodes; i++){
    Demand_Nodes[Demand_Nodes_name_array[i]][0].height = Demand_Nodes[Demand_Nodes_name_array[i]][0].height + pole_height;
    pole_array_cartesian.push(Cesium.Cartographic.toCartesian(Demand_Nodes[Demand_Nodes_name_array[i]][0]));
    pole_object[Demand_Nodes_name_array[i]] = Cesium.Cartographic.toCartesian(Demand_Nodes[Demand_Nodes_name_array[i]][0]);
    objectsToExclude.push(viewer.entities.add({
        position: pole_array_cartesian[i + num_fibrenodes], //Cesium.Cartographic.toCartesian(clickPosition),
        point: {
            color: Cesium.Color.GREEN,
            pixelSize: 10,
        },
    })); 
}

for (let i = 0; i < num_potentialcites; i++){
    Potential_Sites[Potential_Sites_name_array[i]][0].height = Potential_Sites[Potential_Sites_name_array[i]][0].height + pole_height;
    pole_array_cartesian.push(Cesium.Cartographic.toCartesian(Potential_Sites[Potential_Sites_name_array[i]][0]));
    pole_object[Potential_Sites_name_array[i]] = Cesium.Cartographic.toCartesian(Potential_Sites[Potential_Sites_name_array[i]][0]);
    objectsToExclude.push(viewer.entities.add({
        position: pole_array_cartesian[i + num_demandnodes + num_fibrenodes], //Cesium.Cartographic.toCartesian(clickPosition),
        point: {
            color: Cesium.Color.BLUE,
            pixelSize: 10,
        },
    })); 
}




// checking possible links
function find_possible_links(graph, link_array){
    // link_array: each row records a possible link as [nodei, nodej, cost, capacity] 

    //fibre poles can connect to demand nodes and potential sites
    for (let i = 0; i < Fibre_POP_name_array.length; i++) {
        for (let j = Fibre_POP_name_array.length; j < pole_name_array.length; j++) {
            let distance_i2j = Cesium.Cartesian3.distance(pole_array_cartesian[i], pole_array_cartesian[j]);
            if (distance_i2j <= threshold_distance) {
                let dir1 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[j], pole_array_cartesian[i], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir1);
                let ray1 = new Cesium.Ray(pole_array_cartesian[i], dir1);
                console.log(ray1);
                let intersection1 = scene.pickFromRay(ray1, objectsToExclude);
                console.log(intersection1);
                let dir2 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[i], pole_array_cartesian[j], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir2);
                let ray2 = new Cesium.Ray(pole_array_cartesian[j], dir2);
                console.log(ray2);
                let intersection2 = scene.pickFromRay(ray2, objectsToExclude);
                console.log(intersection2);
                let link_capacity = num_layers * BW * Math.min(Math.log2(1 + P_tx * ((wavelength / (4 * Math.PI * distance_i2j)) ** 2) / P_noise), max_capacity_per_layer);
                console.log(link_capacity);
                if ((intersection1 !== undefined) && (intersection2 !== undefined)) {  
                    let distance_i2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[i], intersection1.position);
                    let distance_j2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[j], intersection2.position);
                    if ((distance_i2intersection >= distance_i2j) || (distance_j2intersection >= distance_i2j)) {    // LoS exists if distance_i2intersection >= distance_i2j or distance_j2intersection >= distance_i2j, since somtimes pickfromray() cannot find intersection from one direction but can find from the other
                        link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                        graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                        objectsToExclude.push(viewer.entities.add({
                        polyline: {
                            positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                            width: 1,
                            material: Cesium.Color.CYAN,
                        },
                        }));
                    }
                } else {   // LoS exists if there is no intersection
                    link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                    graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                    objectsToExclude.push(viewer.entities.add({
                        polyline: {
                        positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                        width: 1,
                        material: Cesium.Color.CYAN,
                        },
                    }));
                }  
            }
        }
    }         
    // demand nodes can connect to fibre poles (already connected) and potential cites
    for (let i = Fibre_POP_name_array.length; i < Fibre_POP_name_array.length + Demand_Nodes_name_array.length; i++) {
        for (let j = Fibre_POP_name_array.length + Demand_Nodes_name_array.length; j < pole_array_cartesian.length; j++) {
            distance_i2j = Cesium.Cartesian3.distance(pole_array_cartesian[i], pole_array_cartesian[j]);
            if (distance_i2j <= threshold_distance) {
                dir1 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[j], pole_array_cartesian[i], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir1);
                ray1 = new Cesium.Ray(pole_array_cartesian[i], dir1);
                console.log(ray1);
                intersection1 = scene.pickFromRay(ray1, objectsToExclude);
                console.log(intersection1);
                dir2 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[i], pole_array_cartesian[j], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir2);
                ray2 = new Cesium.Ray(pole_array_cartesian[j], dir2);
                console.log(ray2);
                intersection2 = scene.pickFromRay(ray2, objectsToExclude);
                console.log(intersection2);
                link_capacity = num_layers * BW * Math.min(Math.log2(1 + P_tx * ((wavelength / (4 * Math.PI * distance_i2j)) ** 2) / P_noise), max_capacity_per_layer);
                console.log(link_capacity);
                if ((intersection1 !== undefined) && (intersection2 !== undefined)) {  
                    distance_i2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[i], intersection1.position);
                    distance_j2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[j], intersection2.position);
                    if ((distance_i2intersection >= distance_i2j) || (distance_j2intersection >= distance_i2j)) {    // LoS exists if distance_i2intersection >= distance_i2j or distance_j2intersection >= distance_i2j, since somtimes pickfromray() cannot find intersection from one direction but can find from the other
                        link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                        graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                        objectsToExclude.push(viewer.entities.add({
                        polyline: {
                            positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                            width: 1,
                            material: Cesium.Color.CYAN,
                        },
                        }));
                    }
                } else {   // LoS exists if there is no intersection
                    link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                    graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                    objectsToExclude.push(viewer.entities.add({
                        polyline: {
                        positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                        width: 1,
                        material: Cesium.Color.CYAN,
                        },
                    }));
                }  
            }
        }
    }      
    // potential sites can connect to fibre poles (already connected), demand nodes (already connected) and potential cites
    for (let i = Fibre_POP_name_array.length + Demand_Nodes_name_array.length; i < pole_array_cartesian.length; i++) {
        for (let j = i + 1; j < pole_array_cartesian.length; j++) {
            distance_i2j = Cesium.Cartesian3.distance(pole_array_cartesian[i], pole_array_cartesian[j]);
            if (distance_i2j <= threshold_distance) {
                dir1 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[j], pole_array_cartesian[i], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir1);
                ray1 = new Cesium.Ray(pole_array_cartesian[i], dir1);
                console.log(ray1);
                intersection1 = scene.pickFromRay(ray1, objectsToExclude);
                console.log(intersection1);
                dir2 = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(pole_array_cartesian[i], pole_array_cartesian[j], new Cesium.Cartesian3()), new Cesium.Cartesian3());
                console.log(dir2);
                ray2 = new Cesium.Ray(pole_array_cartesian[j], dir2);
                console.log(ray2);
                intersection2 = scene.pickFromRay(ray2, objectsToExclude);
                console.log(intersection2);
                link_capacity = num_layers * BW * Math.min(Math.log2(1 + P_tx * ((wavelength / (4 * Math.PI * distance_i2j)) ** 2) / P_noise), max_capacity_per_layer);
                console.log(link_capacity);
                if ((intersection1 !== undefined) && (intersection2 !== undefined)) {  
                    distance_i2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[i], intersection1.position);
                    distance_j2intersection = Cesium.Cartesian3.distance(pole_array_cartesian[j], intersection2.position);
                    if ((distance_i2intersection >= distance_i2j) || (distance_j2intersection >= distance_i2j)) {    // LoS exists if distance_i2intersection >= distance_i2j or distance_j2intersection >= distance_i2j, since somtimes pickfromray() cannot find intersection from one direction but can find from the other
                        link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                        graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                        objectsToExclude.push(viewer.entities.add({
                        polyline: {
                            positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                            width: 1,
                            material: Cesium.Color.CYAN,
                        },
                        }));
                    }
                } else {   // LoS exists if there is no intersection
                    link_array.push([pole_name_array[i], pole_name_array[j], cost_cite, link_capacity]);
                    graph.addEdge(pole_name_array[i], pole_name_array[j], cost_cite, link_capacity);
                    objectsToExclude.push(viewer.entities.add({
                        polyline: {
                        positions: [pole_array_cartesian[i], pole_array_cartesian[j]],
                        width: 1,
                        material: Cesium.Color.CYAN,
                        },
                    }));
                }  
            }
        }
    }      

    graph.printGraph();
    return [graph, link_array];
}

// function for data exportation
function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ',';
            finalVal += result;
        }
        return finalVal + '\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// convert a row vector to a column vector
function rows2cols(grid) {
    let r = [];
    for (let i = 0; i < grid.length; i++){
        console.log([grid[i]]);
        r.push([grid[i]]);
    }
    return r;
}

// By a single right clicking you get the potential links. All nodes and potential links are then exported as .csv files.
var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(function (movement) {

    console.log(pole_array_cartesian);

    let graph = new Graph();
    let link_array = [];
    graph.addVertex('SS');    // add a virtual super source node
    for (let i = 0; i < pole_array_cartesian.length; i++) {
        graph.addVertex(pole_name_array[i]);     //vertices are denoted as 0,1,...
    }
    for (let i = 0; i < Fibre_POP_name_array.length; i++) {
        //link_array.push('SS', Fibre_POP_name_array[i], 0, Infinity);
        graph.addEdge('SS', Fibre_POP_name_array[i], 0, Infinity);   // assume virtual connection with the super source node, the cost is 0 and the capacity is infinite
    }
    
    [graph, link_array] = find_possible_links(graph, link_array);


    // export data
    Fibre_POP_name_array.unshift('FP');
    Demand_Nodes_name_array.unshift('DN');
    Demands_array.unshift('Demands');
    Potential_Sites_name_array.unshift('PS');
    link_array.unshift(['node1', 'node2', 'cost', 'capacity']);
    exportToCsv('FP.csv', rows2cols(Fibre_POP_name_array));  // note that the elements in the exported csv file are in a column
    exportToCsv('DN.csv', rows2cols(Demand_Nodes_name_array));  
    exportToCsv('Demands.csv', rows2cols(Demands_array));  
    exportToCsv('PS.csv', rows2cols(Potential_Sites_name_array));  
    exportToCsv('links.csv', link_array);   // the link from 'SS' to fibre pops should be added manually in Matlab

}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

