import FourD from '/js/vendor/fourd/fourd.js';
import SimpleMDE from 'simplemde/debug/simplemde.js';
import RemoteStorage from 'remotestoragejs/release/remotestorage';
import Widget from 'remotestorage-widget/build/widget';
import { v4 as uuidv4 } from 'uuid';
import $ from 'jquery';
import 'jquery-contextmenu';

// import regeneratorRuntime from 'regenerator-runtime/runtime';
// window.regeneratorRuntime = regeneratorRuntime;

var selected;
var client;

var mde = new SimpleMDE({ 
  autofocus: true,
  element: document.getElementById("editor"),
  spellChecker: false,
  forceSync: true,
  height: window.innerHeight
});

var $fourd = new FourD();
$fourd.init('#display', {
  border: '0px',
  width: Math.floor(window.innerWidth * 0.60) -2 ,
  height: window.innerHeight,
  background: 'rgba(1,1,1,0.5)'
});

$fourd.camera.position.z = -35;

$fourd.make_resolve_click(function(vertex){
  if(vertex === null){
    return;
  }

  selected = vertex;
  mde.value(vertex.data.text);

  $fourd.toggle_controls('orbit', vertex);
})

var add_vertex = function(){
  var added = $fourd.graph.add_vertex({
    cube: {size: 10, color: 0x000000},
    label: {size: 12, text: '# new...'}
  })

  added.data = {text: '# new...'};
  added.uuid = uuidv4();

  $fourd.graph.add_edge(selected, added, {
    color: 0x000000
  });

  return added;
}

$fourd.make_resolve_double_click(function(vertex){
  if(vertex === null){
    return;
  }  

  var added = add_vertex();

  storeObject(vertex);
  storeObject(added);

  selected = added;
  mde.value(selected.data.text);

  $fourd.toggle_controls('orbit', added);
})

mde.codemirror.on('change', function(){
  selected.data.text = mde.value();
  storeObject(selected);
})

mde.codemirror.on('blur', function(){
  if(selected === undefined){
    return;
  }
  
  if(selected === null){
    return;
  }

  if(!rs.connected){
    return;
  }

  if(client === undefined || client === null){
    return;
  }

  selected.data.text = mde.value();
  storeObject(selected);
})

var storeObject = function(vertex){
  const content = vertex.data.text;

  var title = content.match(/^.*\n?/)[0]
  if(title){
    vertex.label.element.innerHTML = title;
  }else{
    title = 'Untitled';
  }

  var edges = Object.keys(vertex.edges).map(function(key){
    return vertex.edges[key];
  });

  if(!edges){
    edges = [];
  }

  var object = {
    'uuid': vertex.uuid,
    'title': title,
    'content': content,
    'edges': edges.filter(edge => edge != undefined).map(function(edge){
        return {
          'source': edge.source.uuid, 
          'target': edge.target.uuid
        };
      })
  };

  var path = `threedeenote/${object.uuid}`;
  client.storeObject('threedeenote', path, object);
  rs.startSync();

}

const rs = new RemoteStorage({
  cache: true,
  changeEvents: {
    local:    true,
    window:   true,
    remote:   true,
    conflict: true
  }
});


rs.access.claim('threedeenotes', 'rw');
rs.caching.enable('/threedeenotes/');
const widget = new Widget(rs);
widget.attach('widget-container');


var vertices = new Map();
var DRAWN_EDGES = new Set();

rs.on('ready', function(){
  $fourd.clear();
  client = rs.scope('/threedeenotes/');

  client.declareType('threedeenote', {
    "type": "object",
    "properties": {
      "uuid": {
        "type": "string"
      },
      "title": {
        "type": "string",
        "default": "Untitled",
      },
      "content": {
        "type": "string",
        "default": ""
      },
      "edges": {
        "type": "array",
        "default": []
      }
    },
    "required": ["uuid", "title", "content", "edges"],
  })

  client.getAll('threedeenote/', false)
  .then(objects => {
    var edge_queue = [];

    for(var path in objects){
      var data = objects[path];

      var title = data.content.match(/^.*\n?/)[0];
      if(!title){
        title = "Untitled";
      }

      var vertex = $fourd.graph.add_vertex({
        cube: {size: 10, color: 0x000000},
        label: {size: 12, text: title}
      })
      vertex.data = {text: data.content};
      vertex.uuid = data.uuid;
      vertices.set(vertex.uuid, vertex);

      for(var key in data.edges){
        if(data.edges[key]){
          edge_queue.push(data.edges[key]);
        }
      }
    }

    buildContextMenu();

    for(var edge of edge_queue){
      if(!DRAWN_EDGES.has(`${edge.source}>${edge.target}`)){
        $fourd.graph.add_edge(vertices.get(edge.source), vertices.get(edge.target), {});
        DRAWN_EDGES.add(`${edge.source}>${edge.target}`);
      }
    }

    if(!vertices.has('root')){
      var visitorAddress = rs.remote.userAddress;
      selected = $fourd.graph.add_vertex({
        cube: {size: 10, color: 0x000000},
        label: {size: 12, text: visitorAddress}
      })
      selected.data = {text: `# ${visitorAddress}`};
      selected.uuid = 'root';
      vertices.set('root', selected);
    
    }else{
      selected = vertices.get('root');
    }

    mde.value(selected.data.text);    
    $fourd.toggle_controls('orbit', selected);
  })
})

window.reset = function(){
  rs.caching.reset();
  rs.disconnect()
}

window.removeNode = function(e){
  console.error("not implemented")
}

var connected = function(source, target){
  var source_edges = Object.keys(source.edges).map(key => source.edges[key]);

  for(var edge of source_edges){
    if(edge.source === source){
      return edge;
    }

    if(edge.source === target){
      return edge;
    }

    if(edge.target === source){
      return edge;
    }

    if(edge.target === target){
      return edge;
    }
  }

  return false;
}

var buildContextMenu = function(){
  $.contextMenu({
    selector: '#canvas', 
    zIndex: 100,
    build: function($trigger, e) {

      var menuAnchor = $fourd.resolve_click(e);
      selected = menuAnchor;
      var targets = {};
      
      var uuids = vertices.keys();
      for(var uuid of uuids){
        var vertex = vertices.get(uuid);
        var title = vertex.data.text.substr(0, vertex.data.text.indexOf('\n'));

        targets[uuid] = {
          'name': `${connected(menuAnchor, vertex) ? 'Connect' : 'Disconnect'} ${title}`,
          'callback': function(){
            var edge = connected(menuAnchor, vertex);

            if(edge){
              $fourd.graph.remove_edge(edge);
              DRAWN_EDGES.delete(`${edge.source.uuid}>${edge.target.uuid}`);
            }else{
              $fourd.graph.add_edge(menuAnchor, vertex, {});
            }

            storeObject(menuAnchor);
            storeObject(vertex);
          }
        }
      }

      return {
        callback: function(key, options){

        },

        items: {
          "add": {
            'name': "Add Vertex",
            'callback': function(){
              var added = add_vertex();
              storeObject(selected);
              storeObject(added);
            }
          },
          "connect": {
            'name': "Edges",
            'items': targets
          },
          "Remove": {
            'name': "Remove",
            'callback': function(){
              if(menuAnchor.uuid == 'root'){
                console.error("No")
                return;
              }
              client.remove('threedeenote/' + menuAnchor.uuid);
              rs.startSync();
              $fourd.graph.remove_vertex(menuAnchor);
              buildContextMenu();
            }
          }
        }
      };
    }
  });
}