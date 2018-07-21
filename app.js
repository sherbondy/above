"use strict";

/*globals THREE */

var sceneModel = null;
var activeGroup = null;

// mapping from name prefix to array of elements in group...
var modelGroups = {};

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
    renderer.setSize(600, 600);

    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);

    // camera
    window.camera = new THREE.PerspectiveCamera(30, 600 / 600, 1, 10000);

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
                console.log("Child:", child.name);
                child.material = defaultMaterial;

                var namePrefix = child.name.split('_')[0];
                if (namePrefix in modelGroups){
                    modelGroups[namePrefix].push(child.id);
                } else {
                    modelGroups[namePrefix] = [child.id];
                }
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


$(function(){
   console.log("loaded");

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

       sceneModel.children.forEach(function(child) {
           if (child.isMesh) {
               if (activeGroupChildren.includes(child.id)) {
                   child.material = highlightMaterial;

                   // const center = child.geometry.boundingSphere.center;

                   childElementsList.append(
                       `<a class="list-group-item list-group-item-action group-child"
                           data-name="${child.name}">
                            ${child.id}: ${child.name}
                        </a>`
                   )


               } else {
                   child.material = defaultMaterial;
               }
           }
       });
   });
});