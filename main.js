let pause = false; //for halting printouts

let mode = 0;
const modes = [
    "Projection",
    "Transformations",
    "Culling",
    "Shading",
    "Camera",
    "Clipping: World",
    "Clipping: Screen",
    "End"
]

const modeDisplay = document.getElementById("modeDisplay");
const modeList = document.getElementById("modeList");

const WIDTH = 700;
const HEIGHT = 500;

// Geometry buffers
let vertices = [];
let faces = [];

// Camera and clipping fields
const FOV = 90;
const Z_NEAR = 0.1;
const Z_FAR = 1000;
const MOVE_SPEED = 0.03;
let camera = {
    up: [0, 1, 0],
    forward: [0, 0, 1],
    pos: [0, 0, 0],
}

// Tranformation Matrix (World space -> Camera space -> Screen space)
let worldToScreenMatrix;

// NOTE: TEMP Clipping plane for demonstrating clipping stage
var clippingPlane = {
    p: [0, 0, 0],
    n: [1, 0, 0],
}

// NOTE: TEMP fer spinnin'
const ROT_RATE = 0.0001;
let rotation = 0;

function setup() {
    let canvas = createCanvas(WIDTH, HEIGHT);
    canvas.parent("canvas");

    modes.forEach(mode => {
        var li = document.createElement("li");
        //li.textContent = mode;
        //modeList.appendChild(li);
    });
}

function draw() {
    if (!pause) {
        background(172, 182, 189);

        // Calculate (World space -> Camera space -> Screen space) Matrix
        worldToScreenMatrix = matrixMultiply(projMatrix(), lookAtMatrix());

        faces.forEach(face => {

            // NOTE: TEMP Move the model into view and give 'er a spin
            face = face.map(i => {
                let p = [...vertices[i]];

                // Create transformation matrix
                if (checkMode("Transformations")) {
                    rotation += ROT_RATE;
                }

                const R = matrixMultiply(xRotMatrix(rotation), zRotMatrix(rotation));
                const T = matrixMultiply(transMatrix(0, 0, 3), R);
                return vTransform(p, T);
            });

            // Skip rendering away-facing triangles
            const normal = getNormal(face);
            if (vDotProduct(normal, vSub(camera.pos, face[0])) < 0 && checkMode("Culling")) {
                return;
            }

            if (checkMode("Clipping: World")) {
                // Clip geometry by near and far view planes
                const nearPoint = vAdd(camera.pos, vScale(camera.forward, Z_NEAR));
                face = clipAgainstPlane({ n: camera.forward, p: nearPoint }, face);

                const farPoint = vAdd(camera.pos, vScale(camera.forward, Z_FAR));
                face = clipAgainstPlane({ n: vScale(camera.forward, -1), p: farPoint }, face);
            }

            // NOTE: TEMP for demonstrative purposes
            if (modes[mode] === "Clipping: World") {
                face = clipAgainstPlane(clippingPlane, face);
            }

            // Convert face data from world to screen coordinates
            face = worldToScreen(face);

            if (modes[mode] === "Clipping: Screen") {
                face = clipAgainstBorders(WIDTH / 4, WIDTH * 3 / 4, HEIGHT / 4, HEIGHT * 3 / 4, face);
                noFill();
                stroke(0);
                rect(WIDTH / 4, HEIGHT / 4, WIDTH / 2, HEIGHT / 2);
            } else {
                face = clipAgainstBorders(0, WIDTH, 0, HEIGHT, face);
            }

            // Calculate face shading relative to camera
            if (checkMode("Shading")) {
                noStroke();
                let percentage = 1 - vAngle(normal, vScale(camera.forward, -1)) * 2 / Math.PI;
                fill(percentage * 160 + 50);
            } else {
                stroke(0);
                strokeWeight(1);
                noFill();
            }

            i = 0;
            while (i + 2 < face.length) {
                triangle(...face[0], ...face[i + 1], ...face[i + 2]);
                i++;
            }

        });

        actOnHeldKeys();
    }
}

function checkMode(reqMode) {
    return modes.indexOf(reqMode) <= mode;
}

function updateMode(newMode) {
    if (newMode >= 0 && newMode < modes.length) {
        mode = newMode;
        modeDisplay.textContent = modes[mode];
    }
}

function worldToScreen(points) {
    return points.map(p => {
        p = vTransform(p, worldToScreenMatrix);
        return [(p[0] + 1) / 2 * WIDTH, (p[1] + 1) / 2 * HEIGHT];
    });
}

