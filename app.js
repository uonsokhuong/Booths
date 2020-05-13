
function createObject3D( x, y, z, rx, ry, rz, sx, sy, sz ) {

	var object = new THREE.Object3D();

	object.position.set( x, y, z );
	object.rotation.set( rx, ry, rz );
	object.scale.set( sx, sy, sz );

	return object;

} 

function BoothApp() {

	this.renderer = new THREE.WebGLRenderer( {
		antialias: true,
		alpha: true
	} );

	this.renderer.setSize( window.innerWidth, window.innerHeight );
	this.renderer.setPixelRatio( window.devicePixelRatio );

	document.body.appendChild( this.renderer.domElement );

	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );

	this.pointLight = new THREE.PointLight( '#fff', 0.5 );
	this.ambientLight = new THREE.AmbientLight( '#fff', 0.5 );

	this.camera.add( this.pointLight );
	this.scene.add( this.ambientLight, this.camera );

	// for camera movement
	this.mouseMovement = new THREE.Vector2();
	this.movement = new THREE.Vector3();
	this.keys = {};

	this.aisles = [];
	this.booths = [];
	this.boundingBoxes = [];
	this.raycaster = new THREE.Raycaster();

	this.cubeTextureLoader = new THREE.CubeTextureLoader();
	
	this.cubeTextureLoader.setPath( './SaintLazarusChurch/' );
	var urls = [ 'posx', 'negx', 'posy', 'negy', 'posz', 'negz' ];
	var envMap = this.cubeTextureLoader.load( urls.map( x => x + '.jpg' ) );

	this.cubeTextureLoader.setPath( './cloudy/bluecloud_' );
 	urls = [ 'rt', 'lf', 'up', 'dn', 'bk', 'ft' ];
 	this.scene.background = this.cubeTextureLoader.load( urls.map( x => x + '.jpg' ) );

	this.gltfLoader = new THREE.GLTFLoader();

	var scope = this;

	this.gltfLoader.load( './scenes/booth.glb', function ( gltf ) {

		var scene = gltf.scene || gltf.scenes[ 0 ];
		scope.gltfBoothScene = scene;

		scene.traverse( function ( child ) {

			if ( child.isMesh ) {

				if ( child.geometry.isBufferGeometry ) {
					child.geometry = new THREE.Geometry().fromBufferGeometry( child.geometry );
				}
				child.geometry.mergeVertices();
				// child.material.emissive = new THREE.Color( '#666600' );
				child.material.envMap = envMap;

			}

		} );

		var box = new THREE.Box3().setFromObject( scene );
		var size = box.getSize( new THREE.Vector3() );

		scope.camera.position.y = size.y * 0.25;

		var x = size.x + 1;
		var z = 1;
		
		var X = 2;
		var Z = 3;

		var marginX = 5;
		var marginZ = 10;

		var aisleLayout = new THREE.Group();
		
		aisleLayout.add( createObject3D( -x * 1.5, 0, 0, 0, -Math.PI / 2, 0, 2, 1, 1 ) );
		aisleLayout.add( createObject3D( -x, 0, -z, 0, Math.PI, 0, 1, 1, 1 ) );
		aisleLayout.add( createObject3D( -x, 0, z, 0, 0, 0, 1, 1, 1 ) );
		aisleLayout.add( createObject3D( 0, 0, -z, 0, Math.PI, 0, 1, 1, 1 ) );
		aisleLayout.add( createObject3D( 0, 0, z, 0, 0, 0, 1, 1, 1 ) );
		aisleLayout.add( createObject3D( x, 0, -z, 0, Math.PI, 0, 1, 1, 1 ) );
		aisleLayout.add( createObject3D( x, 0, z, 0, 0, 0, 1, 1, 1 ) );

		for ( var z = 0; z < Z; z ++ ) {

			for ( var x = 0; x < X; x ++ ) {

				var aisle = aisleLayout.clone();

				aisle.children[ 0 ].add( scope.createBooth() );
				aisle.children[ 1 ].add( scope.createBooth() );
				aisle.children[ 2 ].add( scope.createBooth() );
				aisle.children[ 3 ].add( scope.createBooth() );
				aisle.children[ 4 ].add( scope.createBooth() );
				aisle.children[ 5 ].add( scope.createBooth() );
				aisle.children[ 6 ].add( scope.createBooth() );

				scope.scene.add( aisle );

				box = new THREE.Box3().setFromObject( aisle );
				size = box.getSize( size );

				aisle.rotation.y = ( x % 2 ) * Math.PI;

				aisle.position.x = ( - X / 2 + x ) * ( size.x + marginX );
				aisle.position.z = ( - Z / 2 + z ) * ( size.z + marginZ );

				scope.aisles.push( aisle );

			}

		}

	} );

	this.initializeGUI();

}

