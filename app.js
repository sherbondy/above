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

var subgroupTotals = {};

var groupCosts = {};

// dimensions to keep for square footage measurements...
var dimensionsToKeep = {
    'Basic': {y: true, z: true},
    'Floor': {x: true, y: true},
    'Door-Passage-Single-Two': {y: true, z: true, unit: true},
    'Door-Double-Flush': {y: true, z: true, unit: true},
    'Fixed': {y: true, z: true, unit: true},
    'Desk': {x: true, y: true, unit: true},
    'Chair-Task': {x: true, y: true, z: true, unit: true},
    'Table-Dining': {x: true, y: true, unit: true},
    'Chair-Breuer': {x: true, y: true, unit: true},
    'Compound': {x: true, y: true},
    'Door-Exterior-Double-Two': {x: true, z: true, unit: true},
    'Counter': {x: true, y: true, unit: true},
    'System': {y: true, z: true},
    'Rectangular': {x: true, z: true},
    // here be dragons...
    'Non-Monolithic': {x: true, y: true},
    'Stringer': {x: true, z: true},
    'Railing': {x: true, z: true},
    'Top': {x: true, z: true}
};

var CEILING_OPTIONS = [{'Drywall': 23}, {'ACT': 50}];
var EXTERIOR_OPTIONS = [{'Masonry Veneer': 240}, {'Fiber Cement': 180}];
var WALL_OPTIONS = [{'GYP Paint': 20}, {'Wall Covering': 30}];
var ROOF_OPTIONS = [{'Acoustic Deck Assembly': 50}];
var WINDOW_OPTIONS = [{'Double Glazed': 100}, {'Triple Glazed': 150}];
var DOOR_OPTIONS = [{'Solid Fill Acoustic': 250}, {'HMF Aluminum': 300}];
var CHAIR_OPTIONS = [{'IKEA Armchair': 80}];
var TABLE_OPTIONS = [{'IKEA Table': 120}];
var DESK_OPTIONS = [{'IKEA Desk': 80}];
var GLAZING_OPTIONS = [{'Glazing Option 1': 80}, {'Glazing Option 2': 100}];
var MULLION_OPTIONS = [{'Mullion': 2}];
var COUNTER_OPTIONS = [{'Wood Counter Top': 100}];
var FLOOR_OPTIONS = [{'VCT': 20}, {'Terrazzo': 50}];

var EMPTY_MATERIAL_OPTIONS = [{'Default': 0}];

var materialOptions = {
    'Basic_Wall_Exterior_-_Dark_Brick_on_CMU': EXTERIOR_OPTIONS,
    'Basic_Roof_Generic_-_12"': ROOF_OPTIONS,
    'Basic_Wall_Interior_-_5_12"_Partition_(1-hr)': WALL_OPTIONS,
    'Basic_Wall_Interior_-_6_18"_Partition_(2-hr)': WALL_OPTIONS,
    'Basic_Wall_Interior_-_5"_Partition_(2-hr)': WALL_OPTIONS,
    'Floor_Generic_-_12"': FLOOR_OPTIONS,
    "Compound_Ceiling_2'_x_4'_ACT_System": CEILING_OPTIONS,
    "Compound_Ceiling_1'_x_4'_ACT_Ceiling": CEILING_OPTIONS,
    "Compound_Ceiling_2'_x_2'_ACT_System": CEILING_OPTIONS,
    "Compound_Ceiling_GWB_on_Mtl_Stud": CEILING_OPTIONS,
    "System_Panel_Glazed": GLAZING_OPTIONS,
    'Rectangular_Mullion_25"_x_5"_rectangular': MULLION_OPTIONS,
    // per unit...
    'Door-Passage-Single-Two_Lite_Narrow_42"_x_94"': DOOR_OPTIONS,
    'Door-Double-Flush_Panel_40"_x_84"': DOOR_OPTIONS,
    'Fixed_36"_x_96"': WINDOW_OPTIONS,
    'Desk_72"_x_36"': DESK_OPTIONS,
    'Chair-Task_Arms_Chair-Task_Arms': CHAIR_OPTIONS,
    'Table-Dining_Round_w_Chairs_36"_Diameter': TABLE_OPTIONS,
    'Chair-Breuer_Chair-Breuer': CHAIR_OPTIONS,
    'Door-Exterior-Double-Two_Lite_96"_x_84"': DOOR_OPTIONS,
    'Counter_Top_24"_Depth': COUNTER_OPTIONS,
    'Door-Double-Flush_Panel_68"_x_84"': DOOR_OPTIONS
};

