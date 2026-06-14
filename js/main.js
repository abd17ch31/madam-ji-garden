const starsContainer = document.getElementById("stars");
const garden = document.getElementById("garden");
const grass = document.getElementById("grass");
const lovePopup = document.getElementById("lovePopup");

const SVG_NS = "http://www.w3.org/2000/svg";

const plants = [];
const bloomedPlants = [];
const butterflies = [];
const fireflies = [];

let time = 0;
let lastFrameTime = performance.now();
let plantId = 0;
let lovePopupTimer = null;

const grassHeight = window.innerHeight * 0.18;
const groundY = window.innerHeight - grassHeight;
const STEM_GROW_SPEED = 360;
const STEM_SEGMENT_LENGTH = 7;
const BUTTERFLY_OFFSCREEN = 70;

createStars();
createGardenDefs();
createGrassBlades();
createFireflies();
createButterflies();

garden.addEventListener("pointerdown", createPlant);

function createStars() {
    const count = 150;

    for (let i = 0; i < count; i++) {
        const star = document.createElement("div");
        const size = Math.random() * 3 + 1;

        star.classList.add("star");
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 4}s`;
        star.style.animationDelay = `${Math.random() * 5}s`;

        starsContainer.appendChild(star);
    }
}

function createGardenDefs() {
    const defs = svgElement("defs");

    defs.innerHTML = `
        <filter id="budGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <filter id="flowerGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.4" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <filter id="fireflyGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0a3517"/>
            <stop offset="24%" stop-color="#13702d"/>
            <stop offset="52%" stop-color="#26b34b"/>
            <stop offset="76%" stop-color="#167c31"/>
            <stop offset="100%" stop-color="#082b13"/>
        </linearGradient>

        <radialGradient id="sunflowerCenter" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stop-color="#6b3f18"/>
            <stop offset="55%" stop-color="#3f2410"/>
            <stop offset="100%" stop-color="#1f1208"/>
        </radialGradient>

        <radialGradient id="butterflyWingPink" cx="34%" cy="35%" r="74%">
            <stop offset="0%" stop-color="#fff2a8"/>
            <stop offset="45%" stop-color="#ff7ab8"/>
            <stop offset="100%" stop-color="#8c2d9f"/>
        </radialGradient>

        <radialGradient id="butterflyWingBlue" cx="34%" cy="35%" r="74%">
            <stop offset="0%" stop-color="#e8fff8"/>
            <stop offset="48%" stop-color="#54d7ff"/>
            <stop offset="100%" stop-color="#2855bd"/>
        </radialGradient>

        <filter id="butterflyShadow" x="-90%" y="-90%" width="280%" height="280%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
    `;

    garden.appendChild(defs);
}

function createGrassBlades() {
    const count = Math.max(90, Math.floor(window.innerWidth / 14));

    for (let i = 0; i < count; i++) {
        const blade = document.createElement("span");
        const height = 28 + Math.random() * grassHeight * 0.85;
        const lean = -12 + Math.random() * 24;
        const delay = Math.random() * -4;

        blade.classList.add("grass-blade");
        blade.style.left = `${Math.random() * 100}%`;
        blade.style.height = `${height}px`;
        blade.style.width = `${1 + Math.random() * 2}px`;
        blade.style.setProperty("--lean", `${lean}deg`);
        blade.style.animationDelay = `${delay}s`;
        blade.style.opacity = `${0.45 + Math.random() * 0.45}`;

        grass.appendChild(blade);
    }
}

function createPlant(event) {
    if (event.clientY > groundY - 20) {
        return;
    }

    const plant = {
        id: plantId++,
        targetX: event.clientX,
        targetY: event.clientY,
        expectedPoints:
            Math.max(
                1,
                Math.ceil(
                    Math.hypot(
                        event.clientX - event.clientX,
                        event.clientY - groundY
                    ) / STEM_SEGMENT_LENGTH
                )
            ),
        bloomed: false,
        flowerBuilt: false,
        bloomScale: 0,
        dirtyStem: true,
        dirtyLeaves: false,
        flowerColor: getRandomFlowerColor(),
        flowerType: getRandomFlowerType(),
        leaves: [],
        nextLeafAt: 12,
        points: [
            {
                x: event.clientX,
                y: groundY
            }
        ],
        elements: createPlantElements()
    };

    plants.push(plant);
    bringButterfliesToFront();
}

function createPlantElements() {
    const group = svgElement("g", { class: "plant" });
    const stem = svgElement("path", {
        fill: "url(#stemGradient)",
        filter: "url(#budGlow)"
    });
    const highlight = svgElement("path", {
        fill: "none",
        stroke: "rgba(184, 255, 171, 0.55)",
        "stroke-width": 1.2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    });
    const leaves = svgElement("g");
    const flower = svgElement("g");
    const bud = svgElement("ellipse", {
        rx: 5,
        ry: 6,
        fill: "#4caf50",
        filter: "url(#budGlow)"
    });

    group.appendChild(stem);
    group.appendChild(highlight);
    group.appendChild(leaves);
    group.appendChild(flower);
    group.appendChild(bud);
    garden.appendChild(group);

    return {
        group,
        stem,
        highlight,
        leaves,
        flower,
        bud
    };
}

function updatePlants(delta) {
    plants.forEach((plant) => {
        if (plant.bloomed) {
            if (plant.bloomScale < 1) {
                plant.bloomScale +=
                    (1 - plant.bloomScale) *
                    (1 - Math.pow(0.88, delta * 60));
            }

            updateLeaves(plant, delta);
            return;
        }

        growPlantStem(plant, delta);

        addLeavesAsStemGrows(plant);
        updateLeaves(plant, delta);
    });
}

function growPlantStem(plant, delta) {
    let travel = Math.min(STEM_GROW_SPEED * delta, STEM_GROW_SPEED * 0.08);

    while (travel > 0 && !plant.bloomed) {
        const tip = plant.points[plant.points.length - 1];
        const dx = plant.targetX - tip.x;
        const dy = plant.targetY - tip.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 5) {
            plant.bloomed = true;
            buildFlower(plant);
            return;
        }

        const step = Math.min(distance, travel, STEM_SEGMENT_LENGTH);
        const progress = plant.points.length / Math.max(1, plant.expectedPoints || 1);
        const jitter = (Math.random() - 0.5) * 4 * (1 - Math.min(0.8, progress));

        plant.points.push({
            x: tip.x + (dx / distance) * step + jitter,
            y: tip.y + (dy / distance) * step
        });

        plant.dirtyStem = true;
        travel -= step;
    }
}

function addLeavesAsStemGrows(plant) {
    while (
        plant.points.length > plant.nextLeafAt &&
        plant.nextLeafAt < plant.points.length - 4
    ) {
        const side = plant.leaves.length % 2 === 0 ? -1 : 1;

        plant.leaves.push({
            pointIndex: plant.nextLeafAt,
            side,
            grow: 0,
            dirty: true,
            length: 22 + Math.random() * 11,
            width: 8 + Math.random() * 4,
            angle: side * (42 + Math.random() * 16)
        });
        plant.dirtyLeaves = true;

        plant.nextLeafAt += 16 + Math.floor(Math.random() * 8);
    }
}

function updateLeaves(plant, delta) {
    plant.leaves.forEach((leaf) => {
        if (leaf.grow < 1) {
            leaf.grow +=
                (1 - leaf.grow) *
                (1 - Math.pow(0.92, delta * 60));
            leaf.dirty = true;
            plant.dirtyLeaves = true;

            if (leaf.grow > 0.995) {
                leaf.grow = 1;
            }
        }
    });
}

function renderPlants() {
    plants.forEach((plant) => {
        const tip = plant.points[plant.points.length - 1];

        if (plant.dirtyStem) {
            plant.elements.stem.setAttribute("d", getTaperedStemPath(plant.points));
            plant.elements.highlight.setAttribute("d", getCenterLinePath(plant.points));
            plant.dirtyStem = false;
        }

        if (plant.dirtyLeaves) {
            renderLeaves(plant);
            plant.dirtyLeaves = false;
        }

        plant.elements.bud.setAttribute("cx", tip.x);
        plant.elements.bud.setAttribute("cy", tip.y);
        plant.elements.bud.setAttribute(
            "transform",
            `rotate(${Math.sin(time + plant.id) * 10} ${tip.x} ${tip.y})`
        );

        if (plant.bloomed) {
            plant.elements.flower.setAttribute(
                "transform",
                `translate(${tip.x} ${tip.y}) rotate(${Math.sin(time + tip.x * 0.01) * 10} 0 20) scale(${plant.bloomScale * 1.35})`
            );
            plant.elements.bud.setAttribute("opacity", "0");
        }
    });
}

function renderLeaves(plant) {
    const leafGroup = plant.elements.leaves;
    const needed = plant.leaves.length;

    while (leafGroup.childNodes.length < needed) {
        const leaf = svgElement("g");

        leaf.appendChild(svgElement("path", {
            fill: "#358b3e",
            opacity: 0.96
        }));
        leaf.appendChild(svgElement("path", {
            fill: "none",
            stroke: "#b7f59d",
            "stroke-width": 0.8,
            "stroke-linecap": "round",
            opacity: 0.65
        }));

        leafGroup.appendChild(leaf);
    }

    plant.leaves.forEach((leaf, index) => {
        const point = plant.points[leaf.pointIndex];
        const node = leafGroup.childNodes[index];
        const leafPath = node.childNodes[0];
        const vein = node.childNodes[1];
        const grow = easeOutBack(leaf.grow);
        const length = leaf.length * grow;
        const width = leaf.width * Math.max(0.15, grow);

        leafPath.setAttribute(
            "d",
            `
                M 0 0
                C ${leaf.side * width} ${-length * 0.16}, ${leaf.side * width * 1.3} ${-length * 0.66}, ${leaf.side * length} ${-length}
                C ${leaf.side * width * 0.35} ${-length * 0.82}, ${-leaf.side * width * 0.35} ${-length * 0.3}, 0 0
                Z
            `
        );
        vein.setAttribute(
            "d",
            `M 0 0 C ${leaf.side * width * 0.4} ${-length * 0.32}, ${leaf.side * width * 0.7} ${-length * 0.68}, ${leaf.side * length * 0.82} ${-length * 0.92}`
        );
        node.setAttribute(
            "transform",
            `translate(${point.x} ${point.y}) rotate(${leaf.angle + Math.sin(time * 1.4 + index) * 2})`
        );
        leaf.dirty = false;
    });
}

function buildFlower(plant) {
    if (plant.flowerBuilt) {
        return;
    }

    plant.elements.flower.innerHTML = "";

    if (plant.flowerType === "sunflower") {
        drawSunflower(plant.elements.flower);
    } else if (plant.flowerType === "tulip") {
        drawTulip(plant.elements.flower, plant.flowerColor);
    } else if (plant.flowerType === "blossom") {
        drawBlossom(plant.elements.flower, plant.flowerColor);
    } else if (plant.flowerType === "rose") {
        drawRose(plant.elements.flower, plant.flowerColor);
    } else if (plant.flowerType === "lotus") {
        drawLotus(plant.elements.flower, plant.flowerColor);
    } else if (plant.flowerType === "poppy") {
        drawPoppy(plant.elements.flower, plant.flowerColor);
    } else if (plant.flowerType === "orchid") {
        drawOrchid(plant.elements.flower, plant.flowerColor);
    } else {
        drawDaisy(plant.elements.flower, plant.flowerColor);
    }

    plant.flowerBuilt = true;
    bloomedPlants.push(plant);
}

function getCenterLinePath(points) {
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        const previous = points[i - 1];
        const controlX = (previous.x + point.x) / 2;
        const controlY = (previous.y + point.y) / 2;

        d += ` Q ${controlX} ${controlY} ${point.x} ${point.y}`;
    }

    return d;
}

function getTaperedStemPath(points) {
    if (points.length < 2) {
        return "";
    }

    const left = [];
    const right = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const previous = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const dx = next.x - previous.x || 0.01;
        const dy = next.y - previous.y || -1;
        const length = Math.hypot(dx, dy);
        const nx = -dy / length;
        const ny = dx / length;
        const progress = i / (points.length - 1);
        const width = getStemWidth(progress);

        left.push({
            x: point.x + nx * width,
            y: point.y + ny * width
        });
        right.push({
            x: point.x - nx * width,
            y: point.y - ny * width
        });
    }

    const all = left.concat(right.reverse());
    return `M ${all.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`;
}

function getStemWidth(progress) {
    const slimStem = 2.2 + 5.4 * Math.pow(1 - progress, 1.15);
    const trunkBase =
        progress < 0.38
            ? 19 * Math.pow(1 - progress / 0.38, 1.55)
            : 0;
    const rootFoot =
        progress < 0.09
            ? 12 * Math.pow(1 - progress / 0.09, 0.7)
            : 0;

    return slimStem + trunkBase + rootFoot;
}

function createFireflies() {
    for (let i = 0; i < 22; i++) {
        const glow = svgElement("circle", {
            r: 2 + Math.random() * 1.8,
            fill: "#fff79a",
            opacity: 0.9,
            filter: "url(#fireflyGlow)"
        });

        garden.appendChild(glow);

        fireflies.push({
            element: glow,
            x: Math.random() * window.innerWidth,
            y: Math.random() * groundY,
            drift: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.45,
            phase: Math.random() * Math.PI * 2
        });
    }
}

function updateFireflies() {
    fireflies.forEach((firefly) => {
        firefly.drift += 0.014 * firefly.speed;
        firefly.x += Math.cos(firefly.drift) * firefly.speed;
        firefly.y += Math.sin(firefly.drift * 0.9) * firefly.speed * 0.6;

        if (firefly.x < -20) firefly.x = window.innerWidth + 20;
        if (firefly.x > window.innerWidth + 20) firefly.x = -20;
        if (firefly.y < 30) firefly.y = groundY - 40;
        if (firefly.y > groundY - 20) firefly.y = 30;

        firefly.element.setAttribute("cx", firefly.x);
        firefly.element.setAttribute("cy", firefly.y);
        firefly.element.setAttribute(
            "opacity",
            0.35 + Math.sin(time * 2 + firefly.phase) * 0.3 + 0.3
        );
    });
}

function createButterflies() {
    for (let i = 0; i < 2; i++) {
        const group = svgElement("g");
        const palette = i === 0
            ? {
                wing: "url(#butterflyWingPink)",
                edge: "#5d2468",
                spot: "#fff4a8"
            }
            : {
                wing: "url(#butterflyWingBlue)",
                edge: "#173b7e",
                spot: "#eaffff"
            };

        group.classList.add("butterfly");
        group.setAttribute("role", "button");
        group.setAttribute("tabindex", "0");
        group.setAttribute("opacity", "0");
        group.style.cursor = "pointer";
        drawButterfly(group, palette);
        group.addEventListener("pointerdown", handleButterflyPointerDown);
        group.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                showLovePopup();
            }
        });
        garden.appendChild(group);

        butterflies.push({
            element: group,
            leftWing: group.querySelector(".left-wing"),
            rightWing: group.querySelector(".right-wing"),
            lowerLeftWing: group.querySelector(".lower-left-wing"),
            lowerRightWing: group.querySelector(".lower-right-wing"),
            state: "waiting",
            targetPlant: null,
            landingSide: "over",
            layer: "over",
            layerKey: "",
            x: -BUTTERFLY_OFFSCREEN,
            y: groundY * 0.45,
            targetX: -BUTTERFLY_OFFSCREEN,
            targetY: groundY * 0.45,
            exitX: -BUTTERFLY_OFFSCREEN,
            exitY: groundY * 0.45,
            nextChangeAt: time + 2 + i * 3,
            wanderUntil: 0,
            restUntil: 0,
            speed: 0.018,
            phase: i * 2.4,
            pathStyle: i
        });
    }
}

function drawButterfly(group, palette) {
    const tapTarget = svgElement("circle", {
        cx: 0,
        cy: 2,
        r: 36,
        fill: "transparent",
        "pointer-events": "all"
    });
    const wings = svgElement("g", {
        filter: "url(#butterflyShadow)"
    });
    const leftWing = svgElement("path", {
        class: "left-wing",
        d: "M -3 -4 C -18 -32, -45 -29, -43 -6 C -41 17, -19 20, -4 3 Z",
        fill: palette.wing,
        stroke: palette.edge,
        "stroke-width": 1.4,
        opacity: 0.96
    });
    const rightWing = svgElement("path", {
        class: "right-wing",
        d: "M 3 -4 C 18 -32, 45 -29, 43 -6 C 41 17, 19 20, 4 3 Z",
        fill: palette.wing,
        stroke: palette.edge,
        "stroke-width": 1.4,
        opacity: 0.96
    });
    const lowerLeft = svgElement("path", {
        class: "lower-left-wing",
        d: "M -5 4 C -27 8, -31 34, -10 29 C 3 26, 2 11, -5 4 Z",
        fill: palette.wing,
        stroke: palette.edge,
        "stroke-width": 1.2,
        opacity: 0.86
    });
    const lowerRight = svgElement("path", {
        class: "lower-right-wing",
        d: "M 5 4 C 27 8, 31 34, 10 29 C -3 26, -2 11, 5 4 Z",
        fill: palette.wing,
        stroke: palette.edge,
        "stroke-width": 1.2,
        opacity: 0.86
    });
    const leftVeins = svgElement("path", {
        d: "M -6 -1 C -18 -8, -28 -17, -38 -9 M -7 1 C -20 4, -27 11, -35 14 M -8 6 C -18 14, -21 24, -13 28",
        fill: "none",
        stroke: palette.edge,
        "stroke-width": 0.8,
        "stroke-linecap": "round",
        opacity: 0.38
    });
    const rightVeins = svgElement("path", {
        d: "M 6 -1 C 18 -8, 28 -17, 38 -9 M 7 1 C 20 4, 27 11, 35 14 M 8 6 C 18 14, 21 24, 13 28",
        fill: "none",
        stroke: palette.edge,
        "stroke-width": 0.8,
        "stroke-linecap": "round",
        opacity: 0.38
    });
    const body = svgElement("path", {
        d: "M -3 -8 C -5 1, -5 16, 0 24 C 5 16, 5 1, 3 -8 C 1 -11, -1 -11, -3 -8 Z",
        fill: "#23170f"
    });
    const bodyHighlight = svgElement("path", {
        d: "M 0 -7 C -1 0, -1 12, 0 20",
        fill: "none",
        stroke: "#7a5b39",
        "stroke-width": 0.9,
        "stroke-linecap": "round",
        opacity: 0.7
    });
    const antennaLeft = svgElement("path", {
        d: "M -1 -8 C -9 -20, -17 -18, -20 -27",
        fill: "none",
        stroke: "#21160f",
        "stroke-width": 1,
        "stroke-linecap": "round"
    });
    const antennaRight = svgElement("path", {
        d: "M 1 -8 C 9 -20, 17 -18, 20 -27",
        fill: "none",
        stroke: "#21160f",
        "stroke-width": 1,
        "stroke-linecap": "round"
    });

    wings.appendChild(leftWing);
    wings.appendChild(rightWing);
    wings.appendChild(lowerLeft);
    wings.appendChild(lowerRight);

    [
        [-27, -8, 4.4],
        [-18, 6, 3.2],
        [-13, 20, 2.4],
        [27, -8, 4.4],
        [18, 6, 3.2],
        [13, 20, 2.4]
    ].forEach(([cx, cy, r]) => {
        wings.appendChild(svgElement("circle", {
            cx,
            cy,
            r,
            fill: palette.spot,
            stroke: palette.edge,
            "stroke-width": 0.5,
            opacity: 0.68
        }));
    });

    wings.appendChild(leftVeins);
    wings.appendChild(rightVeins);

    group.appendChild(tapTarget);
    group.appendChild(wings);
    group.appendChild(body);
    group.appendChild(bodyHighlight);
    group.appendChild(antennaLeft);
    group.appendChild(antennaRight);
}

function handleButterflyPointerDown(event) {
    event.stopPropagation();
    showLovePopup();
}

function updateButterflies() {
    butterflies.forEach((butterfly, index) => {
        updateButterflyState(butterfly, index);
        moveButterfly(butterfly);

        const flutter = 1 + Math.sin(time * 8 + butterfly.phase) * 0.08;
        const bob = butterfly.state === "wandering" && butterfly.targetPlant
            ? Math.sin(time * 2 + butterfly.phase) * 1.4
            : Math.sin(time * 2 + butterfly.phase) * 5;
        const wingOpen = 1 + Math.sin(time * 9 + butterfly.phase) * 0.18;

        butterfly.leftWing.setAttribute(
            "transform",
            `scale(${wingOpen} 1) rotate(${-Math.abs(Math.sin(time * 8 + butterfly.phase)) * 5} -3 0)`
        );
        butterfly.rightWing.setAttribute(
            "transform",
            `scale(${wingOpen} 1) rotate(${Math.abs(Math.sin(time * 8 + butterfly.phase)) * 5} 3 0)`
        );
        butterfly.lowerLeftWing.setAttribute(
            "transform",
            `scale(${wingOpen * 0.98} 1)`
        );
        butterfly.lowerRightWing.setAttribute(
            "transform",
            `scale(${wingOpen * 0.98} 1)`
        );

        butterfly.element.setAttribute(
            "transform",
            `translate(${butterfly.x} ${butterfly.y + bob}) scale(${flutter}) rotate(${Math.sin(time + butterfly.phase) * 8})`
        );

        placeButterflyLayer(butterfly);
    });
}

function updateButterflyState(butterfly, index) {
    if (butterfly.state === "waiting" && time >= butterfly.nextChangeAt) {
        startButterflyVisit(butterfly, index);
        return;
    }

    if (butterfly.state === "entering" && getButterflyTargetDistance(butterfly) < 14) {
        butterfly.state = "wandering";
        butterfly.wanderUntil = time + 6 + Math.random() * 7;
        chooseButterflyWanderTarget(butterfly, index);
        return;
    }

    if (butterfly.state === "wandering") {
        if (time >= butterfly.wanderUntil) {
            startButterflyExit(butterfly);
            return;
        }

        if (getButterflyTargetDistance(butterfly) < 16 && time >= butterfly.nextChangeAt) {
            chooseButterflyWanderTarget(butterfly, index);
        }

        return;
    }

    if (
        butterfly.state === "leaving" &&
        (isButterflyOffscreen(butterfly) || getButterflyTargetDistance(butterfly) < 18)
    ) {
        butterfly.state = "waiting";
        butterfly.targetPlant = null;
        butterfly.layer = "over";
        butterfly.nextChangeAt = time + 4 + Math.random() * 8;
        butterfly.element.setAttribute("opacity", "0");
        placeButterflyLayer(butterfly, true);
    }
}

function startButterflyVisit(butterfly, index) {
    const entrance = getRandomScreenEdgePoint(true);
    const firstTarget = getRandomGardenPoint();

    butterfly.state = "entering";
    butterfly.targetPlant = null;
    butterfly.layer = "over";
    butterfly.x = entrance.x;
    butterfly.y = entrance.y;
    butterfly.targetX = firstTarget.x + index * 12;
    butterfly.targetY = firstTarget.y;
    butterfly.speed = 0.012 + Math.random() * 0.012;
    butterfly.pathStyle = Math.floor(Math.random() * 4);
    butterfly.phase = Math.random() * Math.PI * 2;
    butterfly.nextChangeAt = time + 1.2 + Math.random() * 1.8;
    butterfly.element.setAttribute("opacity", "1");
    placeButterflyLayer(butterfly, true);
}

function chooseButterflyWanderTarget(butterfly, index) {
    const shouldLand = bloomedPlants.length && Math.random() < 0.55;

    butterfly.targetPlant = shouldLand
        ? bloomedPlants[Math.floor(Math.random() * bloomedPlants.length)]
        : null;
    butterfly.landingSide = Math.random() < 0.5 ? "over" : "under";
    butterfly.layer = Math.random() < 0.55 ? "over" : "under";

    if (butterfly.targetPlant) {
        const tip =
            butterfly.targetPlant.points[butterfly.targetPlant.points.length - 1];

        butterfly.targetX =
            tip.x +
            (index === 0 ? -18 : 18) +
            Math.sin(butterfly.phase + time) * 12;
        butterfly.targetY = tip.y + (butterfly.landingSide === "over" ? -38 : 25);
        butterfly.restUntil = time + 1.6 + Math.random() * 2.4;
    } else {
        const point = getRandomGardenPoint();

        butterfly.targetX = point.x;
        butterfly.targetY = point.y;
        butterfly.restUntil = 0;
    }

    butterfly.speed = 0.014 + Math.random() * 0.018;
    butterfly.nextChangeAt =
        butterfly.restUntil || time + 1.8 + Math.random() * 2.8;
    placeButterflyLayer(butterfly, true);
}

function startButterflyExit(butterfly) {
    const exit = getRandomScreenEdgePoint(false);

    butterfly.state = "leaving";
    butterfly.targetPlant = null;
    butterfly.layer = "over";
    butterfly.targetX = exit.x;
    butterfly.targetY = exit.y;
    butterfly.speed = 0.014 + Math.random() * 0.016;
    placeButterflyLayer(butterfly, true);
}

function moveButterfly(butterfly) {
    if (butterfly.state === "waiting") {
        return;
    }

    const distance = getButterflyTargetDistance(butterfly);
    const driftX = Math.sin(time * (1.5 + butterfly.pathStyle * 0.2) + butterfly.phase) * 0.75;
    const driftY = Math.cos(time * (1.2 + butterfly.pathStyle * 0.25) + butterfly.phase) * 0.55;
    const ease = butterfly.state === "wandering" && time < butterfly.restUntil
        ? butterfly.speed * 0.35
        : butterfly.speed;

    butterfly.x += (butterfly.targetX - butterfly.x) * ease + driftX;
    butterfly.y += (butterfly.targetY - butterfly.y) * ease + driftY;

    if (distance < 10 && butterfly.state === "wandering" && time < butterfly.restUntil) {
        butterfly.x += Math.sin(time * 4 + butterfly.phase) * 0.2;
        butterfly.y += Math.cos(time * 3 + butterfly.phase) * 0.16;
    }
}

function getButterflyTargetDistance(butterfly) {
    return Math.hypot(
        butterfly.targetX - butterfly.x,
        butterfly.targetY - butterfly.y
    );
}

function getRandomGardenPoint() {
    return {
        x: 80 + Math.random() * Math.max(80, window.innerWidth - 160),
        y: 70 + Math.random() * Math.max(80, groundY - 150)
    };
}

function getRandomScreenEdgePoint(isEntrance) {
    const side = Math.floor(Math.random() * 4);
    const edge = BUTTERFLY_OFFSCREEN;

    if (side === 0) {
        return {
            x: -edge,
            y: 60 + Math.random() * Math.max(60, groundY - 120)
        };
    }

    if (side === 1) {
        return {
            x: window.innerWidth + edge,
            y: 60 + Math.random() * Math.max(60, groundY - 120)
        };
    }

    if (side === 2) {
        return {
            x: 80 + Math.random() * Math.max(80, window.innerWidth - 160),
            y: -edge
        };
    }

    return {
        x: 80 + Math.random() * Math.max(80, window.innerWidth - 160),
        y: isEntrance
            ? groundY + edge
            : window.innerHeight + edge
    };
}

function isButterflyOffscreen(butterfly) {
    return (
        butterfly.x < -BUTTERFLY_OFFSCREEN ||
        butterfly.x > window.innerWidth + BUTTERFLY_OFFSCREEN ||
        butterfly.y < -BUTTERFLY_OFFSCREEN ||
        butterfly.y > window.innerHeight + BUTTERFLY_OFFSCREEN
    );
}

function bringButterfliesToFront() {
    butterflies.forEach((butterfly) => {
        placeButterflyLayer(butterfly, true);
    });
}

function placeButterflyLayer(butterfly, force = false) {
    const desiredKey = butterfly.targetPlant
        ? `${butterfly.layer}-${butterfly.targetPlant.id}`
        : "over-free";

    if (!force && butterfly.layerKey === desiredKey) {
        return;
    }

    if (!butterfly.targetPlant || butterfly.layer === "over") {
        garden.appendChild(butterfly.element);
        butterfly.layerKey = desiredKey;
        return;
    }

    garden.insertBefore(
        butterfly.element,
        butterfly.targetPlant.elements.group
    );
    butterfly.layerKey = desiredKey;
}

function showLovePopup() {
    lovePopup.classList.add("love-popup--visible");
    clearTimeout(lovePopupTimer);

    lovePopupTimer = setTimeout(() => {
        lovePopup.classList.remove("love-popup--visible");
    }, 3400);
}

function drawPetal(flower, rotation, color, options = {}) {
    const length = options.length || 42;
    const width = options.width || 9;
    const base = options.base || 3;
    const curve = options.curve || 0;
    const opacity = options.opacity || 0.98;
    const veinOpacity = options.veinOpacity || 0.18;

    const petal = svgElement("path", {
        d: `
            M 0 ${base}
            C ${-width} ${-length * 0.34}, ${-width * 0.78 + curve} ${-length * 0.78}, 0 ${-length}
            C ${width * 0.78 + curve} ${-length * 0.78}, ${width} ${-length * 0.34}, 0 ${base}
            Z
        `,
        fill: color,
        opacity,
        filter: "url(#flowerGlow)",
        transform: `rotate(${rotation})`
    });

    const shade = svgElement("path", {
        d: `
            M 0 ${base}
            C ${width * 0.48 + curve} ${-length * 0.35}, ${width * 0.26 + curve} ${-length * 0.72}, 0 ${-length}
            C ${width * 0.75 + curve} ${-length * 0.73}, ${width * 0.94} ${-length * 0.24}, 0 ${base}
            Z
        `,
        fill: shadeColor(color, -28),
        opacity: 0.25,
        transform: `rotate(${rotation})`
    });

    const vein = svgElement("path", {
        d: `M 0 ${base - 1} C ${curve * 0.35} ${-length * 0.34}, ${curve * 0.2} ${-length * 0.7}, 0 ${-length * 0.9}`,
        fill: "none",
        stroke: shadeColor(color, -55),
        "stroke-width": 0.65,
        "stroke-linecap": "round",
        opacity: veinOpacity,
        transform: `rotate(${rotation})`
    });

    flower.appendChild(petal);
    flower.appendChild(shade);
    flower.appendChild(vein);
}

function drawDaisy(flower, petalColor) {
    for (let layer = 0; layer < 2; layer++) {
        const count = layer === 0 ? 12 : 10;
        const offset = layer === 0 ? 0 : 18;

        for (let i = 0; i < count; i++) {
            drawPetal(
                flower,
                i * (360 / count) + offset,
                layer === 0 ? shadeColor(petalColor, -8) : shadeColor(petalColor, 18),
                {
                    length: layer === 0 ? 34 : 29,
                    width: layer === 0 ? 7 : 6,
                    opacity: layer === 0 ? 0.88 : 0.96,
                    curve: Math.sin(i) * 1.5
                }
            );
        }
    }

    drawPollenCenter(flower, 7, "#f6c64b", "#7b4b16");
}

function drawBlossom(flower, petalColor) {
    for (let i = 0; i < 5; i++) {
        const rotation = i * 72;

        flower.appendChild(svgElement("path", {
            d: `
                M 0 4
                C -17 -11, -18 -33, -4 -43
                C -2 -45, 2 -45, 4 -43
                C 18 -33, 17 -11, 0 4
                Z
            `,
            fill: shadeColor(petalColor, 10),
            opacity: 0.96,
            filter: "url(#flowerGlow)",
            transform: `rotate(${rotation})`
        }));
        flower.appendChild(svgElement("path", {
            d: "M 0 1 C -7 -12, -5 -29, 0 -39 C 5 -29, 7 -12, 0 1 Z",
            fill: shadeColor(petalColor, -30),
            opacity: 0.22,
            transform: `rotate(${rotation})`
        }));
    }

    drawPollenCenter(flower, 5.5, "#ffd96f", "#b8781f");
}

function drawSunflower(flower) {
    for (let i = 0; i < 24; i++) {
        drawPetal(flower, i * 15, i % 2 === 0 ? "#ffcf32" : "#f5a623", {
            length: i % 2 === 0 ? 42 : 35,
            width: 6.5,
            base: 5,
            opacity: 0.96,
            veinOpacity: 0.2
        });
    }

    flower.appendChild(svgElement("circle", {
        cx: 0,
        cy: 0,
        r: 11,
        fill: "url(#sunflowerCenter)",
        stroke: "#8a5a20",
        "stroke-width": 1.2
    }));

    for (let i = 0; i < 28; i++) {
        const angle = (i * 137.5 * Math.PI) / 180;
        const radius = 2 + (i % 7) * 1.15;

        flower.appendChild(svgElement("circle", {
            cx: Math.cos(angle) * radius,
            cy: Math.sin(angle) * radius,
            r: i % 3 === 0 ? 0.9 : 0.65,
            fill: i % 2 === 0 ? "#d69b34" : "#2d1a0b",
            opacity: 0.72
        }));
    }
}

function drawTulip(flower, petalColor) {
    flower.appendChild(svgElement("path", {
        d: `
            M -19 4
            C -24 -18, -13 -39, -1 -48
            C 12 -39, 23 -18, 19 4
            C 11 13, -10 13, -19 4
            Z
        `,
        fill: shadeColor(petalColor, -18),
        opacity: 0.9,
        filter: "url(#flowerGlow)"
    }));
    flower.appendChild(svgElement("path", {
        d: `
            M -18 5
            C -27 -12, -22 -34, -6 -46
            C -2 -30, -3 -8, 0 7
            C -7 12, -13 11, -18 5
            Z
        `,
        fill: shadeColor(petalColor, 8),
        opacity: 0.98
    }));
    flower.appendChild(svgElement("path", {
        d: `
            M 18 5
            C 27 -12, 22 -34, 6 -46
            C 2 -30, 3 -8, 0 7
            C 7 12, 13 11, 18 5
            Z
        `,
        fill: shadeColor(petalColor, -6),
        opacity: 0.98
    }));
    flower.appendChild(svgElement("path", {
        d: `
            M -9 8
            C -13 -12, -8 -36, 0 -50
            C 8 -36, 13 -12, 9 8
            C 4 12, -4 12, -9 8
            Z
        `,
        fill: shadeColor(petalColor, 18),
        opacity: 0.96
    }));
    flower.appendChild(svgElement("path", {
        d: "M 0 7 C 1 -10, 0 -31, 0 -45",
        fill: "none",
        stroke: shadeColor(petalColor, -55),
        "stroke-width": 0.8,
        "stroke-linecap": "round",
        opacity: 0.24
    }));
}

function drawRose(flower, petalColor) {
    for (let i = 0; i < 18; i++) {
        const rotation = i * 31;
        const size = 1 - i * 0.026;
        const shade = i % 2 === 0
            ? shadeColor(petalColor, -18)
            : shadeColor(petalColor, 12);

        flower.appendChild(svgElement("path", {
            d: `
                M 0 3
                C -13 -4, -18 -20, -7 -31
                C 1 -39, 17 -28, 14 -13
                C 12 -4, 6 2, 0 3
                Z
            `,
            fill: shade,
            opacity: 0.9,
            filter: i < 8 ? "url(#flowerGlow)" : "none",
            transform: `rotate(${rotation}) scale(${size}) translate(0 ${i * 0.25})`
        }));
    }

    flower.appendChild(svgElement("path", {
        d: "M -8 2 C -7 -9, 1 -15, 10 -9 C 12 1, 2 9, -8 2 Z",
        fill: shadeColor(petalColor, -35),
        opacity: 0.95
    }));
}

function drawLotus(flower, petalColor) {
    for (let layer = 0; layer < 3; layer++) {
        const count = layer === 0 ? 8 : 6;
        const offset = layer * 18;

        for (let i = 0; i < count; i++) {
            drawPetal(
                flower,
                i * (360 / count) + offset,
                shadeColor(petalColor, layer * 14 - 10),
                {
                    length: 34 - layer * 4,
                    width: 10 - layer,
                    base: 4,
                    opacity: 0.94,
                    curve: Math.sin(i + layer) * 2
                }
            );
        }
    }

    drawPollenCenter(flower, 5.5, "#ffe58b", "#bd7f1d");
}

function drawPoppy(flower, petalColor) {
    for (let i = 0; i < 6; i++) {
        const rotation = i * 60 + (i % 2) * 8;

        flower.appendChild(svgElement("path", {
            d: `
                M 0 5
                C -24 -4, -25 -34, -4 -42
                C 13 -48, 28 -26, 19 -7
                C 14 4, 5 8, 0 5
                Z
            `,
            fill: i % 2 === 0 ? shadeColor(petalColor, -8) : shadeColor(petalColor, 16),
            opacity: 0.92,
            filter: "url(#flowerGlow)",
            transform: `rotate(${rotation})`
        }));
    }

    flower.appendChild(svgElement("circle", {
        cx: 0,
        cy: 0,
        r: 8,
        fill: "#1c1617",
        opacity: 0.94
    }));

    drawPollenCenter(flower, 4, "#3c2824", "#f1c44e");
}

function drawOrchid(flower, petalColor) {
    const wingColor = shadeColor(petalColor, 4);
    const throatColor = shadeColor(petalColor, -30);

    [
        [-62, -2, 32, 12],
        [62, 2, 32, 12],
        [0, 0, 39, 13],
        [-25, 18, 27, 10],
        [25, -18, 27, 10]
    ].forEach(([rotation, curve, length, width]) => {
        drawPetal(flower, rotation, wingColor, {
            length,
            width,
            base: 5,
            curve,
            opacity: 0.92,
            veinOpacity: 0.24
        });
    });

    flower.appendChild(svgElement("path", {
        d: `
            M -9 3
            C -15 -11, -7 -25, 0 -19
            C 8 -26, 16 -10, 9 3
            C 5 12, -5 12, -9 3
            Z
        `,
        fill: throatColor,
        opacity: 0.9
    }));
    drawPollenCenter(flower, 3.5, "#fff0a8", "#9b5c1c");
}

function drawPollenCenter(flower, radius, fill, seedColor) {
    flower.appendChild(svgElement("circle", {
        cx: 0,
        cy: 0,
        r: radius,
        fill,
        stroke: shadeColor(seedColor, -20),
        "stroke-width": 0.8
    }));

    for (let i = 0; i < 12; i++) {
        const angle = (i * 30 * Math.PI) / 180;
        const seedRadius = radius * (0.25 + (i % 3) * 0.16);

        flower.appendChild(svgElement("circle", {
            cx: Math.cos(angle) * seedRadius,
            cy: Math.sin(angle) * seedRadius,
            r: 0.75,
            fill: seedColor,
            opacity: 0.48
        }));
    }
}

function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
}

function easeOutBack(value) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const x = Math.min(1, value) - 1;

    return 1 + c3 * x * x * x + c1 * x * x;
}

function shadeColor(color, amount) {
    const value = color.replace("#", "");
    const number = parseInt(value, 16);
    const red = Math.min(255, Math.max(0, (number >> 16) + amount));
    const green = Math.min(255, Math.max(0, ((number >> 8) & 255) + amount));
    const blue = Math.min(255, Math.max(0, (number & 255) + amount));

    return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
        .toString(16)
        .slice(1)}`;
}

function getRandomFlowerColor() {
    const colors = [
        "#ff80ab",
        "#ce93d8",
        "#fff176",
        "#81d4fa",
        "#f48fb1",
        "#ef9a9a",
        "#b39ddb",
        "#ff5a5f",
        "#f7a1c4",
        "#d6f6ff",
        "#ffb347"
    ];

    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomFlowerType() {
    const types = [
        "daisy",
        "tulip",
        "sunflower",
        "blossom",
        "rose",
        "lotus",
        "poppy",
        "orchid"
    ];

    return types[Math.floor(Math.random() * types.length)];
}

function animate(frameTime = performance.now()) {
    const delta = Math.min(0.05, (frameTime - lastFrameTime) / 1000);

    lastFrameTime = frameTime;
    time += delta * 3;

    updatePlants(delta);
    renderPlants();
    updateFireflies();
    updateButterflies();

    requestAnimationFrame(animate);
}

animate();
