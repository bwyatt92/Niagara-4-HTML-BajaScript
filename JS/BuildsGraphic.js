<!DOCTYPE html>
<!-- @noSnoop -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Equipment & Component Graphic Builder</title>
  <script type="text/javascript" src="/requirejs/config.js"></script>
  <script type="text/javascript" src="/module/js/com/tridium/js/ext/require/require.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
    }
    /* Equipment selector styling */
    .selector-panel {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #ccc;
      width: 300px;
    }
    /* Component selection panel styling */
    .component-panel {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #ccc;
      width: 300px;
    }
    /* Container for the graphic */
    .graphic-container {
      position: relative;
      width: 1000px;
      height: 400px;
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      margin-top: 20px;
    }
    .graphic-container img {
      position: absolute;
      height: 90px; /* Adjust size as needed */
    }
    button {
      margin: 10px 0;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
  <h2>Equipment & Component Graphic Builder</h2>

  <!-- Step 1: Equipment Selector -->
  <div class="selector-panel">
    <label for="equipment">Select Equipment:</label>
    <select id="equipment">
      <option value="">Loading equipment...</option>
    </select>
    <br>
    
    <button id="saveConfigBtn" type="button">Save Configuration to Station</button>
  </div>

  <!-- Step 2: Component Selector (populated via BQL based on equipment selection) -->
  <div class="component-panel" id="componentPanel" style="display:none;">
    <p>Select Components to include in the graphic:</p>
    <form id="componentForm">
      <!-- Checkboxes will be added here -->
    </form>
    <button id="buildGraphicBtn" type="button">Build Graphic</button>
  </div>

  <!-- Step 3: Graphic Container -->
  <div class="graphic-container" id="graphicContainer">
    <!-- The built graphic will be rendered here -->
  </div>

  <script>
    require(['baja!'], function(baja) {
      "use strict";
      
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
        dat: {
          url: '/ord/module://kitPxN4svg/Sensors/sensor_duct_avgtemp_top.svg',
          pos: { top: '48%', left: '310px', transform: 'translateY(-50%)' }
        },
        hwv: {
          url: '/ord/module://kitPxN4svg/Coils/Coils_Heating/Coils_Heating_0.svg',
          pos: { top: '50%', left: '450px', transform: 'translateY(-50%)' }
        },
        cooling: {
          url: '/ord/module://kitPxN4svg/Coils/Coils_Cooling_DX_1Stg/Coils_Cooling_DX_1Stg_On.svg',
          pos: { top: '50%', left: '460px', transform: 'translateY(-50%)' }
        },
        chiller: {
          url: '/ord/module://kitPxN4svg/Chillers/Chiller_AirCooled/Chiller_AirCooled_On.svg',
          pos: { top: '50%', left: '425px', transform: 'translateY(-50%)' }
        },
        damper: {
          url: '/ord/module://kitPxN4svg/Dampers/Damper_Horz_Parallel/Damper_Horz_Parallel_0.svg',
          pos: { top: '50%', left: '395px', transform: 'translateY(-50%)' }
        }
      };

      // ---------------------------------------------------------------------
      // STEP 1: Populate Equipment Dropdown
      function updateEquipmentDropdown() {
        var equipmentDropdown = document.getElementById("equipment");
        if (!equipmentDropdown) {
          console.error("Dropdown not found.");
          return;
        }
      
        // Define tags to search for.
        var tagsToFind = ['n:ahu', 'n:chiller', 'n:rtu', 'n:lighting'];
        var neqlQuery = `station:|slot:|neql:${tagsToFind.join(' or ')}|bql:select displayName, slotPathOrd`;
        console.log("Running NEQL Query:", neqlQuery);
      
        baja.Ord.make(neqlQuery)
          .get()
          .then(function(result) {
            if (!result || !result.cursor()) {
              equipmentDropdown.innerHTML = "<option value=''>No Equipment Found</option>";
              return;
            }
            equipmentDropdown.innerHTML = "";
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
                // Sort alphabetically.
                equipmentOptions.sort(function(a, b) {
                  return a.displayName.localeCompare(b.displayName);
                });
                equipmentOptions.forEach(function(option) {
                  var optionElement = document.createElement("option");
                  optionElement.value = option.ord;
                  optionElement.textContent = option.displayName;
                  equipmentDropdown.appendChild(optionElement);
                });
                // Auto-load components for the first equipment.
                updateComponentsList(equipmentOptions[0].ord);
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
      // STEP 2: Component Selector
      function updateComponentsList(equipmentOrd) {
        var componentPanel = document.getElementById("componentPanel");
        var componentForm = document.getElementById("componentForm");
        componentForm.innerHTML = "";
        componentPanel.style.display = "block";
      
        var bqlQuery = `station:|${equipmentOrd}|bql:select displayName,out from control:ControlPoint`;
        console.log("Running BQL Query for components:", bqlQuery);
      
        baja.Ord.make(bqlQuery)
          .get()
          .then(function(result) {
            if (!result || !result.cursor()) {
              componentForm.innerHTML = "<p>No components found.</p>";
              return;
            }
            var availableComponents = {};
            result.cursor({
              each: function(row) {
                try {
                  var displayName = row.get("displayName");
                  Object.keys(svgMapping).forEach(function(key) {
                    if (displayName.toLowerCase().indexOf(key) !== -1) {
                      availableComponents[key] = displayName;
                    }
                  });
                } catch (error) {
                  console.error("Error processing component:", error);
                }
              },
              after: function() {
                if (Object.keys(availableComponents).length === 0) {
                  componentForm.innerHTML = "<p>No known components found.</p>";
                  return;
                }
                Object.keys(availableComponents).forEach(function(key) {
                  var label = document.createElement("label");
                  var checkbox = document.createElement("input");
                  checkbox.type = "checkbox";
                  checkbox.name = "component";
                  checkbox.value = key;
                  checkbox.checked = true;
                  label.appendChild(checkbox);
                  label.appendChild(document.createTextNode(" " + availableComponents[key]));
                  var br = document.createElement("br");
                  componentForm.appendChild(label);
                  componentForm.appendChild(br);
                });
              }
            });
          })
          .catch(function(error) {
            console.error("Error executing BQL query:", error);
            componentForm.innerHTML = "<p>Error loading components.</p>";
          });
      }
      
      // ---------------------------------------------------------------------
      // STEP 3: Build the Graphic from Configuration
      // Configuration expected format:
      // {"equipment":"station:|slot:/AHU1","components":["space","fan","hwv","duct"],"timestamp":"..."}
      function buildGraphicFromConfig(config) {
        var container = document.getElementById("graphicContainer");
        container.innerHTML = "";
        var components = config.components;
        if (!components.includes("duct")) {
          components.push("duct");
        }
        components.sort(function(a, b) {
          if (a === "duct") return -1;
          if (b === "duct") return 1;
          return 0;
        });
        console.log("Building graphic for equipment:", config.equipment, "with components:", components);
        components.forEach(function(key) {
          if (svgMapping[key]) {
            var img = document.createElement("img");
            img.src = svgMapping[key].url;
            var pos = svgMapping[key].pos;
            img.style.top = pos.top;
            img.style.left = pos.left;
            if (pos.transform) { img.style.transform = pos.transform; }
            img.style.zIndex = (key === "duct") ? 1 : 2;
            container.appendChild(img);
          }
        });
      }
      
      // ---------------------------------------------------------------------
      // STEP 4: Load and Save Configuration (Graphic Config)
      
      
      
      // Save current configuration to the equipment folder.
      function saveConfigurationToStation() {
        var equipmentDropdown = document.getElementById("equipment");
        var selectedEquipment = equipmentDropdown.value;
        if (!selectedEquipment) {
          alert("Please select an equipment.");
          return;
        }
        var fullEquipmentOrd = selectedEquipment.indexOf("station:|") === 0
          ? selectedEquipment : "station:|" + selectedEquipment;
      
        var selectedComponents = Array.from(
          document.querySelectorAll('input[name="component"]:checked')
        ).map(function(el) {
          return el.value;
        });
        if (!selectedComponents.includes("duct")) {
          selectedComponents.push("duct");
        }
        var config = {
          equipment: fullEquipmentOrd,
          components: selectedComponents,
          timestamp: new Date().toISOString()
        };
        var configJSON = JSON.stringify(config);
        console.log("Configuration to save:", configJSON);
      
        baja.Ord.make(fullEquipmentOrd)
          .get()
          .then(function(ahuFolder) {
            return ahuFolder.add({
              slot: "graphicConfig",
              value: baja.$("baja:String", configJSON),
              flags: baja.Flags.SUMMARY
            });
          })
          .then(function(newProp) {
            alert("Configuration saved to station as property: " + newProp.getName());
          })
          .catch(function(err) {
            console.error("Error saving configuration to station:", err);
            alert("Error saving configuration to station: " + err);
          });
      }
      
      // ---------------------------------------------------------------------
      
      
      document.getElementById("saveConfigBtn").addEventListener("click", function() {
        saveConfigurationToStation();
      });
      
      document.getElementById("buildGraphicBtn").addEventListener("click", function() {
        // Build graphic from current component selection.
        // Here, we can construct a configuration object from the current state.
        var equipmentDropdown = document.getElementById("equipment");
        var selectedEquipment = equipmentDropdown.value;
        if (!selectedEquipment) {
          alert("Please select equipment.");
          return;
        }
        var fullEquipmentOrd = selectedEquipment.indexOf("station:|") === 0
          ? selectedEquipment : "station:|" + selectedEquipment;
      
        var selectedComponents = Array.from(
          document.querySelectorAll('input[name="component"]:checked')
        ).map(function(el) { return el.value; });
        if (!selectedComponents.includes("duct")) {
          selectedComponents.push("duct");
        }
        var config = {
          equipment: fullEquipmentOrd,
          components: selectedComponents,
          timestamp: new Date().toISOString()
        };
        buildGraphicFromConfig(config);
      });
      
      // ---------------------------------------------------------------------
      // Initialization: Populate equipment dropdown.
      updateEquipmentDropdown();
      
      // When equipment is selected, update component list.
      document.getElementById("equipment").addEventListener("change", function(event) {
        var selectedOrd = event.target.value;
        if (selectedOrd) {
          updateComponentsList(selectedOrd);
          document.getElementById("graphicContainer").innerHTML = "";
        }
      });
      
    });
  </script>
</body>
</html>