// index of selected material for component
var materialSelections = {
    'Basic_Wall_Exterior_-_Dark_Brick_on_CMU': 0,
    'Basic_Roof_Generic_-_12"': 0,
    'Basic_Wall_Interior_-_5_12"_Partition_(1-hr)': 0,
    'Basic_Wall_Interior_-_6_18"_Partition_(2-hr)': 0,
    'Basic_Wall_Interior_-_5"_Partition_(2-hr)': 0,
    'Floor_Generic_-_12"': 0,
    "Compound_Ceiling_2'_x_4'_ACT_System": 0,
    "Compound_Ceiling_1'_x_4'_ACT_Ceiling": 0,
    "Compound_Ceiling_2'_x_2'_ACT_System": 0,
    "Compound_Ceiling_GWB_on_Mtl_Stud": 0,
    "System_Panel_Glazed": 0,
    'Rectangular_Mullion_25"_x_5"_rectangular': 0,
    // per unit...
    'Door-Passage-Single-Two_Lite_Narrow_42"_x_94"': 0,
    'Door-Double-Flush_Panel_40"_x_84"': 0,
    'Fixed_36"_x_96"': 0,
    'Desk_72"_x_36"': 0,
    'Chair-Task_Arms_Chair-Task_Arms': 0,
    'Table-Dining_Round_w_Chairs_36"_Diameter': 0,
    'Chair-Breuer_Chair-Breuer': 0,
    'Door-Exterior-Double-Two_Lite_96"_x_84"': 0,
    'Counter_Top_24"_Depth': 0,
    'Door-Double-Flush_Panel_68"_x_84"': 0
};