//------------------CLIPPING----------------


function pointRelPlane(plane, p) {
    return vDotProduct(plane.n, p) - vDotProduct(plane.n, plane.p);
}

function lineIntersectPlane(plane, p, dir) {
    let dot = vDotProduct(plane.n, dir);
    if (dot === 0) return false;

    let t = vDotProduct(plane.n, vSub(plane.p, p)) / dot;
    return vAdd(p, vScale(dir, t));
}

function clipAgainstPlane(plane, f) {
    let points = [];

    for (i = 0; i < f.length; i++) {
        let pCurr = f[i];
        let pPrev = f[(i - 1 + f.length) % f.length]

        let intersection = lineIntersectPlane(plane, pCurr, vSub(pPrev, pCurr))

        if (pointRelPlane(plane, pCurr) > 0) {
            if (pointRelPlane(plane, pPrev) <= 0)
                points.push(intersection);
            points.push(pCurr);
        } else if (pointRelPlane(plane, pPrev) > 0) {
            points.push(intersection);
        }
    }

    return points;
}

function clipAgainstBorders(x1, x2, y1, y2, f) {

    f = clipAgainstPlane({ p: [x1, 0], n: [1, 0] }, f);
    f = clipAgainstPlane({ p: [x2, 0], n: [-1, 0] }, f);
    f = clipAgainstPlane({ p: [0, y1], n: [0, 1] }, f);
    f = clipAgainstPlane({ p: [0, y2], n: [0, -1] }, f);

    return f;
}

//----------------------FACES---------------------

function getNormal(f) {
    let u = vSub(f[1], f[0]);
    let v = vSub(f[2], f[0]);
    return vNormalize(vCrossProduct(u, v));
}

//---------------------VECTORS--------------------

function vAdd(u, v) {
    return u.map((_, i) => u[i] + v[i]);
}

function vSub(u, v) {
    return u.map((_, i) => u[i] - v[i]);
}

function vScale(v, c) {
    return v.map(a => a * c);
}

function vDotProduct(u, v) {
    return u.reduce((acc, _, i) => acc + u[i] * v[i], 0);
}

function vCrossProduct(u, v) {
    const n = v.length;
    w = [];
    for (i = 0; i < n; i++) {
        w.push(u[(i + 1) % n] * v[(i + 2) % n] - u[(i + 2) % n] * v[(i + 1) % n])
    }
    return w;
}

function vMagnitude(v) {
    return Math.sqrt(v.reduce((acc, a) => acc + a * a, 0));
}

function vNormalize(v) {
    return vScale(v, 1 / vMagnitude(v))
}

function vAngle(u, v) {
    return Math.acos(vDotProduct(vNormalize(u), vNormalize(v)));
}

function vHom(v) {
    return [...v, 1];
}

function vCart(v) {
    return v[3] === 0 ? v.slice(0, 3) : v.slice(0, 3).map(a => a / v[3]);
}

function vTransform(v, M) {
    return vCart(M.map(r => vDotProduct(vHom(v), r)));
}

//--------------------MATRICES----------------------

const aspect = HEIGHT / WIDTH;
const fovRad = 1 / Math.tan(FOV / 2 * Math.PI / 180);
const farRatio = Z_FAR / (Z_FAR - Z_NEAR);

function emptyMatrix() {
    return Array(4).fill().map(() => Array(4).fill(0));
}

function identityMatrix() {
    const M = emptyMatrix();
    M[0][0] = 1;
    M[1][1] = 1;
    M[2][2] = 1;
    M[3][3] = 1;
    return M;
}

function transMatrix(x, y, z) {
    const M = identityMatrix();
    M[0][3] = x;
    M[1][3] = y;
    M[2][3] = z;
    return M;
}

function xRotMatrix(a) {
    const M = identityMatrix();
    M[1][1] = Math.cos(a);
    M[1][2] = -Math.sin(a);
    M[2][1] = Math.sin(a);
    M[2][2] = Math.cos(a);
    return M;
}

function yRotMatrix(a) {
    const M = identityMatrix();
    M[0][0] = Math.cos(a);
    M[0][2] = Math.sin(a);
    M[2][0] = -Math.sin(a);
    M[2][2] = Math.cos(a);
    return M;
}

