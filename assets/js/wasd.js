function isEmptyObject(keys) {
    var key;
    for (key in keys) {
      return false;
    }
    return true;
  }
function isEditableKeyTarget(target) {
    if (!target) { return false; }
    var tagName = target.tagName ? target.tagName.toUpperCase() : '';
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }
function isWalkModeActive() {
    var scene = document.querySelector('a-scene');
    var orbit = scene && scene.components ? scene.components['viewer-orbit'] : null;
    return !orbit || orbit.data.enabled === false;
  }
function shouldCaptureKeyEvent(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) { return false; }
    if (isEditableKeyTarget(event.target)) { return false; }
    return isWalkModeActive();
  };

  // KEYCOD_TO_CODE 값 어디서 가져온거지?
var KEYCODE_TO_CODE = {
    '38': 'ArrowUp',
    '37': 'ArrowLeft',
    '40': 'ArrowDown',
    '39': 'ArrowRight',
    '87': 'KeyW',
    '65': 'KeyA',
    '83': 'KeyS',
    '68': 'KeyD'
};
var KEYS = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown',
    'KeyE', 'KeyQ'
  ];
var CLAMP_VELOCITY = 0.00001;
var MAX_DELTA = 0.2;
AFRAME.registerComponent( 'new-wasd-controls', {
      schema: {
        acceleration: {
          default: 65
        },
        adAxis: {
          default: 'x',
          oneOf: ['x', 'y', 'z']
        },
        adEnabled: {
          default: true
        },
        adInverted: {
          default: false
        },
        enabled: {
          default: true
        },
        fly: {
          default: false
        },
        wsAxis: {
          default: 'z',
          oneOf: ['x', 'y', 'z']
        },
        wsEnabled: {
          default: true
        },
        wsInverted: {
          default: false
        },
        // navmesh 추가됨
        navmesh: {
            default: ''
        },
      },
      init: function () {
        // To keep track of the pressed keys.
        this.keys = {};
        this.easing = 1.1;
        this.velocity = new THREE.Vector3();
        this.yVelocity = 0;
    
        // Bind methods and add event listeners.
        this.onBlur = this.onBlur.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onKeyDown = this.onKeyDown.bind( this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onVisibilityChange = this.onVisibilityChange.bind( this);
        this.attachVisibilityEventListeners();
      },
      tick: function (time, delta) {
        var data = this.data;
        var el = this.el;
        // 아래 코드가 없으면 계속 wasd-controls.js를 가져다 씀
        let wasd_comp = el.components["wasd-controls"];
        if(wasd_comp !=null){
            el.removeComponent("wasd-controls");
        } 

        var velocity = this.velocity;
        if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !this.yVelocity && isEmptyObject(this.keys)) {
          return;
        }
    
        // Update velocity.
        delta = delta / 1000;
        this.updateVelocity(delta);
        if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !this.yVelocity) { return; }
    
        // 아래 results = []; 부터 return;까지 추가한 코드 

        const results = [];
        const tempVec = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();

        let cur_position  = el.object3D.position.clone();
        let next_position = cur_position.clone();
        next_position.add(this.getMovementVector(delta));

        tempVec.subVectors(next_position, cur_position); 
        let dist0 = tempVec.length(); 
        raycaster.set(cur_position, tempVec); 
        raycaster.intersectObjects(this.objects, true, results); 
  
        if (results.length) { 
          for (const result of results) { 
            if(result.distance > dist0) 
              continue;
              
            let exp_id   = ifcLoader.ifcManager.getExpressId(result.object.geometry, result.faceIndex);
            let modelid = window.getActiveModelId?.();
            let ifc_type = modelid == null ? null : ifcLoader.ifcManager.getIfcType(modelid, exp_id);
  
            if(ifc_type !=null){
              ifc_type = ifc_type.toUpperCase();  
            }
  
            if(ifc_type =="IFCWALL" ||
            ifc_type =="IFCWALLSTANDARDCASE"||
            ifc_type =="IFCCOLUMN"||
            ifc_type =="IFCWINDOW" ||
            ifc_type =="IFCCURTAINWALL"||
            ifc_type == "IFCFURNISHINGELEMENT"
            ){
              results.splice(0);
               return;
            }
          }
        }
        // Get movement vector and translate position.
        el.object3D.position.add(this.getMovementVector(delta));
        // Apply vertical (E/Q) movement directly on Y
        if (this.yVelocity) {
          el.object3D.position.y += this.yVelocity * delta;
        }
        if (window.updateWalkerFloorStatus) {
          window.updateWalkerFloorStatus();
        }
      },
      update: function (oldData) {
        // Reset velocity if axis have changed.
        if (oldData.adAxis !== this.data.adAxis) {
          this.velocity[oldData.adAxis] = 0;
        }
        if (oldData.wsAxis !== this.data.wsAxis) {
          this.velocity[oldData.wsAxis] = 0;
        }
        // 이부분도 추가됨
        const els = Array.from(document.querySelectorAll(this.data.navmesh));
        if (els === null) {
          console.warn('simple-navmesh-constraint: Did not match any elements');
          this.objects = [];
        } else {
          this.objects = els.map(el => el.object3D);
        }
      },
      remove: function () {
        this.removeKeyEventListeners();
        this.removeVisibilityEventListeners();
      },
      play: function () {
        this.attachKeyEventListeners();
      },
      pause: function () {
        this.keys = {};
        this.removeKeyEventListeners();
      },
      updateVelocity: function (delta) {
        var acceleration;
        var adAxis;
        var adSign;
        var data = this.data;
        var keys = this.keys;
        var velocity = this.velocity;
        var wsAxis;
        var wsSign;
        adAxis = data.adAxis;
        wsAxis = data.wsAxis;
    
        // If FPS too low, reset velocity.
        if (delta > MAX_DELTA) {
          velocity[adAxis] = 0;
          velocity[wsAxis] = 0;
          return;
        }
    
        // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
        var scaledEasing = Math.pow(1 / this.easing, delta * 60);
        // Velocity Easing.
        if (velocity[adAxis] !== 0) {
          velocity[adAxis] = velocity[adAxis] * scaledEasing;
        }
        if (velocity[wsAxis] !== 0) {
          velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
        }
    
        // Clamp velocity easing.
        if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) {
          velocity[adAxis] = 0;
        }
        if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) {
          velocity[wsAxis] = 0;
        }
        if (!data.enabled) {
          return;
        }
    
        // Update velocity using keys pressed.
        acceleration = data.acceleration;
        if (data.adEnabled) {
          adSign = data.adInverted ? -1 : 1;
          if (keys.KeyA || keys.ArrowLeft) {
            velocity[adAxis] -= adSign * acceleration * delta;
          }
          if (keys.KeyD || keys.ArrowRight) {
            velocity[adAxis] += adSign * acceleration * delta;
          }
        }
        if (data.wsEnabled) {
          wsSign = data.wsInverted ? -1 : 1;
          if (keys.KeyW || keys.ArrowUp) {
            velocity[wsAxis] -= wsSign * acceleration * delta;
          }
          if (keys.KeyS || keys.ArrowDown) {
            velocity[wsAxis] += wsSign * acceleration * delta;
          }
        }
        // E = move up, Q = move down
        var scaledEasingY = Math.pow(1 / this.easing, delta * 60);
        this.yVelocity *= scaledEasingY;
        if (Math.abs(this.yVelocity) < CLAMP_VELOCITY) { this.yVelocity = 0; }
        if (keys.KeyE) { this.yVelocity += acceleration * delta; }
        if (keys.KeyQ) { this.yVelocity -= acceleration * delta; }
      },
      getMovementVector: function () {
        var directionVector = new THREE.Vector3(0, 0, 0);
        var rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        return function (delta) {
          var rotation = this.el.getAttribute('rotation');
          var velocity = this.velocity;
          var xRotation;
          directionVector.copy(velocity);
          directionVector.multiplyScalar(delta);
    
          // Absolute.
          if (!rotation) {
            return directionVector;
          }
          xRotation = this.data.fly ? rotation.x : 0;
    
          // Transform direction relative to heading.
          rotationEuler.set(THREE.MathUtils.degToRad(xRotation), THREE.MathUtils.degToRad(rotation.y), 0);
          directionVector.applyEuler(rotationEuler);
          return directionVector;
        };
      }(),
      attachVisibilityEventListeners: function () {
        window.oncontextmenu = this.onContextMenu;
        window.addEventListener('blur', this.onBlur);
        window.addEventListener('focus', this.onFocus);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
      },
      removeVisibilityEventListeners: function () {
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('focus', this.onFocus);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
      },
      attachKeyEventListeners: function () {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
      },
      removeKeyEventListeners: function () {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
      },
      onContextMenu: function () {
        var keys = Object.keys(this.keys);
        for (var i = 0; i < keys.length; i++) {
          delete this.keys[keys[i]];
        }
      },
      onBlur: function () {
        this.pause();
      },
      onFocus: function () {
        this.play();
      },
      onVisibilityChange: function () {
        if (document.hidden) {
          this.onBlur();
        } else {
          this.onFocus();
        }
      },
      onKeyDown: function (event) {
        var code;
        if (!shouldCaptureKeyEvent(event)) {
          return;
        }
        code = event.code || KEYCODE_TO_CODE[event.keyCode];
        if (KEYS.indexOf(code) !== -1) {
          this.keys[code] = true;
          event.preventDefault();
        }
      },
      onKeyUp: function (event) {
        var code;
        code = event.code || KEYCODE_TO_CODE[event.keyCode];
        if (KEYS.indexOf(code) !== -1 && shouldCaptureKeyEvent(event)) {
          event.preventDefault();
        }
        delete this.keys[code];
      }
    }); 
     
