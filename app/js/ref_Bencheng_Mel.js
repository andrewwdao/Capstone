// Please use your own token here. See https://cesium.com/learn/ion/cesium-ion-access-tokens/
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4OGZjZGIwZC03ODlhLTRmNGEtOGMyMC1kZTRlNzI3OGFjNzkiLCJpZCI6NjQxNzYsImlhdCI6MTYyODg2MDY2M30.4Qs7AJNdHE8AA3SG6vJLhZORa6L3ln9oHwuH5NasJfw";

const viewer = new Cesium.Viewer("cesiumContainer");

const osmBuildingsTileset = Cesium.createOsmBuildings();

viewer.scene.primitives.add(osmBuildingsTileset);

viewer.scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(144.956, -37.82, 100), //The coordinates of Melbourne CBD.
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-30),
  },
});
// The position of the transmitter.
const Tx = Cesium.Cartesian3.fromDegrees(144.956, -37.82, 25);

//The position of the receiver.
const Rx = Cesium.Cartesian3.fromDegrees(144.948373, -37.818445, 25);

//console.log("Tx: "+ Tx);
//console.log("Rx: "+ Rx);

var objectsToExclude = [];

//The ray between Tx and Rx is shown in red.
objectsToExclude.push(
  viewer.entities.add({
    polyline: {
      positions: [Tx, Rx],
      width: 5,
      material: Cesium.Color.RED,
    },
  })
);
//viewer.zoomTo(viewer.entities);

function check_LOS() {
  for (let i = 0; i < 300; i++) {
    //The direction vector of the ray is calculated as "Rx-Tx".
    let longitude = 144.956 + Math.random() * 0.01;
    let latitude = -37.82 + Math.random() * 0.005;
    let theta = 2 * Math.PI * Math.random();
    var u = new Cesium.Cartesian3(-0.57408, -0.818799, 0.0);
    var v = new Cesium.Cartesian3(-0.502007, 0.351969, 0.790004);
    const Tx = Cesium.Cartesian3.fromDegrees(longitude, latitude, 25);
    let D = new Cesium.Cartesian3(
      u.x * Math.cos(theta) + v.x * Math.sin(theta),
      u.y * Math.cos(theta) + v.y * Math.sin(theta),
      u.z * Math.cos(theta) + v.z * Math.sin(theta)
    );
    //console.log("D: "+ D);

    let ray = new Cesium.Ray(Tx, D);

    let intersection = viewer.scene.pickFromRay(ray);
    if (intersection !== undefined) {
      let ans =
        (intersection.position.x - Tx.x) * (intersection.position.x - Tx.x) +
        (intersection.position.y - Tx.y) * (intersection.position.y - Tx.y) +
        (intersection.position.z - Tx.z) * (intersection.position.z - Tx.z);
      ans = Math.sqrt(ans);
      console.log(ans);

      viewer.entities.add({
        position: intersection.position,
        point: {
          pixelSize: 10,
          color: Cesium.Color.BLUE,
        },
      });
    }
  }
}

var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(function (movement) {
  check_LOS();
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