function zRotMatrix(a) {
    const M = identityMatrix();
    M[0][0] = Math.cos(a);
    M[0][1] = -Math.sin(a);
    M[1][0] = Math.sin(a);
    M[1][1] = Math.cos(a);
    return M;
}

function projMatrix() {
    const M = emptyMatrix();
    M[0][0] = fovRad * aspect;
    M[1][1] = fovRad;
    M[2][2] = farRatio;
    M[2][3] = -farRatio * Z_NEAR;
    M[3][2] = 1;
    return M;
}

function lookAtMatrix() {
    let a = vAngle([0, 0, 1], camera.forward);
    if (vDotProduct([0, 0, 1], vCrossProduct([0, 1, 0], camera.forward)) > 0) {
        a = -a;
    }
    return matrixMultiply(yRotMatrix(-a), transMatrix(...vScale(camera.pos, -1)))
}

function transpose(M) {
    let N = emptyMatrix();
    for (i = 0; i < 4; i++) {
        for (j = 0; j < 4; j++) {
            N[i][j] = M[j][i];
        }
    }
    return N;
}

function matrixMultiply(M, N) {
    const NT = transpose(N);
    return M.map(r => NT.map(c => vDotProduct(r, c)));
}

//--------------------KEY INPUT---------------------

let heldKey = { x: "none", y: "none", r: "none" };

function actOnHeldKeys() {
    if (heldKey.y === "up") {
        camera.pos = vAdd(camera.pos, vScale(camera.forward, MOVE_SPEED))
    } else if (heldKey.y === "down") {
        camera.pos = vAdd(camera.pos, vScale(camera.forward, -MOVE_SPEED))
    }

    if (heldKey.x === "left") {
        camera.pos = vAdd(camera.pos, vScale(vCrossProduct(camera.up, camera.forward), -MOVE_SPEED))
    } else if (heldKey.x === "right") {
        camera.pos = vAdd(camera.pos, vScale(vCrossProduct(camera.up, camera.forward), MOVE_SPEED))
    }

    if (heldKey.r === "left") {
        camera.forward = vNormalize(vTransform(camera.forward, yRotMatrix(-MOVE_SPEED)))
    } else if (heldKey.r === "right") {
        camera.forward = vNormalize(vTransform(camera.forward, yRotMatrix(MOVE_SPEED)))
    }
}

function keyPressed() {
    if (key === "w") {
        heldKey.y = "up";
    } else if (key === "s") {
        heldKey.y = "down";
    } else if (key === "a") {
        heldKey.x = "left";
    } else if (key === "d") {
        heldKey.x = "right";
    } else if (key === "q") {
        heldKey.r = "left";
    } else if (key === "e") {
        heldKey.r = "right";
    } else if (keyCode === LEFT_ARROW) {
        updateMode(mode - 1);
    } else if (keyCode === RIGHT_ARROW) {
        updateMode(mode + 1);
    } else if (/^[0-9]$/i.test(key)) {
        updateMode(parseInt(key) - 1);
    } else if (key === 'r') {
        camera = {
            up: [0, 1, 0],
            forward: [0, 0, 1],
            pos: [0, 0, 0],
        }
    } else if (key === 'p') {
        pause = !pause;
    }
}

function keyReleased() {
    if (key === "w") {
        heldKey.y = keyIsDown(115) ? "down" : "none";
    } else if (key === "s") {
        heldKey.y = keyIsDown(119) ? "up" : "none";
    } else if (key === "a") {
        heldKey.x = keyIsDown(100) ? "right" : "none";
    } else if (key === "d") {
        heldKey.x = keyIsDown(97) ? "left" : "none";
    } else if (key === "q") {
        heldKey.r = keyIsDown("e".charCodeAt(0)) ? "right" : "none";
    } else if (key === "e") {
        heldKey.r = keyIsDown("q".charCodeAt(0)) ? "left" : "none";
    }
}

//--------------------FILE PARSING---------------------

function parseObj(result) {
    vertices = [];
    faces = [];

    let lines = result.split('\n');

    lines.forEach(line => {
        let symbols = line.split(/\s+/g);

        let token = symbols[0];
        symbols = symbols.slice(1);
        if (token === "v") {
            vertices.push(symbols.map(x => +x));
        } else if (token === "f") {
            faces.push(symbols.map(index => index - 1));
        }
    });
}

function readFile(input) {
    let file = input.files[0];
    let reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function() {
        parseObj(reader.result);
        updateMode(mode);
    };

    reader.onerror = function() {
        console.log(reader.error);
    };
}