Object.assign( BoothApp.prototype, {

	createBooth: function( x, y, z ) {

		if ( ! this.gltfBoothScene ) return;

		var object = new THREE.Object3D();

		// object.position.set( x, y, z );

		object.add( this.gltfBoothScene.clone() );

		object.userData = { icons: [] };

		var index = this.booths.length;

		object.traverse( function ( child ) {

			if ( child.name.indexOf( 'Ico' ) > -1 ) {
				
				object.userData.icons.push( child );
				
				child.userData = {};
				child.userData.initialPosition = child.position.clone();
				
				child.userData.onClick = function() {

					alert( 'booth #' + index + '\'s ' + child.name + ' was clicked!' );

				}

				child.rotation.z = Math.random() * 6.28;

			}

		} );

		this.booths.push( object );

		return object;

	},

	initializeGUI: function() {

		var scope = this;

		var raycaster = new THREE.Raycaster();

		var mouse = new THREE.Vector2();

		var pointStart = new THREE.Vector2();
		var pointEnd = new THREE.Vector2();

		var isLeftMouseBtnDown = false;

		this.renderer.domElement.style.cursor = 'grab';

		var hoveredIcon = null;

		function onMouseMove( event ) {

			mouse.set( 2.0 * event.clientX / window.innerWidth - 1.0, -2.0 * event.clientY / window.innerHeight + 1.0 );

			if ( isLeftMouseBtnDown ) {
			
				pointEnd.copy( mouse );

				var diff = pointEnd.clone().sub( pointStart );
				scope.mouseMovement.add( diff );

				pointStart.copy( pointEnd );

			}

			return;

			raycaster.setFromCamera( mouse, scope.camera );

			var zero = new THREE.Vector3();

			scope.booths.forEach( function ( booth ) {

				if ( booth.localToWorld( zero ).distanceTo( scope.camera.position ) < 10.0 ) {

					var intersects = raycaster.intersectObjects( booth.userData.icons, true )[ 0 ];

					if ( intersects ) {

						hoveredIcon = intersects.object;
						setMouseCursorStyle( 'pointer' );

					} else {

						hoveredIcon = null;
						setMouseCursorStyle( 'grab' );

					}

				}

			} );

		}

		function setMouseCursorStyle( style ) {

			scope.renderer.domElement.style.cursor = style;

		}

		window.addEventListener( 'mousemove', onMouseMove, false );

		window.addEventListener( 'mousedown', function ( event ) {

			onMouseMove( event );

			if ( event.button === 0 ) {
			
				isLeftMouseBtnDown = true;

				pointStart.copy( mouse );
				pointEnd.copy( mouse );

				if ( hoveredIcon ) {

					hoveredIcon.userData.onClick();
					isLeftMouseBtnDown = false;

				}
			
			}

			raycaster.setFromCamera( mouse, scope.camera );

		}, false );

		window.addEventListener( 'mouseup', function ( event ) {

			if ( event.button === 0 ) {

				isLeftMouseBtnDown = false;

			}

		}, false );

		window.addEventListener( 'resize', function () {
			
			scope.renderer.setSize( window.innerWidth, window.innerHeight );
			scope.renderer.render( scope.scene, scope.camera );
			scope.camera.aspect = window.innerWidth / window.innerHeight;
			scope.camera.updateProjectionMatrix();

		} );

		window.addEventListener( 'keydown', function ( event ) {
			
			scope.keys[ event.keyCode ] = true;

		}, false );

		window.addEventListener( 'keyup', function ( event ) {
			
			delete scope.keys[ event.keyCode ];

		}, false );


	},

	animate: function() {

		this.camera.rotation.y -= this.mouseMovement.x * 0.2;
		this.mouseMovement.x *= 0.95;

		var speed = 0.1;

		if ( this.keys[ 37 ] || this.keys[ 65 ] ) this.movement.x -= speed;
		else if ( this.keys[ 39 ] || this.keys[ 68 ] ) this.movement.x += speed;

		if ( this.keys[ 38 ] || this.keys[ 87 ] ) this.movement.z -= speed;
		else if ( this.keys[ 40 ] || this.keys[ 83 ] ) this.movement.z += speed;

		this.camera.translateX( this.movement.x * 0.04 );
		this.camera.translateZ( this.movement.z * 0.04 );

		this.movement.x *= 0.95;
		this.movement.z *= 0.95;

		var scope = this;

		var zero = new THREE.Vector3();

		for ( var i = 0; i < this.booths.length; i ++ ) {

			this.booths[ i ].userData.icons.forEach( function ( icon ) {

				if ( icon.localToWorld( zero ).distanceTo( scope.camera.position ) > 10.0 ) icon.visible = false;
				else icon.visible = true;

				icon.rotation.z += 0.05;

				var amount = Math.abs( Math.sin( icon.rotation.z * 0.5 ) );
				icon.position.z = icon.userData.initialPosition.z - amount * 0.07;
				icon.scale.y = icon.scale.x = icon.scale.z = amount * 0.01 + 0.1;

			} );

		}

		this.renderer.render( this.scene, this.camera );

		if ( !this.__animate ) this.__animate = this.animate.bind( this );

		window.requestAnimationFrame( this.__animate );

	}

} );