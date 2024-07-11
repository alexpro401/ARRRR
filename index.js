import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.module.js';

let scene, camera, renderer;
let cube;

let userLevel = 1;
let userExperience = 0;

let gameActive = false;
let gameScore = 0;
let gameTimer = 30;
let gameInterval;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    // Добавляем обработчик для кнопки старта игры
    document.getElementById('startGameBtn').addEventListener('click', startMiniGame);
}

function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startMiniGame() {
    if (gameActive) return;
    gameActive = true;
    gameScore = 0;
    gameTimer = 30;
    updateGameUI();
    gameInterval = setInterval(updateGame, 1000);
    document.getElementById('gameContainer').style.display = 'block';
}

function updateGame() {
    gameTimer--;
    if (gameTimer <= 0) {
        endGame();
    }
    updateGameUI();
}

function endGame() {
    clearInterval(gameInterval);
    gameActive = false;
    const earnedTokens = Math.floor(gameScore / 10);
    window.Telegram.WebApp.showPopup({
        title: "Game Over",
        message: `You scored ${gameScore} points and earned ${earnedTokens} MMX tokens!`,
        buttons: [{text: "Awesome!"}]
    });
    document.getElementById('gameContainer').style.display = 'none';
}

function updateGameUI() {
    document.getElementById('gameScore').textContent = `Score: ${gameScore}`;
    document.getElementById('gameTimer').textContent = `Time: ${gameTimer}s`;
}

window.addEventListener('resize', onWindowResize);

// Инициализация Telegram Web App
window.Telegram.WebApp.ready();

// Запуск приложения
init();
animate();