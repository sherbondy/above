"use strict";

/*globals THREE */

// 1 unit = 1 ft
const unitsToFt = 8;

var sceneModel = null;
var activeGroup = null;

// mapping from name prefix to array of elements in group...
var modelGroups = {};

// mapping from element id to bbox size in raw unit (need to convert to ft)...
var elementSizes = {};

// dimensions to keep for square footage measurements...
var dimensionsToKeep = {
    'Basic': {y: true, z: true},
    'Floor': {x: true, y: true},
    'Door-Passage-Single-Two': {y: true, z: true},
    'Door-Double-Flush': {y: true, z: true},
    'Fixed': {y: true, z: true},
    'Desk': {x: true, y: true},
    'Chair-Task': {x: true, y: true, z: true},
    'Table-Dining': {x: true, y: true},
    'Chair-Breuer': {x: true, y: true},
    'Compound': {x: true, y: true},
    'Door-Exterior-Double-Two': {x: true, z: true},
    'Counter': {x: true, y: true},
    'System': {y: true, z: true},
    'Rectangular': {x: true, z: true},
    // here be dragons...
    'Non-Monolithic': {x: true, y: true},
    'Stringer': {x: true, z: true},
    'Railing': {x: true, z: true},
    'Top': {x: true, z: true}
};

const defaultMaterial = new THREE.MeshPhongMaterial(
    {
        color: 0xffffff,
        specular: 0xffffff,
        shininess: 50,
        transparent: true,
        opacity: 0.5
    }
);

const highlightMaterial = new THREE.MeshPhongMaterial(
    {
        color: 0xff000,
        specular: 0xffffff,
        shininess: 50
    }
);



function addSpotLight(scene) {
    var spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 100, 1000, 100 );

    spotLight.castShadow = true;

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;
    scene.add(spotLight);
}

// simplified on three.js/examples/webgl_loader_fbx.html
function main() {
    // renderer
    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(800, 600);

    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);

    // camera
    window.camera = new THREE.PerspectiveCamera(30, 800 / 600, 1, 10000);

    const controls = new THREE.OrbitControls( camera, renderer.domElement );

    camera.position.set(0, -300, 300);
    camera.up.set(0, 0, 1);
    camera.lookAt(new THREE.Vector3(20, 20, 100));
    controls.update();

    // scene and lights
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xcccccc, 0.5));

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.75 );
    directionalLight.position.set( new THREE.Vector3(100, 1000, 100) );
    // scene.add(directionalLight);

    addSpotLight(scene);

    // debug box
    const box = new THREE.Box3();
    box.setFromCenterAndSize( new THREE.Vector3( 1, 1, 1 ), new THREE.Vector3( 2, 1, 3 ) );

    const helper = new THREE.Box3Helper( box, 0xffff00 );
    scene.add( helper );

    // load fbx model and texture
    const objs = [];
    const loader = new THREE.FBXLoader();


    loader.load("./schoolhouse.fbx", model => {
        sceneModel = model;

        var box = new THREE.Box3().setFromObject( model );
        box.center( model.position ); // this re-sets the mesh position
        model.position.multiplyScalar( - 1 );

        directionalLight.target = model;

        const modelChildrenList = $("#model-groups");

        model.children.forEach(function(child){
            if (child.isMesh) {
                // console.log("Child:", child.name);
                child.material = defaultMaterial;

                var namePrefix = child.name.split('_')[0];
                if (namePrefix in modelGroups){
                    modelGroups[namePrefix].push(child.id);
                } else {
                    modelGroups[namePrefix] = [child.id];
                }

                const bbox = new THREE.Box3().setFromObject(child);
                elementSizes[child.id] = bbox.getSize();
            }
        });

        for (const groupName in modelGroups) {
            modelChildrenList.append(
                `<a class="list-group-item list-group-item-action model-group"
                        data-name="${groupName}">
                        ${groupName}
                    </a>`
            );
        }

        scene.add(model);
        objs.push(model);

    });

    // animation rendering
    const clock = new THREE.Clock();

    (function animate() {
        controls.update();

        renderer.render(scene, camera);

        requestAnimationFrame(animate);
    })();

    return objs;
}

const objs = main();


// pull room colors from palette...

function coordFloat(coord){
    return parseFloat(coord.childNodes[0].nodeValue);
}


