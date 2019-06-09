import React, { Component } from 'react';
import * as THREE from 'three';
import Resize from './Resize';
import treeGLTF from './models/tree-1/scene.gltf';
import {
  randomPositionInCircle,
  angularDistance,
  distance,
} from './utils/geom.js';
import { getTouchesXY, mouseDownTypes } from './utils/input.js';
import loadModels from './utils/loadModels.js';
import Sky from './Sky';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
const importDeviceOrientationControls = () => {
  return import('three/examples/js/controls/DeviceOrientationControls.js').then(
    () => {
      return window.THREE.DeviceOrientationControls;
    }
  );
};
const settings = {
  enableCameraShowcase: false,
  load: {
    models: true,
    lights: true,
    ground: true,
  },
  shadowHelper: true,
};
//import treeFBX from './models/tree-1-fbx/trees1.fbx';

class Scene extends Component {
  //scene scale
  scl = 3;
  //camera x,y,z offset
  o = {
    x: 20,
    y: 6,
    z: 20,
  };
  //x, y, z, phi, theta, distance coords of the sun
  sun = null;
  MOUSE = mouseDownTypes;
  mouseDownType = mouseDownTypes.none;
  //mouse x,y
  mx = 0;
  my = 0;
  //down/up relative x,y (mouse pos)
  drx = 0;
  dry = 0;
  colours = {
    sky: '#6f97ad',
    sunlight: '#fafaff',
    groundLight: '#2e8c69',
    ground: '#5e8c2e',
  };
  brightness = 1;
  skySettings = {
    turbidity: 12,
    rayleigh: 4,
    mieCoefficient: 0.0025,
    mieDirectionalG: 0.8,
    luminance: 1,
    inclination: 0.2,
    azimuth: 0.4,
    sun: true,
  };
  updateSkyAndSun = (sky, sunSphere, settings) => {
    let uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = settings.turbidity;
    uniforms['rayleigh'].value = settings.rayleigh;
    uniforms['luminance'].value = settings.luminance;
    uniforms['mieCoefficient'].value = settings.mieCoefficient;
    uniforms['mieDirectionalG'].value = settings.mieDirectionalG;

    let theta = Math.PI * (settings.inclination - 0.5);
    let phi = 2 * Math.PI * (settings.azimuth - 0.5);
    //console.log('PHI', phi);
    let distance = 7000;
    sunSphere.position.x = distance * Math.cos(phi);
    sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    uniforms['sunPosition'].value.copy(sunSphere.position);
    this.sun = {
      x: sunSphere.position.x,
      y: sunSphere.position.y,
      z: sunSphere.position.z,
      phi,
      theta,
      distance,
    };
    return this.sun;
  };
  createSky = (settings = this.skySettings) => {
    const scene = this.scene;
    //  const controls, renderer;
    let sky, sunSphere;

    // Add Sky
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    this.sky = sky;
    // Add Sun
    sunSphere = new THREE.Mesh(
      new THREE.SphereBufferGeometry(20000, 16, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );
    scene.add(sunSphere);
    this.sunSphere = sunSphere;
    sunSphere.visible = settings.sun;

    const sun = this.updateSkyAndSun(sky, sunSphere, settings);
    this.setupSkyLight(sun);
    /*
          const gui = new dat.GUI();

          gui.add( settings, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
          gui.add( settings, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
                  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange(
          guiChanged );
                  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged
          );
                  gui.add( effectController, "luminance", 0.0, 2 ).onChange( guiChanged );
                  gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
                          gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged
          );
          gui.add( effectController, "sun" ).onChange( guiChanged );

          guiChanged();
                    
        */
  };
  setupScene = () => {
    const { width, height, colours } = this;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    this.camera = camera;
    camera.position.set(10, 10, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer = renderer;
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(colours.sky);
    renderer.setSize(width, height);
    this.createAndSetupSky();

    this.createGround();

    //this.createAndSetupFog();

    this.loadAndSetupModels();
    setInterval(() => {
      if (typeof this.aziA == 'number') {
        //console.log('elapsed', Date.now() - t0);
        this.aziA += 1 / 3 / (60 * this.daynight.minutes); //e.g. 8 minutes for 1 day and night
      }
    }, 1000 / 3);
  };
  updateAmbientLightBrightness = brightness => {
    this.aLight.intensity = 0.2 * brightness;
    this.hLight.intensity = 0.5 * brightness;
    for (let lightName in this.dLights) {
      const dLight = this.dLights[lightName];
      dLight.intensity = 2.5 * brightness;
    }
  };
  createAndSetupSky = () => {
    const { scene, renderer, colours, brightness } = this;

    //setup ambient light

    const aLight = new THREE.AmbientLight(colours.sky); // soft white light
    scene.add(aLight);
    this.aLight = aLight;
    const hLight = new THREE.HemisphereLight(colours.sky, colours.groundLight);
    scene.add(hLight);
    this.hLight = hLight;
    this.updateAmbientLightBrightness(brightness);
    // this.ambientLight = aLight;
    // this.hemiLight = hLight;

    //create and setup the sky and sunlight
    this.createSky();
  };
  setupSkyLight = ({ x, y, z, distance }) => {
    if (settings.load.lights) {
      const { scene, colours, brightness, renderer } = this;
      let maxTS = renderer.capabilities.maxTextureSize;
      if (maxTS >= 4096) {
        maxTS = 4096;
      } else if (maxTS >= 2048) {
        maxTS = 2048;
      } else if (maxTS >= 1024) {
        maxTS = 1024;
      } else if (maxTS >= 512) {
        maxTS = 512;
      }
      const dLightSettings = {
        colour: colours.sunlight,
        intensity: 2 * brightness,
        bias: 0.000008,
        far: distance * 2 * this.scl,
        castShadow: true,
        mapSize: maxTS,
      };
      const createLightData = (
        { x, y, left, right, bottom, top },
        customData = {}
      ) => {
        return {
          ...dLightSettings,
          ...{
            offset: {
              x,
              y,
            },
            frustrum: {
              left,
              right,
              bottom,
              top,
            },
          },
          ...customData,
        };
      };
      const dLights = {
        middle: createLightData({
          x: 0,
          y: 0,
          left: -5,
          right: 5,
          bottom: -5,
          top: 5,
        }),
        /*left: createLightData(
          {
            x: -1,
            y: 0,
            left: -5,
            right: 5,
            bottom: -15,
            top: 15,
          },
          {
            mapSize: maxTS / 2,
          }
        ),
        right: createLightData(
          {
            x: 1,
            y: 0,
            left: -5,
            right: 5,
            bottom: -15,
            top: 15,
          },
          {
            mapSize: maxTS / 2,
          }
        ),
        bottom: createLightData(
          {
            x: 0,
            y: 1,
            left: -5,
            right: 5,
            bottom: -5,
            top: 5,
          },
          {
            mapSize: maxTS / 2,
          }
        ),
        top: createLightData(
          {
            x: 0,
            y: -1,
            left: -5,
            right: 5,
            bottom: -5,
            top: 5,
          },
          {
            mapSize: maxTS / 2,
          }
        ),*/
      };
      const createDLights = dLights => {
        this.dLights = {};
        this.dLightHelpers = {};
        for (let lightName in dLights) {
          const {
            colour,
            intensity,
            bias,
            far,
            castShadow,
            mapSize,
            offset,
            frustrum: { left, right, bottom, top },
          } = dLights[lightName];
          console.log('creating', lightName, 'directional light.');
          const dLight = new THREE.DirectionalLight(colour, intensity);
          dLight.castShadow = castShadow;
          dLight.shadow.bias = bias;

          dLight.shadow.mapSize.width = mapSize;
          dLight.shadow.mapSize.height = mapSize;

          dLight.shadow.camera.far = far;
          dLight.shadow.camera.left = left;
          dLight.shadow.camera.right = right;
          dLight.shadow.camera.bottom = bottom;
          dLight.shadow.camera.top = top;

          dLight.userData = {
            offset,
            frustrum: {
              left,
              right,
              bottom,
              top,
            },
          };
          scene.add(dLight);
          scene.add(dLight.target);
          this.dLights[lightName] = dLight;
          if (settings.shadowHelper) {
            const dLightHelper = new THREE.CameraHelper(dLight.shadow.camera);
            scene.add(dLightHelper);
            this.dLightHelpers[lightName] = dLightHelper;
          }
        }
      };
      createDLights(dLights);
    }
  };
  createGround = () => {
    const { scene, colours } = this;
    const plane = {
      geometry: new THREE.PlaneGeometry(3000 * this.scl, 3000 * this.scl),
      material: new THREE.MeshLambertMaterial({
        color: colours.ground,
        side: THREE.FrontSide,
      }),
    };
    plane.geometry.rotateX(-(Math.PI / 2));
    plane.entity = new THREE.Mesh(plane.geometry, plane.material);
    plane.entity.receiveShadow = true;
    this.plane = plane;
    scene.add(plane.entity);
  };
  // createAndSetupFog = () => {
  //   const fog = {
  //     color: 'rgba(255,255,230,0.1)',
  //     density: 0.001,
  //     near: 60 * this.scl,
  //     far: 2000 * this.scl,
  //   };
  //   this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  // }
  loadAndSetupModels = () => {
    loadModels([{ type: 'gltf', model: treeGLTF }])
      .then(objOriginal => {
        objOriginal = objOriginal[0];
        const objs = [objOriginal];
        for (let i = 0; i < 400; i++) {
          const newObj = objOriginal.clone();
          const rndInCircle = randomPositionInCircle(700);
          newObj.position.set(rndInCircle.x, 0, rndInCircle.y);
          newObj.rotation.y = Math.random() * Math.PI * 2;
          objs.push(newObj);
        }
        objs.forEach(obj => {
          obj.scale.set(0.015 * this.scl, 0.015 * this.scl, 0.015 * this.scl);
          obj.castShadow = true;
          obj.receiveShadow = true;

          obj.traverse(o => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              //TODO: will need a better way to determine what has alpha
              if (o.name.includes('leaf')) {
                //this allows transparent textures such a tree leaves
                o.material.transparent = true;
                //this removes depth issues where leaves behind were blacked
                //out behind leaves in front
                o.material.alphaTest = 0.5;
                const customDepthMaterial = new THREE.MeshDepthMaterial({
                  depthPacking: THREE.RGBADepthPacking,

                  map: o.material.map, // or, alphaMap: myAlphaMap

                  alphaTest: 0.5,
                });

                o.customDepthMaterial = customDepthMaterial;
              }
            }
          });
          this.scene.add(obj);
        });
      })
      .catch(err => {
        console.error('error loading models', err);
      });
  };
  componentDidMount() {
    window.THREE = THREE;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.setupScene();
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    //controls.addEventListener( 'change', render );
    this.cameraControls = controls;

    if (window.DeviceOrientationEvent) {
      importDeviceOrientationControls().then(DeviceOrientationControls => {
        const controls = new DeviceOrientationControls(this.camera);
        this.orientationControls = controls;
      });
    }
    this.mount.appendChild(this.renderer.domElement);
    this.start();
  }

