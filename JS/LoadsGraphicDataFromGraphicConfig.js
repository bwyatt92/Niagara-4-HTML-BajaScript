<!DOCTYPE html>
<!-- @noSnoop -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Equipment Graphic Index & Live Data</title>
  <script type="text/javascript" src="/requirejs/config.js"></script>
  <script type="text/javascript" src="/module/js/com/tridium/js/ext/require/require.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    /* Equipment selector styling */
    .selector-panel {
      margin: 20px;
      padding: 10px;
      border: 1px solid #ccc;
      width: 300px;
    }
    /* AHU Graphic Container styling */
    .graphic-container {
      position: relative;
      width: 1000px;
      height: 400px;
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      margin-top: 20px;
    }
    .graphic-component {
      position: absolute;
      height: 90px; /* Adjust size as needed */
    }
    /* Temperature table styling */
    .temperature-table {
      width: 1000px;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .temperature-table th, .temperature-table td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    .temperature-table th {
      background-color: #f0f0f0;
    }
    /* Tooltip and override menus */
    .tooltip {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 5px;
      border-radius: 3px;
      font-size: 12px;
      display: none;
    }
    .override-menu {
      display: none;
      position: absolute;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      padding: 10px;
    }
    .override-option {
      padding: 10px;
      cursor: pointer;
    }
    .override-option:hover {
      background-color: #f0f0f0;
    }
    #hwvOverrideForm input {
      width: 80px;
      padding: 5px;
      margin-right: 10px;
    }
    #hwvOverrideForm button {
      padding: 5px 10px;
      cursor: pointer;
    }
    button {
      margin: 10px 0;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
  <h2>Silo - AHU</h2>

  <!-- Equipment Selector (populated with equipment having graphicConfig slot) -->
  <div class="selector-panel">
    <label for="equipment">Select Equipment (with Graphic Config):</label>
    <select id="equipment">
      <option value="">Loading equipment...</option>
    </select>
    <br>
    <button id="loadConfigBtn" type="button">Load Graphic Configuration</button>
  </div>

  <!-- Graphic Container -->
  <div class="graphic-container" id="graphicContainer">
    <!-- The graphic will be built here dynamically -->
  </div>

  <!-- Temperature Table (for live data) -->
  <table class="temperature-table">
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Space Temp</td>
        <td id="spaceTempValue">--</td>
      </tr>
      <tr>
        <td>Discharge Air Temp</td>
        <td id="dischargeAirTempValue">--</td>
      </tr>
    </tbody>
  </table>

  <!-- Tooltip and Override Menus -->
  <div id="tooltip" class="tooltip"></div>
  <div id="overrideMenu" class="override-menu">
    <div class="override-option" data-value="active">Override Active</div>
    <div class="override-option" data-value="inactive">Override Inactive</div>
    <div class="override-option" data-value="auto">Auto</div>
  </div>
  <div id="hwvOverrideMenu" class="override-menu">
    <form id="hwvOverrideForm">
      <label for="hwvOverrideValue">Enter HWV Override Value (0-100):</label>
      <input type="number" id="hwvOverrideValue" min="0" max="100" step="1" required>
      <button type="submit">Apply</button>
    </form>
  </div>

  <script>
    require(['baja!', 'baja!control:NumericOverride'], function(baja, types) {
      "use strict";
      
      // Helper function to ensure numeric values get a "px" unit.
      function toCssValue(val) {
        return typeof val === "number" ? val + "px" : val;
      }
      
      function getPointOrd(equipmentOrd, pointName) {
        if (equipmentOrd.indexOf("/Drivers/BacnetNetwork/") !== -1 && equipmentOrd.indexOf("/points") === -1) {
          return equipmentOrd + "/points/" + pointName;
        } else {
          return equipmentOrd + "/" + pointName;
        }
      }

      function getConfigOrd(equipmentOrd) {
        if (equipmentOrd.endsWith("/points")) {
          equipmentOrd = equipmentOrd.substring(0, equipmentOrd.lastIndexOf("/points"));
        }
        if (equipmentOrd.indexOf("station:|") !== 0) {
          equipmentOrd = "station:|" + equipmentOrd;
        }
        return equipmentOrd + "/graphicConfig";
      }
      
      // Mapping for component SVGs and positions.
      var svgMapping = {
        fan: {
          url: '/ord/module://kitPxN4svg/Fans/Fans_Horz/Fans_Horz_Left/Fans_Horz_Left_Off.svg',
          pos: { top: '50%', left: '130px', transform: 'translateY(-50%)' }
        },
        duct: {
          url: '/ord/module://kitPxN4svg/Ductwork/Duct_Horz_Med.svg',
          pos: { top: '50%', left: '260px', transform: 'translateY(-50%)' }
        },
        space: {
          url: '/ord/module://kitPxN4svg/Sensors/Sensor_duct_avgtemp_top.svg',
          pos: { top: '48%', left: '380px', transform: 'translateY(-50%)' }
        },
        hwv: {
          url: '/ord/module://kitPxN4svg/Coils/Coils_Heating/Coils_Heating_0.svg',
          pos: { top: '50%', left: '450px', transform: 'translateY(-50%)' }
        },
        cooling: {
          url: '/ord/module://kitPxN4svg/Coils/Coils_Cooling_DX_1Stg/Coils_Cooling_DX_1Stg_On.svg',
          pos: { top: '50%', left: '450px', transform: 'translateY(-50%)' }
        }
      };

      // ---------------------------------------------------------------------
      // INDEX PART: Populate equipment dropdown with equipment having graphicConfig.
      function updateEquipmentDropdownWithGraphicConfig() {
        var equipmentDropdown = document.getElementById("equipment");
        if (!equipmentDropdown) {
          console.error("Dropdown not found.");
          return;
        }
        equipmentDropdown.innerHTML = "<option value=''>Loading equipment...</option>";
      
        var neqlQuery = 'station:|slot:|neql: graphicConfig |bql:select displayName, slotPathOrd';
        console.log("Running NEQL Query:", neqlQuery);
      
        baja.Ord.make(neqlQuery)
          .get()
          .then(function(result) {
            if (!result || !result.cursor()) {
              equipmentDropdown.innerHTML = "<option value=''>No Equipment Found</option>";
              return;
            }
            var equipmentOptions = [];
            result.cursor({
              each: function(row) {
                try {
                  var displayName = row.get("displayName");
                  var ord = row.get("slotPathOrd").toString();
                  equipmentOptions.push({ displayName: displayName, ord: ord });
                } catch (error) {
                  console.error("Error processing row:", error);
                }
              },
              after: function() {
                if (equipmentOptions.length === 0) {
                  equipmentDropdown.innerHTML = "<option value=''>No Equipment Found</option>";
                  return;
                }
                equipmentOptions.sort(function(a, b) {
                  return a.displayName.localeCompare(b.displayName);
                });
                equipmentDropdown.innerHTML = "";
                equipmentOptions.forEach(function(option) {
                  var optionElement = document.createElement("option");
                  optionElement.value = option.ord;
                  optionElement.textContent = option.displayName;
                  equipmentDropdown.appendChild(optionElement);
                });
              },
              limit: 100
            });
          })
          .catch(function(error) {
            console.error("Error executing NEQL query:", error);
            equipmentDropdown.innerHTML = "<option value=''>Error Loading Data</option>";
          });
      }
      
      // ---------------------------------------------------------------------
      // LIVE DATA / INTERACTIVE GRAPHIC PART:
      // Build the graphic from the configuration object.
      // Expected configuration format:
      // {"equipment": "station:|slot:/AHU3", "components": [{key:"space",position:{...}}, ...], "timestamp": "..." }
      function buildGraphicFromConfig(config) {
        var container = document.getElementById("graphicContainer");
        container.innerHTML = ""; // Clear any existing graphic
      
        // Expect components to be an array of objects with { key, position }
        var components = config.components;
      
        // Ensure "duct" is always included.
        if (!components.some(function(comp) { return comp.key === "duct"; })) {
          components.push({ key: "duct", position: svgMapping["duct"].pos });
        }
      
        // Sort so that "duct" renders beneath other components.
        components.sort(function(a, b) {
          if (a.key === "duct") return -1;
          if (b.key === "duct") return 1;
          return 0;
        });
      
        console.log("Building graphic for equipment:", config.equipment, "with components:", components);
      
        // For each component, create an image element.
        components.forEach(function(comp) {
          var key = comp.key;
          if (svgMapping[key]) {
            var img = document.createElement("img");
            img.src = svgMapping[key].url;
            img.className = "graphic-component";
            // Use the saved position if available; otherwise, default.
            var pos = comp.position || svgMapping[key].pos;
            img.style.top = toCssValue(pos.top);
            img.style.left = toCssValue(pos.left);
            if (pos.transform) {
              img.style.transform = pos.transform;
            }
            // Ensure "duct" stays in the background.
            img.style.zIndex = (key === "duct") ? 1 : 2;
            container.appendChild(img);
          }
        });
      }
      
      // ---------------------------------------------------------------------
      // LIVE DATA FUNCTIONS
      
      function subscribeToPoint(ord, updateFunction) {
        const sub = new baja.Subscriber();
        sub.attach('changed', function(prop) {
          if (prop.getName() === 'out') {
            const newValue = this.getOut().getValue();
            console.log("Point value changed:", ord, "New Value:", newValue);
            updateFunction(newValue);
          }
        });
        baja.Ord.make(ord).get({ subscriber: sub })
          .then((point) => {
            const initialValue = point.getOut().getValue();
            console.log("Point resolved:", ord, "Initial Value:", initialValue);
            updateFunction(initialValue);
          })
          .catch((err) => {
            console.error("Error resolving point:", ord, err);
          });
        return sub;
      }
      
      function updateFanSVG(value) {
        var fanImg = document.getElementById('fanImg');
        if (fanImg) {
          fanImg.src = value ? svgMapping.fan.url.replace("Off", "On") : svgMapping.fan.url;
        }
      }
      
      function updateHeatingCoilSVG(value) {
        var coilImg = document.getElementById('coilImg');
        if (coilImg) {
          let index;
          if (value <= 20) index = 0;
          else if (value <= 40) index = 1;
          else if (value <= 60) index = 2;
          else if (value <= 80) index = 3;
          else index = 4;
          coilImg.src = svgMapping.hwv.url.replace("Coils_Heating_0", "Coils_Heating_" + index);
        }
      }
      
      function updateTemperatureTable(spaceTemp, dischargeAirTemp) {
        var spaceTempValue = document.getElementById('spaceTempValue');
        var dischargeAirTempValue = document.getElementById('dischargeAirTempValue');
        spaceTempValue.textContent = spaceTemp !== null ? spaceTemp + "°F" : '--';
        dischargeAirTempValue.textContent = dischargeAirTemp !== null ? dischargeAirTemp + "°F" : '--';
      }
      
      function wireLiveData(equipmentOrd) {
        var fanOrd = getPointOrd(equipmentOrd, "Fan");
        var hwvOrd = getPointOrd(equipmentOrd, "HWV");
        var spaceTempOrd = getPointOrd(equipmentOrd, "SpaceTemp");
        var matOrd = getPointOrd(equipmentOrd, "MAT");
      
        subscribeToPoint(fanOrd, updateFanSVG);
        subscribeToPoint(hwvOrd, updateHeatingCoilSVG);
        subscribeToPoint(spaceTempOrd, function(val) {
          updateTemperatureTable(val, null);
        });
        subscribeToPoint(matOrd, function(val) {
          updateTemperatureTable(null, val);
        });
      }
      
      // ---------------------------------------------------------------------
      // Initialization
      
      updateEquipmentDropdownWithGraphicConfig();
      
      document.getElementById("loadConfigBtn").addEventListener("click", function() {
        var equipmentDropdown = document.getElementById("equipment");
        var selectedOrd = equipmentDropdown.value;
        if (selectedOrd) {
          loadConfigFromWritablePoint(selectedOrd);
        } else {
          alert("Please select equipment.");
        }
      });
      
      function loadConfigFromWritablePoint(equipmentOrd) {
        var configOrd = getConfigOrd(equipmentOrd);
        console.log("Loading configuration from:", configOrd);
        baja.Ord.make(configOrd)
          .get()
          .then(function(configSlot) {
            var configProp = configSlot;
            var configStr = (configProp && typeof configProp.getValue === 'function')
                            ? configProp.getValue()
                            : configProp.toString();
            console.log("Retrieved configuration string:", configStr);
            var lastIndex = configStr.lastIndexOf("}");
            if (lastIndex !== -1) {
              configStr = configStr.substring(0, lastIndex + 1);
            }
            try {
              var config = JSON.parse(configStr);
              console.log("Parsed configuration:", config);
              buildGraphicFromConfig(config);
              wireLiveData(config.equipment);
            } catch(e) {
              console.error("Error parsing JSON configuration:", e);
              alert("Error parsing configuration JSON.");
            }
          })
          .catch(function(err) {
            console.error("Error retrieving configuration:", err);
            alert("Error retrieving configuration from selected equipment.");
          });
      }
      
    });
  </script>
</body>
</html>