$(function(){
   console.log("loaded");

    var colores_g = [
        "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00",
        "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707",
        "#651067", "#329262", "#5574a6", "#3b3eac"
    ];

    $.get("./schoolhouse.xml", function(response){
       console.log("loaded schoolhouse gbxml file: ", response);
       // Building -> Space -> Shell Geometry -> Closed Shell to three geometry with faces...
       window.buildingSpec = response;
       var campus = window.buildingSpec.getElementsByTagName("Campus")[0];
       var building = campus.getElementsByTagName("Building")[0];
       var spaces = building.getElementsByTagName("Space");

       for (var i = 0; i < spaces.length; i+=1) {
           const space = spaces[i];
           const spaceNameNode = space.getElementsByTagName("Name")[0];
           const spaceName = spaceNameNode.childNodes[0];

           const geometry = space.getElementsByTagName("ShellGeometry")[0];
           const shell = geometry.getElementsByTagName("ClosedShell")[0];
           const polyLoops = shell.getElementsByTagName("PolyLoop");

           var threeGeometry = new THREE.Geometry();

           var vertexCount = 0;

           for (var j = 0; j < polyLoops.length; j+=1) {
               const points = polyLoops[j].getElementsByTagName("CartesianPoint");

               const startingVertex = vertexCount;

               for (var k = 0; k < points.length; k+=1) {
                   console.log(points.length);
                   const coords = points[k].getElementsByTagName("Coordinate");
                   const x = coordFloat(coords[0]);
                   const y = coordFloat(coords[1]);
                   const z = coordFloat(coords[2]);
                   const point = new THREE.Vector3(x, y, z);

                   threeGeometry.vertices.push(point);
                   vertexCount += 1;
               }

               // (A, B, C), (A, C, D)
               
               const faceA = new THREE.Face3(vertexCount - 4, vertexCount - 3, vertexCount - 2);
               const faceB = new THREE.Face3(vertexCount - 4, vertexCount - 2, vertexCount - 1);

               threeGeometry.faces.push(faceA);
               threeGeometry.faces.push(faceB);
           }

           threeGeometry.computeFaceNormals();
           threeGeometry.computeVertexNormals();

           const colorStr = colores_g[i % colores_g.length];
           const threeColor = new THREE.Color(colorStr);

           const spaceMaterial = new THREE.MeshStandardMaterial( { color : threeColor } );
           const spaceMesh = new THREE.Mesh(threeGeometry, spaceMaterial);
           sceneModel.add(spaceMesh);
       }
   });


   $("#model-groups").on('click', '.model-group', function(e){
       const groupName = $(this).data('name');
       console.log("clicked group", groupName);

       $('.model-group').removeClass('active');

       var activeGroupChildren = [];

       if (activeGroup == groupName) {
           activeGroup = null;
       } else {
           activeGroup = groupName;
           $(this).addClass('active');

           activeGroupChildren = modelGroups[activeGroup];
       }

       var childElementsList = $("#child-elements");

       childElementsList.html("");

       var totalSize = new THREE.Vector3(0,0,0);
       var totalSquareFootage = 0;

       var subgroupTotals = {};

       sceneModel.children.forEach(function(child) {
           if (child.isMesh) {
               if (activeGroupChildren.includes(child.id)) {
                   child.material = highlightMaterial;

                   // const center = child.geometry.boundingSphere.center;

                   var splitName = child.name.split('_');
                   var nameWithoutID = splitName.slice(0, -1);
                   var subgroupName = nameWithoutID.join('_');


                   var childSize = elementSizes[child.id];

                   var squareFootage = 1;
                   var areaDimensions = dimensionsToKeep[activeGroup];
                   for (const dimension in areaDimensions) {
                       squareFootage *= childSize[dimension];
                   }


                   if (subgroupName in subgroupTotals) {
                       subgroupTotals[subgroupName]['count'] += 1;
                       subgroupTotals[subgroupName]['totalSquareFootage'] += squareFootage;
                   } else {
                       subgroupTotals[subgroupName] = {
                           'count': 1,
                           'totalSquareFootage': squareFootage
                       }
                   }


                   var squareFootageNice = parseInt(squareFootage);

                   childElementsList.append(
                       `<a class="list-group-item list-group-item-action group-child"
                           data-name="${child.name}">
                            ${child.id}: ${child.name} ( ${squareFootageNice} ft^2 )
                        </a>`
                   );

                   totalSize.add(childSize);

                   totalSquareFootage += squareFootage;

               } else {
                   child.material = defaultMaterial;
               }
           }
       });

       // note that for things like floor, sum x * sum y will not map directly to sum of square footage...

       $("#cost-summary").html("");

       for (const subgroupName in subgroupTotals) {
           const totals = subgroupTotals[subgroupName];
           const niceSquareFootage = parseInt(totals.totalSquareFootage);

           $("#cost-summary").append(
               `<div class="card">
                    <div class="card-body">
                        <h4 class="card-title">${subgroupName} Total Measurements</h4>
                        
                        <p><strong>Count</strong>: ${totals.count}</p>
                        <p><strong>Square Footage Total</strong>: ${niceSquareFootage} ft^2</p>
                    </div>
                </div>`
           );
       }
   });
});