  componentWillUnmount() {
    this.stop();
    this.mount.removeChild(this.renderer.domElement);
  }

  start = () => {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  };

  stop = () => {
    cancelAnimationFrame(this.frameId);
  };
  frame = 0;
  aziA = 0.01;
  aziAFrames = 60 * 60; //1 min
  t0 = 0;
  daynight = {
    minutes: 60,
  };
  aziHeight = 0;
  translateShadow = () => {
    const camera = this.camera;
    for (let lightName in this.dLights) {
      const dLight = this.dLights[lightName];
      //const offset = dLight.userData.offset;
      const raycaster = new THREE.Raycaster();
      const center = new THREE.Vector2();

      center.x = 0; //rx * 2 - 1;
      center.y = 0; //ry * 2 - 1;
      const shadowSize = 80;
      const rayDistanceActual = shadowSize + 40;
      const rayDistance = Math.max(rayDistanceActual, camera.position.y);
      raycaster.setFromCamera(center, this.camera);
      let resultPosition = new THREE.Vector3();
      let ray = raycaster.ray;
      ray.at(rayDistance, resultPosition);
      resultPosition.y = 0;

      let distXYCamToShadow = distance(
        {
          x: resultPosition.x,
          y: resultPosition.z,
        },
        {
          x: camera.position.x,
          y: camera.position.z,
        }
      );
      let distCamToShadow = resultPosition.distanceTo(camera.position);
      if (resultPosition) {
        //enable sunlight when it is above the horizon, disable it below
        if (this.sun.y > -1 * this.scl) {
          if (!dLight.visible) dLight.visible = true;
        } else {
          dLight.visible = false;
          this.brightness = 0.0001;
        }
        //translate sunlight shadow cast to where the camera is pointed
        dLight.target.position.copy(resultPosition);
        dLight.position.set(
          this.sun.x * this.scl + resultPosition.x,
          this.sun.y * this.scl + resultPosition.y,
          this.sun.z * this.scl + resultPosition.z
        );
        //cam view intersects with ground plane at groundPoint
        //add groundPoint x,y,z to the directional light position and target point.
      }
      /* set shadow size based on camera y position */
      const cy = 1; //Math.min(10, Math.max(0.5, camera.position.y / 20));
      const cz = Math.max(0.5, distXYCamToShadow / rayDistance + 0.5);
      //set shadow size based on dist to shadow center
      const cw = Math.max(0.33, distCamToShadow / (rayDistanceActual / 2));
      const c = Math.min(10, cy * cz * cw);
      //if (this.frame % 10 === 0) console.table([['xyd', cz], ['xyzd', cw]]);

      dLight.shadow.camera.right = shadowSize * this.scl * c;
      dLight.shadow.camera.left = -shadowSize * this.scl * c;
      dLight.shadow.camera.top = shadowSize * this.scl * c;
      dLight.shadow.camera.bottom = -shadowSize * this.scl * c;
      dLight.shadow.camera.updateProjectionMatrix();
      //dLight.shadow.camera.updateProjectionMatrix();
      if (settings.shadowHelper) {
        const dLightHelper = this.dLightHelpers[lightName];
        dLightHelper.update();
      }
    }
  };
  animate = ms => {
    ms = Math.round(ms / 10);
    const enableCamShowcase = false;
    const cam = this.camera;
    const o = this.o;
    if (
      this.orientationControls &&
      this.orientationControls.deviceOrientation.type === 'deviceorientation'
    ) {
      this.orientationControls.update();
    }
    this.cameraControls.update();
    //const cube = this.cube;
    if (enableCamShowcase) {
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      let x = Math.sin(ms / 160) * 12 * this.scl;
      let y = Math.cos(ms / 320) * 9 * this.scl + 11 * this.scl;
      let z = Math.cos(ms / 210) * 12 * this.scl;

      cam.position.set(o.x, o.y, o.z);
      y = Math.sin(ms / 220) * 5 * this.scl + 5 * this.scl;
      //const point = new THREE.Vector3(0, y, 0);

      //cam.lookAt(point);
      this.helper.update();
    }
    if (
      this.frame % 10 === 0 &&
      settings.load.lights &&
      this.sky &&
      this.sunSphere
    ) {
      //console.log(this.aziA);
      let azi = this.aziA % 1;
      //between 0 and 1, where 1 is highest in the sky, and 0 is the horizon.
      this.aziHeight = Math.abs((azi % 0.5) - 0.25) * 4;
      const maxMieDG = 0.9;
      let mieDG = maxMieDG;
      const mieDGRange = 0.1;
      let rayleigh = 4;
      if (azi < mieDGRange) {
        mieDG = Math.max(0.01, azi * (maxMieDG / mieDGRange));
        //0 to 0.1
        //
      }
      if (azi > 0.5 - mieDGRange) {
        //0.4 to 0.5
        mieDG = Math.max(
          0.01,
          (mieDGRange - (azi - (0.5 - mieDGRange))) * (maxMieDG / mieDGRange)
        );
        //0.4 - 0.4 + 0 * 8 == 0
        //0.4 - 0.4 + 0.1 * 8 == 0.8
      }
      // if(azi > mieDGRange/2 && azi < 0.5-(mieDGRange/2)){
      //   //between 0.05 and 0.45

      // }

      //between 2 and 4, where 2 is on the horizon, and 4 is high in the sky
      rayleigh = this.aziHeight * 2 + 2;
      //console.log('rayleigh', rayleigh);
      //console.log('angle', angle, 'azi', azi, 'day?', angle <= Math.PI);
      this.updateSkyAndSun(this.sky, this.sunSphere, {
        ...this.skySettings,
        azimuth: azi,
        mieDirectionalG: mieDG,
        rayleigh,
      });

      //update ambient light based on aziHeight
      this.brightness = 1 - this.aziHeight ** 4;
      console.log('azih', this.aziHeight ** 4);

      // this.camera.updateProjectionMatrix();

      // const translateCamera = () => {
      //   const xd = this.rx - 0.5;
      //   o.x += xd;
      //   cam.position.x += xd;
      // };
      //TODO: refactor this out of animate function

      //translateCamera();
      //if (this.mouseDownType === this.MOUSE.left) {

      this.translateShadow();
      if (this.brightness > 0) {
        this.updateAmbientLightBrightness(this.brightness);
      }
      this.renderScene();
    }
    //}
    //if (this.trees) this.trees.position.x = Math.sin(ms / 300) * 40;
    //this.dLight.position.set(-x * 10, y * 10, -z * 10);
    //this.dLight.shadow.camera.updateProjectionMatrix();

    this.frameId = window.requestAnimationFrame(this.animate);
    this.frame++;
  };

  renderScene = () => {
    this.renderer.render(this.scene, this.camera);
  };

  render() {
    return (
      <Resize>
        {({ width, height }) => {
          this.width = window.innerWidth;
          this.height = window.innerHeight;
          //console.log(width);
          if (width && height) {
            console.log(width, height);
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
          }
          return (
            <div
              style={{ width: '100%', height: '100%', position: 'fixed' }}
              ref={mount => {
                this.mount = mount;
              }}
            />
          );
        }}
      </Resize>
    );
  }
}

export default Scene;
