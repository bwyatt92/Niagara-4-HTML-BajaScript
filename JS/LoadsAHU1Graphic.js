<!DOCTYPE html>
<!-- @noSnoop -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AHU Graphic Loader from Writable Point</title>
  <script type="text/javascript" src="/requirejs/config.js"></script>
  <script type="text/javascript" src="/module/js/com/tridium/js/ext/require/require.min.js"></script>
  <style>
    .graphic-container {
      position: relative;
      width: 1000px;
      height: 400px;
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      margin: 20px;
    }
    .graphic-component {
      position: absolute;
      height: 90px; /* Adjust size as needed */
    }
    button {
      margin: 10px;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
  <h2>AHU Graphic Loader from Writable Point</h2>
  <button id="loadConfigBtn">Load Graphic Configuration</button>
  <div class="graphic-container" id="graphicContainer"></div>
  
  <script>
    require(['baja!'], function(baja) {
      "use strict";
      
      // Mapping for known component keywords to their SVG asset URLs and positions.
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
          url: '/ord/module://kitPxN4svg/Sensors/sensor_duct_avgtemp_top.svg',
          pos: { top: '48%', left: '380px', transform: 'translateY(-50%)' }
        },
        hwv: {
          url: '/ord/module://kitPxN4svg/Coils/Coils_Heating/Coils_Heating_0.svg',
          pos: { top: '50%', left: '450px', transform: 'translateY(-50%)' }
        }
      };

      // Function to build the graphic using the configuration object.
      // Expected configuration format:
      // {"equipment":"slot:/AHU1","components":["space","fan","hwv","duct"],"timestamp":"..."}
      function buildGraphicFromConfig(config) {
        var container = document.getElementById("graphicContainer");
        container.innerHTML = ""; // Clear any previous graphic
        
        // Ensure the duct is always included.
        var components = config.components;
        if (!components.includes("duct")) {
          components.push("duct");
        }
        // Sort so that "duct" is rendered first (in the background).
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
            img.className = "graphic-component";
            var pos = svgMapping[key].pos;
            img.style.top = pos.top;
            img.style.left = pos.left;
            if (pos.transform) {
              img.style.transform = pos.transform;
            }
            // Ensure duct stays in the background.
            img.style.zIndex = (key === "duct") ? 1 : 2;
            container.appendChild(img);
          }
        });
      }

      // Function to load the configuration from the writable property.
      // We use the full ORD: "station:|slot:/AHU1/graphicConfiguration"
      function loadConfigFromWritablePoint() {
        var configOrd = "station:|slot:/AHU1/graphicConfig";
        baja.Ord.make(configOrd)
          .get()
          .then(function(configSlot) {
            // Get the property value. If getValue() is not available, use toString().
            var configProp = configSlot;
            var configStr = (configProp && typeof configProp.getValue === 'function')
                            ? configProp.getValue()
                            : configProp.toString();
            console.log("Retrieved configuration string:", configStr);
            
            // Trim off any extra text after the JSON by taking the substring up to the last "}"
            var lastIndex = configStr.lastIndexOf("}");
            if (lastIndex !== -1) {
              configStr = configStr.substring(0, lastIndex + 1);
            }
            
            try {
              var config = JSON.parse(configStr);
              console.log("Parsed configuration:", config);
              buildGraphicFromConfig(config);
            } catch(e) {
              console.error("Error parsing JSON configuration:", e);
              alert("Error parsing configuration JSON.");
            }
          })
          .catch(function(err) {
            console.error("Error retrieving configuration:", err);
            alert("Error retrieving configuration from AHU1.");
          });
      }

      // Attach the load function to the button.
      document.getElementById("loadConfigBtn").addEventListener("click", loadConfigFromWritablePoint);
    });
  </script>
</body>
</html>
