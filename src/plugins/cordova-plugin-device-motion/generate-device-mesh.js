// Copyright (c) Microsoft Corporation. All rights reserved.

// This is not used at runtime, but can be used at design time (simple run from node from the command line) to generate
// device-mesh.json

var fs = require('fs');

var cornerRadius = 6;
var mainX = 40;
var mainY = 70;
var displayX = 35;
var displayY = 56;
var innerX = mainX - cornerRadius;
var innerY = mainY - cornerRadius;

var speakerX = 15;
var speakerHeight = 3;

// Edge doesn't come completely to the front to help avoid artifacts from the way draw.js renders
var z = 5;
var fudge = 0.5;
var edgeZ = z - fudge;
var displayZ = z;

var deviceMesh = [
    // Display
    [-displayX + 0.5, -displayY + 0.5, displayZ,    displayX - 0.5, -displayY + 0.5, displayZ,    displayX - 0.5, displayY - 0.5, displayZ,    255, 255, 255, -1, 0],
    [-displayX + 0.5, -displayY + 0.5, displayZ,    displayX - 0.5, displayY - 0.5, displayZ,    -displayX + 0.5, displayY - 0.5, displayZ,    255, 255, 255, -1, 0],

    // Speaker
    [-speakerX + 0.5, -innerY + 0.5, displayZ, speakerX - 0.5, -innerY + 0.5, displayZ, speakerX - 0.5, -innerY + speakerHeight - 0.5, displayZ, 80, 80, 80, -1, 0],
    [-speakerX + 0.5, -innerY + 0.5, displayZ, speakerX - 0.5, -innerY + speakerHeight - 0.5, displayZ, -speakerX + 0.5, -innerY + speakerHeight - 0.5, displayZ, 80, 80, 80, -1, 0],

    // Above display
    frontBlackTriangle(-innerX, -mainY, innerX, -mainY, innerX, -innerY),
    frontBlackTriangle(-innerX, -mainY, innerX, -innerY, -innerX, -innerY),

    frontBlackTriangle(-mainX, -innerY + speakerHeight, mainX, -innerY + speakerHeight, mainX, -displayY),
    frontBlackTriangle(-mainX, -innerY + speakerHeight, mainX, -displayY, -mainX, -displayY),

    frontBlackTriangle(-mainX, -innerY, -speakerX, -innerY, -speakerX, -innerY + speakerHeight),
    frontBlackTriangle(-mainX, -innerY, -speakerX, -innerY + speakerHeight, -mainX, -innerY + speakerHeight),

    frontBlackTriangle(mainX, -innerY, speakerX, -innerY + speakerHeight, speakerX, -innerY),
    frontBlackTriangle(mainX, -innerY, mainX, -innerY + speakerHeight, speakerX, -innerY + speakerHeight),

    // Left of the display
    frontBlackTriangle(-mainX, -displayY, -displayX, -displayY, -displayX, displayY),
    frontBlackTriangle(-mainX, -displayY, -displayX, displayY, -mainX, displayY),

    // Right of the display
    frontBlackTriangle(displayX, -displayY, mainX, -displayY, mainX, displayY),
    frontBlackTriangle(displayX, -displayY, mainX, displayY, displayX, displayY),

    // Bottom of the display
    frontBlackTriangle(-mainX, displayY, mainX, displayY, mainX, innerY),
    frontBlackTriangle(-mainX, displayY, mainX, innerY, -mainX, innerY),

    frontBlackTriangle(-innerX, innerY, innerX, innerY, innerX, mainY),
    frontBlackTriangle(-innerX, innerY, innerX, mainY, -innerX, mainY),

    // Back main
    backBlackTriangle(-mainX, -innerY, mainX, innerY, mainX, -innerY),
    backBlackTriangle(-mainX, innerY, mainX, innerY, -mainX, -innerY),

    // Back top
    backBlackTriangle(-innerX, -mainY, innerX, -innerY, innerX, -mainY),
    backBlackTriangle(-innerX, -innerY, innerX, -innerY, -innerX, -mainY),

    // Back bottom
    backBlackTriangle(-innerX, mainY, innerX, mainY, innerX, innerY),
    backBlackTriangle(-innerX, innerY, -innerX, mainY, innerX, innerY),

    // Left side
    edgeTriangle(-mainX, -innerY, -edgeZ,    -mainX, -innerY, edgeZ,    -mainX, innerY, edgeZ),
    edgeTriangle(-mainX, innerY, edgeZ,    -mainX, innerY, -edgeZ,    -mainX, -innerY, -edgeZ),

    // Right side
    edgeTriangle(mainX, -innerY, -edgeZ,    mainX, innerY, edgeZ,    mainX, -innerY, edgeZ),
    edgeTriangle(mainX, innerY, edgeZ,    mainX, -innerY, -edgeZ,    mainX, innerY, -edgeZ),

    // Top
    edgeTriangle(-innerX, -mainY, edgeZ,    -innerX, -mainY, -edgeZ,    innerX, -mainY, -edgeZ),
    edgeTriangle(innerX, -mainY, edgeZ,    -innerX, -mainY, edgeZ,    innerX, -mainY, -edgeZ),

    // Top
    edgeTriangle(-innerX, mainY, edgeZ,    innerX, mainY, -edgeZ,    -innerX, mainY, -edgeZ),
    edgeTriangle(innerX, mainY, edgeZ,    innerX, mainY, -edgeZ,    -innerX, mainY, edgeZ)
];

