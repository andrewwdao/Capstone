// Please use your own token here. See https://cesium.com/learn/ion/cesium-ion-access-tokens/
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4OGZjZGIwZC03ODlhLTRmNGEtOGMyMC1kZTRlNzI3OGFjNzkiLCJpZCI6NjQxNzYsImlhdCI6MTYyODg2MDY2M30.4Qs7AJNdHE8AA3SG6vJLhZORa6L3ln9oHwuH5NasJfw";

const viewer = new Cesium.Viewer("cesiumContainer");
const osmBuildingsTileset = Cesium.createOsmBuildings();

// Buffer for saved data
var wDat = [];
// The position of the transmitter.
const Tx = Cesium.Cartesian3.fromDegrees(144.956, -37.82, 25);
//The position of the receiver.
const Rx = Cesium.Cartesian3.fromDegrees(144.948373, -37.818445, 25);
var objectsToExclude = [];

//console.log("Tx: "+ Tx);
//console.log("Rx: "+ Rx);

viewer.scene.primitives.add(osmBuildingsTileset);
viewer.scene.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(144.956, -37.82, 100), //The coordinates of Melbourne CBD.
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-30),
  },
});

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

/** -----------------------------------------------------------------------------------------
 * a function to convert a row vector to a column vector
 * (c) Tian Han 2022
 * @param {array} grid
 * @returns
  -------------------------------------------------------------------------------------------
 */
function rows2cols(grid) {
  let r = [];
  for (let i = 0; i < grid.length; i++) {
    console.log([grid[i]]);
    r.push([grid[i]]);
  }
  return r;
}

/** -----------------------------------------------------------------------------------------
 * a function for data exportation
 * (c) Tian Han 2022
 * @param {string} filename
 * @param {array} rows
  -------------------------------------------------------------------------------------------
 */
function exportToCsv(filename, rows) {
  var processRow = function (row) {
    var finalVal = "";
    for (var j = 0; j < row.length; j++) {
      var innerValue = row[j] === null ? "" : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      }
      var result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
      if (j > 0) finalVal += ",";
      finalVal += result;
    }
    return finalVal + "\n";
  };

  var csvFile = "";
  for (var i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  var blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

/** -----------------------------------------------------------------------------------------
 * a function for checking Line of Sight between two points
  -------------------------------------------------------------------------------------------
 */
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

      //old method to add to a csv file
      // wDat = wDat + ans.toString() + "\r\n";
      //  console.log(ans);
      // new method
      wDat.push([ans.toString()]);

      viewer.entities.add({
        position: intersection.position,
        point: {
          pixelSize: 10,
          color: Cesium.Color.BLUE,
        },
      });
    }
  }

  var buf = new Blob([wDat], { type: "text/plain;charset=utf-8" });
  // saveAs(buf, "data.txt");
  exportToCsv("data.csv", rows2cols(wDat));
  console.log("Data saved.");
}

var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(function (movement) {
  check_LOS();
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