var materialCosts = {
    // sq ft...
    'Basic_Wall_Exterior_-_Dark_Brick_on_CMU': 80,
    'Basic_Roof_Generic_-_12"': 10,
    'Basic_Wall_Interior_-_5_12"_Partition_(1-hr)': 26,
    'Basic_Wall_Interior_-_6_18"_Partition_(2-hr)': 26,
    'Basic_Wall_Interior_-_5"_Partition_(2-hr)': 26,
    'Floor_Generic_-_12"': 20,
    "Compound_Ceiling_2'_x_4'_ACT_System": 23,
    "Compound_Ceiling_1'_x_4'_ACT_Ceiling": 23,
    "Compound_Ceiling_2'_x_2'_ACT_System": 23,
    "Compound_Ceiling_GWB_on_Mtl_Stud": 23,
    "System_Panel_Glazed": 80,
    'Rectangular_Mullion_25"_x_5"_rectangular ': 2,
    // per unit...
    'Door-Passage-Single-Two_Lite_Narrow_42"_x_94"': 100,
    'Door-Double-Flush_Panel_40"_x_84"': 100,
    'Fixed_36"_x_96"': 100,
    'Desk_72"_x_36"': 80,
    'Chair-Task_Arms_Chair-Task_Arms': 80,
    'Table-Dining_Round_w_Chairs_36"_Diameter': 120,
    'Chair-Breuer_Chair-Breuer': 40,
    'Door-Exterior-Double-Two_Lite_96"_x_84"': 200,
    'Counter_Top_24"_Depth': 100,
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


function recalculateCosts(){
    groupCosts = {};

    for (const subgroupName in subgroupTotals) {
        const namePrefix = subgroupName.split('_')[0];
        const selectedMaterialIndex = materialSelections[subgroupName] || 0;

        const subgroupMaterialOptions = materialOptions[subgroupName] || EMPTY_MATERIAL_OPTIONS;
        const baseCostMap = subgroupMaterialOptions[selectedMaterialIndex];
        const baseCost = Object.values(baseCostMap)[0] || 0;

        console.log(subgroupName, selectedMaterialIndex, baseCost);

        const useUnitCost = dimensionsToKeep[namePrefix]["unit"] === true;
        var cost = 0;

        if (useUnitCost) {
            cost = subgroupTotals[subgroupName]['count'] * baseCost;
        } else {
            cost = subgroupTotals[subgroupName]['totalSquareFootage'] * baseCost;
        }

        subgroupTotals[subgroupName]['cost'] = cost;

        if (namePrefix in groupCosts) {
            groupCosts[namePrefix] += cost;
        } else {
            groupCosts[namePrefix] = cost;
        }
    }
}

function renderGroupsList(){
    const modelChildrenList = $("#model-groups");

    modelChildrenList.html("");

    for (const groupName in modelGroups) {
        const groupCost = groupCosts[groupName];

        modelChildrenList.append(
            `<a class="list-group-item list-group-item-action model-group"
                        data-name="${groupName}">
                ${groupName}: $${groupCost}
            </a>`
        );
    }
}


// pull room colors from palette...

function coordFloat(coord){
    return parseFloat(coord.childNodes[0].nodeValue);
}


function getSubgroupName(child) {
    const splitName = child.name.split('_');
    const nameWithoutID = splitName.slice(0, -1);
    return nameWithoutID.join('_');
}

function getSquareFootage(group, childSize) {
    var squareFootage = 1;
    const areaDimensions = dimensionsToKeep[group];

    for (const dimension in areaDimensions) {
        if (["x", "y", "z"].includes(dimension)) {
            squareFootage *= childSize[dimension];
        }
    }
    return squareFootage;
}

function renderSubgroupTotals(activeSubgroups){
    $("#cost-summary").html("");

    for (const subgroupName in activeSubgroups) {
        const totals = subgroupTotals[subgroupName];
        const niceSquareFootage = parseInt(totals.totalSquareFootage);
        const totalCost = parseInt(totals.cost);

        const subgroupMaterialOptions = materialOptions[subgroupName] || EMPTY_MATERIAL_OPTIONS;

        var subgroupSelect = `<select class="material-selector" data-subgroup='${subgroupName}'>`;
        for (var i = 0; i < subgroupMaterialOptions.length; i+=1) {
            const baseCostMap = subgroupMaterialOptions[i];
            const materialName = Object.keys(baseCostMap)[0] || 'Default (Cost Unspecified)';
            const baseCost = Object.values(baseCostMap)[0] || 0;

            const selectedMaterialIndex = materialSelections[subgroupName] || 0;

            const selectedText = (i == selectedMaterialIndex) ? "selected" : "";

            subgroupSelect += `<option value="${i}" ${selectedText}>${materialName}: $${baseCost}</option>`;
        }
        subgroupSelect += '</select>';

        $("#cost-summary").append(
            `<div class="card">
                    <div class="card-body">
                        <h4 class="card-title">${subgroupName} Total Measurements</h4>
                        ${subgroupSelect}
                        <p><strong>Total Cost</strong>: $${totalCost}</p>
                        <p><strong>Count</strong>: ${totals.count}</p>
                        <p><strong>Square Footage Total</strong>: ${niceSquareFootage} ft^2</p>
                    </div>
                </div>`
        );
    }
}


$(function(){
    console.log("loaded dom");


// simplified on three.js/examples/webgl_loader_fbx.html
    window.main = function() {
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


                    const subgroupName = getSubgroupName(child);

                    let childSize = elementSizes[child.id];
                    let squareFootage = getSquareFootage(namePrefix, childSize);

                    if (subgroupName in subgroupTotals) {
                        subgroupTotals[subgroupName]['count'] += 1;
                        subgroupTotals[subgroupName]['totalSquareFootage'] += squareFootage;
                    } else {
                        subgroupTotals[subgroupName] = {
                            'count': 1,
                            'totalSquareFootage': squareFootage,
                            'cost': 0
                        }
                    }
                }
            });

            scene.add(model);
            objs.push(model);


            recalculateCosts();
            renderGroupsList();
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



    // now xml model...



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

               // @TODO: fix for closed shells with faces made of something other than than 4 points...
               for (var k = 0; k < points.length; k+=1) {
                   // console.log(points.length);
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

       var activeSubgroups = {};

       sceneModel.children.forEach(function(child) {
           if (child.isMesh) {
               if (activeGroupChildren.includes(child.id)) {
                   child.material = highlightMaterial;

                   // const center = child.geometry.boundingSphere.center;
                   const subgroupName = getSubgroupName(child);

                   activeSubgroups[subgroupName] = true;

                   let childSize = elementSizes[child.id];
                   let squareFootage = getSquareFootage(activeGroup, childSize);
                   var squareFootageNice = parseInt(squareFootage);

                   childElementsList.append(
                       `<a class="list-group-item list-group-item-action group-child"
                           data-name="${child.name}">
                            ${child.id}: ${child.name} ( ${squareFootageNice} ft^2 )
                        </a>`
                   );

               } else {
                   child.material = defaultMaterial;
               }
           }
       });

       // note that for things like floor, sum x * sum y will not map directly to sum of square footage...

       renderSubgroupTotals(activeSubgroups);



       $('#cost-summary').on('change', '.material-selector', function(e){
           const subgroupName = $(this).data('subgroup');
           const materialIndexStr = $( this ).val();

           var materialIndex = 0;
           try {
               materialIndex = parseInt(materialIndexStr);
           } catch(error) {
               console.log(error);
           }

           console.log('selected material: ', materialIndexStr);

           materialSelections[subgroupName] = materialIndex;

           recalculateCosts();
           renderGroupsList();
           renderSubgroupTotals(activeSubgroups);
       });
   });
});