// We'll actually do double this many, as we will come in from both ends of the arc (since it is symmetrical).
var cornerSegments = 8;

// Append corners
var x_Prev = innerX + cornerRadius;
var y_Prev = innerY;
var altX_Prev = innerX;
var altY_Prev = innerY + cornerRadius;

for (var i = 1; i <= cornerSegments; i++) {
    var angle = i / cornerSegments / 2 * Math.PI / 2;

    var dX = Math.cos(angle) * cornerRadius;
    var dY = Math.sin(angle) * cornerRadius;

    var x = innerX + dX;
    var y = innerY + dY;
    var altX = innerX + dY;
    var altY = innerY + dX;

    // Front face bottom left corner
    deviceMesh.push(frontBlackTriangle(-x, y, -x_Prev, y_Prev, -innerX, innerY));
    deviceMesh.push(frontBlackTriangle(-innerX, innerY, -altX_Prev, altY_Prev, -altX, altY));

    // Front face top left corner
    deviceMesh.push(frontBlackTriangle(-innerX, -innerY, -x_Prev, -y_Prev, -x, -y));
    deviceMesh.push(frontBlackTriangle(-altX, -altY, -altX_Prev, -altY_Prev, -innerX, -innerY));

    // Front face bottom right corner
    deviceMesh.push(frontBlackTriangle(innerX, innerY, x_Prev, y_Prev, x, y));
    deviceMesh.push(frontBlackTriangle(altX, altY, altX_Prev, altY_Prev, innerX, innerY));

    // Front face top right corner
    deviceMesh.push(frontBlackTriangle(x, -y, x_Prev, -y_Prev, innerX, -innerY));
    deviceMesh.push(frontBlackTriangle(innerX, -innerY, altX_Prev, -altY_Prev, altX, -altY));

    // Back face bottom left corner
    deviceMesh.push(backBlackTriangle(-x, y, -innerX, innerY, -x_Prev, y_Prev));
    deviceMesh.push(backBlackTriangle(-innerX, innerY, -altX, altY, -altX_Prev, altY_Prev));

    // Back face top left corner
    deviceMesh.push(backBlackTriangle(-innerX, -innerY, -x, -y, -x_Prev, -y_Prev));
    deviceMesh.push(backBlackTriangle(-altX, -altY, -innerX, -innerY, -altX_Prev, -altY_Prev));

    // Back face bottom right corner
    deviceMesh.push(backBlackTriangle(innerX, innerY, x, y, x_Prev, y_Prev));
    deviceMesh.push(backBlackTriangle(altX, altY, innerX, innerY, altX_Prev, altY_Prev));

    // Back face top right corner
    deviceMesh.push(backBlackTriangle(x, -y, innerX, -innerY, x_Prev, -y_Prev));
    deviceMesh.push(backBlackTriangle(innerX, -innerY, altX, -altY, altX_Prev, -altY_Prev));

    // Bottom left corner edge
    deviceMesh.push(edgeTriangle(-x_Prev, y_Prev, -edgeZ,    -x_Prev, y_Prev, edgeZ,    -x, y, edgeZ));
    deviceMesh.push(edgeTriangle(-x_Prev, y_Prev, -edgeZ,    -x, y, edgeZ,    -x, y, -edgeZ));
    deviceMesh.push(edgeTriangle(-altX, altY, edgeZ,    -altX_Prev, altY_Prev, edgeZ,    -altX_Prev, altY_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(-altX, altY, -edgeZ,    -altX, altY, edgeZ,    -altX_Prev, altY_Prev, -edgeZ));

    // Top right corner edge
    deviceMesh.push(edgeTriangle(x_Prev, -y_Prev, -edgeZ,    x_Prev, -y_Prev, edgeZ,    x, -y, edgeZ));
    deviceMesh.push(edgeTriangle(x_Prev, -y_Prev, -edgeZ,    x, -y, edgeZ,    x, -y, -edgeZ));
    deviceMesh.push(edgeTriangle(altX, -altY, edgeZ,    altX_Prev, -altY_Prev, edgeZ,    altX_Prev, -altY_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(altX, -altY, -edgeZ,    altX, -altY, edgeZ,    altX_Prev, -altY_Prev, -edgeZ));

    // Bottom right corner edge
    deviceMesh.push(edgeTriangle(x, y, edgeZ,    x_Prev, y_Prev, edgeZ,    x_Prev, y_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(x, y, -edgeZ,    x, y, edgeZ,    x_Prev, y_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(altX_Prev, altY_Prev, -edgeZ,    altX_Prev, altY_Prev, edgeZ,    altX, altY, edgeZ));
    deviceMesh.push(edgeTriangle(altX_Prev, altY_Prev, -edgeZ,    altX, altY, edgeZ,    altX, altY, -edgeZ));

    // Top left corner edge
    deviceMesh.push(edgeTriangle(-x, -y, edgeZ,    -x_Prev, -y_Prev, edgeZ,    -x_Prev, -y_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(-x, -y, -edgeZ,    -x, -y, edgeZ,    -x_Prev, -y_Prev, -edgeZ));
    deviceMesh.push(edgeTriangle(-altX_Prev, -altY_Prev, -edgeZ,    -altX_Prev, -altY_Prev, edgeZ,    -altX, -altY, edgeZ));
    deviceMesh.push(edgeTriangle(-altX_Prev, -altY_Prev, -edgeZ,    -altX, -altY, edgeZ,    -altX, -altY, -edgeZ));

    x_Prev = x;
    y_Prev = y;
    altX_Prev = altX;
    altY_Prev = altY;
}

function frontBlackTriangle(x1, y1, x2, y2, x3, y3) {
    return [x1, y1, z, x2, y2, z, x3, y3, z, 40, 40, 40, -1, 0];
}

function backBlackTriangle(x1, y1, x2, y2, x3, y3) {
    return [x1, y1, -z, x2, y2, -z, x3, y3, -z, 40, 40, 40, -1, 0];
}

function edgeTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    return [x1, y1, z1, x2, y2, z2, x3, y3, z3, 128, 128, 128, -1, 0];
}

fs.writeFileSync('device-mesh.json', JSON.stringify(deviceMesh, null));