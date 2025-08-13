"use client";

import { Power1, TweenLite } from "gsap";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function TowerBlockGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLDivElement>(null);
  const audioStartRef = useRef<HTMLAudioElement>(null);
  const audioStackRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Stage class from app.js
    class Stage {
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      camera: THREE.OrthographicCamera;
      light: THREE.DirectionalLight;
      softLight: THREE.AmbientLight;
      container: HTMLDivElement;

      constructor() {
        this.container = gameContainerRef.current!;
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xd0cbc7, 1);
        this.container.appendChild(this.renderer.domElement);
        this.scene = new THREE.Scene();
        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera = new THREE.OrthographicCamera(
          -d * aspect,
          d * aspect,
          d,
          -d,
          -100,
          1000
        );
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener("resize", this.onResize);
        this.onResize();
      }

      setCamera(y: number, speed = 0.3) {
        TweenLite.to(this.camera.position, speed, {
          y: y + 4,
          ease: Power1.easeInOut,
        });
        TweenLite.to(this.camera.lookAt, speed, {
          y: y,
          ease: Power1.easeInOut,
        });
      }

      onResize = () => {
        const viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
      };

      render = () => {
        this.renderer.render(this.scene, this.camera);
      };

      add = (elem: THREE.Object3D) => {
        this.scene.add(elem);
      };

      remove = (elem: THREE.Object3D) => {
        this.scene.remove(elem);
      };
    }

    // Block class from app.js
    class Block {
      targetBlock: Block | null;
      index: number;
      workingPlane: "x" | "z";
      workingDimension: "width" | "depth";
      dimension: { width: number; height: number; depth: number };
      position: { x: number; y: number; z: number };
      colorOffset: number;
      color: THREE.Color | number;
      STATES: { ACTIVE: string; STOPPED: string; MISSED: string };
      state: string;
      MOVE_AMOUNT: number;
      speed: number;
      direction: number;
      material: THREE.MeshToonMaterial;
      mesh: THREE.Mesh;

      constructor(block: Block | null) {
        this.STATES = {
          ACTIVE: "active",
          STOPPED: "stopped",
          MISSED: "missed",
        };
        this.MOVE_AMOUNT = 12;
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? "x" : "z";
        this.workingDimension = this.index % 2 ? "width" : "depth";

        this.dimension.width = this.targetBlock
          ? this.targetBlock.dimension.width
          : 10;
        this.dimension.height = this.targetBlock
          ? this.targetBlock.dimension.height
          : 2;
        this.dimension.depth = this.targetBlock
          ? this.targetBlock.dimension.depth
          : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock
          ? this.targetBlock.colorOffset
          : Math.round(Math.random() * 100);

        if (!this.targetBlock) {
          this.color = 0x333344;
        } else {
          const offset = this.index + this.colorOffset;
          const r = Math.sin(0.3 * offset) * 55 + 200;
          const g = Math.sin(0.3 * offset + 2) * 55 + 200;
          const b = Math.sin(0.3 * offset + 4) * 55 + 200;
          this.color = new THREE.Color(r / 255, g / 255, b / 255);
        }

        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
        const level = this.index - 1;
        const speedIncreaseFactor = Math.floor(level / 2);
        this.speed = -0.13 - this.index * 0.008 - speedIncreaseFactor * 0.025;
        if (this.speed < -4.5) this.speed = -4.5;
        this.direction = this.speed;

        const geometry = new THREE.BoxGeometry(
          this.dimension.width,
          this.dimension.height,
          this.dimension.depth
        );
        geometry.applyMatrix4(
          new THREE.Matrix4().makeTranslation(
            this.dimension.width / 2,
            this.dimension.height / 2,
            this.dimension.depth / 2
          )
        );
        this.material = new THREE.MeshToonMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(
          this.position.x,
          this.position.y + (this.state === this.STATES.ACTIVE ? 0 : 0),
          this.position.z
        );

        if (this.state === this.STATES.ACTIVE) {
          this.position[this.workingPlane] =
            Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
      }

      reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
      }

      place() {
        this.state = this.STATES.STOPPED;
        const overlap =
          this.targetBlock!.dimension[this.workingDimension] -
          Math.abs(
            this.position[this.workingPlane] -
              this.targetBlock!.position[this.workingPlane]
          );
        const blocksToReturn: any = {
          plane: this.workingPlane,
          direction: this.direction,
        };

        const maxPossibleOverlap =
          this.targetBlock!.dimension[this.workingDimension];
        const overlapPercentage = Math.max(0, overlap / maxPossibleOverlap);
        blocksToReturn.overlapPercentage = overlapPercentage;
        blocksToReturn.precisionScore = Math.round(overlapPercentage * 1000);

        const originalArea = this.dimension.width * this.dimension.depth;
        let placedArea = 0;
        let areaLost = 0;

        if (overlap > 0) {
          placedArea =
            this.workingDimension === "width"
              ? overlap * this.dimension.depth
              : this.dimension.width * overlap;
          areaLost = originalArea - placedArea;
        } else {
          areaLost = originalArea;
        }

        blocksToReturn.originalArea = originalArea;
        blocksToReturn.placedArea = placedArea;
        blocksToReturn.areaLost = areaLost;
        blocksToReturn.areaEfficiency =
          originalArea > 0 ? placedArea / originalArea : 0;

        if (this.dimension[this.workingDimension] - overlap < 0.3) {
          blocksToReturn.bonus = true;
          blocksToReturn.isPerfect = true;
          blocksToReturn.precisionScore = 1000;
          this.position.x = this.targetBlock!.position.x;
          this.position.z = this.targetBlock!.position.z;
          this.dimension.width = this.targetBlock!.dimension.width;
          this.dimension.depth = this.targetBlock!.dimension.depth;
        }

        if (overlap > 0) {
          const choppedDimensions = {
            width: this.dimension.width,
            height: this.dimension.height,
            depth: this.dimension.depth,
          };
          choppedDimensions[this.workingDimension] -= overlap;
          this.dimension[this.workingDimension] = overlap;

          const placedGeometry = new THREE.BoxGeometry(
            this.dimension.width,
            this.dimension.height,
            this.dimension.depth
          );
          placedGeometry.applyMatrix4(
            new THREE.Matrix4().makeTranslation(
              this.dimension.width / 2,
              this.dimension.height / 2,
              this.dimension.depth / 2
            )
          );
          const placedMesh = new THREE.Mesh(placedGeometry, this.material);

          const choppedGeometry = new THREE.BoxGeometry(
            choppedDimensions.width,
            choppedDimensions.height,
            choppedDimensions.depth
          );
          choppedGeometry.applyMatrix4(
            new THREE.Matrix4().makeTranslation(
              choppedDimensions.width / 2,
              choppedDimensions.height / 2,
              choppedDimensions.depth / 2
            )
          );
          const choppedMesh = new THREE.Mesh(choppedGeometry, this.material);

          const choppedPosition = {
            x: this.position.x,
            y: this.position.y,
            z: this.position.z,
          };

          if (
            this.position[this.workingPlane] <
            this.targetBlock!.position[this.workingPlane]
          ) {
            this.position[this.workingPlane] =
              this.targetBlock!.position[this.workingPlane];
          } else {
            choppedPosition[this.workingPlane] += overlap;
          }

          placedMesh.position.set(
            this.position.x,
            this.position.y,
            this.position.z
          );
          choppedMesh.position.set(
            choppedPosition.x,
            choppedPosition.y,
            choppedPosition.z
          );
          blocksToReturn.placed = placedMesh;

          if (!blocksToReturn.bonus) blocksToReturn.chopped = choppedMesh;
        } else {
          this.state = this.STATES.MISSED;
        }
        this.dimension[this.workingDimension] = overlap;
        return blocksToReturn;
      }

      tick() {
        if (this.state === this.STATES.ACTIVE) {
          const value = this.position[this.workingPlane];
          if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT) {
            this.reverseDirection();
          }
          this.position[this.workingPlane] += this.direction;
          this.mesh.position[this.workingPlane] =
            this.position[this.workingPlane];
        }
      }
    }

    // Game class from app.js
    class Game {
      STATES: { [key: string]: string };
      blocks: Block[];
      state: string;
      gameMetrics: any;
      stage: Stage;
      mainContainer: HTMLDivElement;
      scoreContainer: HTMLDivElement;
      startButton: HTMLDivElement;
      instructions: HTMLDivElement;
      newBlocks: THREE.Group;
      placedBlocks: THREE.Group;
      choppedBlocks: THREE.Group;

      constructor() {
        this.STATES = {
          LOADING: "loading",
          PLAYING: "playing",
          READY: "ready",
          ENDED: "ended",
          RESETTING: "resetting",
        };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        this.gameMetrics = {
          totalPrecisionScore: 0,
          perfectPlacements: 0,
          gameStartTime: 0,
          gameEndTime: 0,
          blockPlacementTimes: [],
          totalOverlapPercentage: 0,
          consecutiveSuccessStreak: 0,
          maxConsecutiveStreak: 0,
          averageReactionTime: 0,
          lastBlockTime: 0,
          totalTowerArea: 0,
          initialBlockArea: 100,
          areaLossHistory: [],
          blockAreas: [],
          totalAreaLost: 0,
          minBlockArea: Infinity,
          maxBlockArea: 0,
        };

        this.mainContainer = document.getElementById(
          "container"
        ) as HTMLDivElement;
        this.scoreContainer = document.getElementById(
          "score"
        ) as HTMLDivElement;
        this.startButton = document.getElementById(
          "start-button"
        ) as HTMLDivElement;
        this.instructions = document.getElementById(
          "instructions"
        ) as HTMLDivElement;

        this.stage = new Stage();
        this.scoreContainer.innerHTML = "0";
        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);

        this.addBlock();
        this.tick();
        this.updateState(this.STATES.READY);
        document.addEventListener("keydown", (e) => {
          if (e.keyCode === 32) this.onAction();
        });
        document.addEventListener("click", () => {
          this.onAction();
        });
      }

      updateState(newState: string) {
        for (const key in this.STATES) {
          this.mainContainer.classList.remove(this.STATES[key]);
        }
        this.mainContainer.classList.add(newState);
        this.state = newState;
      }

      onAction() {
        switch (this.state) {
          case this.STATES.READY:
            this.startGame();
            break;
          case this.STATES.PLAYING:
            this.placeBlock();
            break;
          case this.STATES.ENDED:
            this.restartGame();
            break;
        }
      }

      startGame() {
        if (this.state !== this.STATES.PLAYING) {
          this.scoreContainer.innerHTML = "0";
          this.updateState(this.STATES.PLAYING);
          const audioStart = audioStartRef.current;
          if (audioStart) {
            audioStart.currentTime = 0;
            audioStart.play();
          }

          this.gameMetrics = {
            totalPrecisionScore: 0,
            perfectPlacements: 0,
            gameStartTime: Date.now(),
            gameEndTime: 0,
            blockPlacementTimes: [],
            totalOverlapPercentage: 0,
            consecutiveSuccessStreak: 0,
            maxConsecutiveStreak: 0,
            averageReactionTime: 0,
            lastBlockTime: Date.now(),
            totalTowerArea: 0,
            initialBlockArea: 100,
            areaLossHistory: [],
            blockAreas: [100],
            totalAreaLost: 0,
            minBlockArea: 100,
            maxBlockArea: 100,
          };

          this.addBlock();
        }
      }

      restartGame() {
        this.updateState(this.STATES.RESETTING);
        const oldBlocks = this.placedBlocks.children;
        const removeSpeed = 0.2;
        const delayAmount = 0.02;

        for (let i = 0; i < oldBlocks.length; i++) {
          TweenLite.to(oldBlocks[i].scale, removeSpeed, {
            x: 0,
            y: 0,
            z: 0,
            delay: (oldBlocks.length - i) * delayAmount,
            ease: Power1.easeIn,
            onComplete: () => {
              this.placedBlocks.remove(oldBlocks[i]);
            },
          });
          TweenLite.to(oldBlocks[i].rotation, removeSpeed, {
            y: 0.5,
            delay: (oldBlocks.length - i) * delayAmount,
            ease: Power1.easeIn,
          });
        }

        const cameraMoveSpeed =
          removeSpeed * 2 + oldBlocks.length * delayAmount;
        this.stage.setCamera(2, cameraMoveSpeed);

        const countdown = { value: this.blocks.length - 1 };
        TweenLite.to(countdown, cameraMoveSpeed, {
          value: 0,
          onUpdate: () => {
            this.scoreContainer.innerHTML = String(Math.round(countdown.value));
          },
        });

        this.blocks = this.blocks.slice(0, 1);
        setTimeout(() => {
          this.startGame();
        }, cameraMoveSpeed * 1000);
      }

      placeBlock() {
        const currentBlock = this.blocks[this.blocks.length - 1];
        const placementTime = Date.now();
        const reactionTime = placementTime - this.gameMetrics.lastBlockTime;
        const audioStack = audioStackRef.current;
        if (audioStack) {
          audioStack.currentTime = 0;
          audioStack.play();
        }

        const newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);

        if (newBlocks.overlapPercentage > 0) {
          this.gameMetrics.totalPrecisionScore += newBlocks.precisionScore;
          this.gameMetrics.totalOverlapPercentage +=
            newBlocks.overlapPercentage;
          this.gameMetrics.blockPlacementTimes.push(reactionTime);
          this.gameMetrics.consecutiveSuccessStreak++;
          this.gameMetrics.maxConsecutiveStreak = Math.max(
            this.gameMetrics.maxConsecutiveStreak,
            this.gameMetrics.consecutiveSuccessStreak
          );
          this.gameMetrics.totalTowerArea += newBlocks.placedArea;
          this.gameMetrics.blockAreas.push(newBlocks.placedArea);
          this.gameMetrics.totalAreaLost += newBlocks.areaLost;
          this.gameMetrics.areaLossHistory.push(newBlocks.areaLost);
          this.gameMetrics.minBlockArea = Math.min(
            this.gameMetrics.minBlockArea,
            newBlocks.placedArea
          );
          this.gameMetrics.maxBlockArea = Math.max(
            this.gameMetrics.maxBlockArea,
            newBlocks.placedArea
          );

          if (newBlocks.isPerfect) {
            this.gameMetrics.perfectPlacements++;
          }
        } else {
          this.gameMetrics.consecutiveSuccessStreak = 0;
          this.gameMetrics.totalAreaLost += newBlocks.originalArea;
          this.gameMetrics.areaLossHistory.push(newBlocks.originalArea);
        }

        this.gameMetrics.lastBlockTime = placementTime;
        if (newBlocks.placed) this.placedBlocks.add(newBlocks.placed);
        if (newBlocks.chopped) {
          this.choppedBlocks.add(newBlocks.chopped);
          const positionParams: any = {
            y: "-=30",
            ease: Power1.easeIn,
            onComplete: () => this.choppedBlocks.remove(newBlocks.chopped),
          };
          const rotateRandomness = 10;
          const rotationParams = {
            delay: 0.05,
            x:
              newBlocks.plane === "z"
                ? Math.random() * rotateRandomness - rotateRandomness / 2
                : 0.1,
            z:
              newBlocks.plane === "x"
                ? Math.random() * rotateRandomness - rotateRandomness / 2
                : 0.1,
            y: Math.random() * 0.1,
          };
          if (
            newBlocks.chopped.position[newBlocks.plane] >
            newBlocks.placed.position[newBlocks.plane]
          ) {
            positionParams[newBlocks.plane] =
              "+=" + 40 * Math.abs(newBlocks.direction);
          } else {
            positionParams[newBlocks.plane] =
              "-=" + 40 * Math.abs(newBlocks.direction);
          }
          TweenLite.to(newBlocks.chopped.position, 1, positionParams);
          TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
      }

      addBlock() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state === lastBlock.STATES.MISSED) {
          return this.endGame();
        }
        this.scoreContainer.innerHTML = String(this.blocks.length - 1);
        const newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5) this.instructions.classList.add("hide");
      }

      endGame() {
        this.gameMetrics.gameEndTime = Date.now();
        const totalGameTime =
          this.gameMetrics.gameEndTime - this.gameMetrics.gameStartTime;
        const successfulPlacements =
          this.gameMetrics.blockPlacementTimes.length;
        this.gameMetrics.averageReactionTime =
          successfulPlacements > 0
            ? this.gameMetrics.blockPlacementTimes.reduce(
                (a: number, b: number) => a + b,
                0
              ) / successfulPlacements
            : 0;
        const totalPossibleArea =
          this.gameMetrics.initialBlockArea * (this.blocks.length - 1);
        const areaRetentionRate =
          totalPossibleArea > 0
            ? this.gameMetrics.totalTowerArea / totalPossibleArea
            : 0;
        const averageAreaLoss =
          this.gameMetrics.areaLossHistory.length > 0
            ? this.gameMetrics.totalAreaLost /
              this.gameMetrics.areaLossHistory.length
            : 0;
        const areaConsistency = this.calculateAreaConsistency();
        const finalBlockArea =
          this.gameMetrics.blockAreas.length > 1
            ? this.gameMetrics.blockAreas[
                this.gameMetrics.blockAreas.length - 1
              ]
            : 0;

        const finalScore = {
          level: this.blocks.length - 2,
          totalPrecisionScore: this.gameMetrics.totalPrecisionScore,
          averagePrecision:
            successfulPlacements > 0
              ? (
                  (this.gameMetrics.totalOverlapPercentage /
                    successfulPlacements) *
                  100
                ).toFixed(2)
              : 0,
          perfectPlacements: this.gameMetrics.perfectPlacements,
          totalGameTime: totalGameTime,
          averageReactionTime: Math.round(this.gameMetrics.averageReactionTime),
          maxConsecutiveStreak: this.gameMetrics.maxConsecutiveStreak,
          efficiency:
            successfulPlacements > 0
              ? (
                  (successfulPlacements / (this.blocks.length - 1)) *
                  100
                ).toFixed(1)
              : 0,
          totalTowerArea: Math.round(this.gameMetrics.totalTowerArea),
          areaRetentionRate: (areaRetentionRate * 100).toFixed(1),
          totalAreaLost: Math.round(this.gameMetrics.totalAreaLost),
          averageAreaLoss: Math.round(averageAreaLoss),
          minBlockArea: Math.round(this.gameMetrics.minBlockArea),
          finalBlockArea: Math.round(finalBlockArea),
          areaConsistency: areaConsistency.toFixed(2),
          areaEfficiencyScore: Math.round(areaRetentionRate * 1000),
        };

        localStorage.setItem(
          "towerBlockCompetitionScore",
          JSON.stringify(finalScore)
        );

        const metricsContainer = document.getElementById("competition-metrics");
        if (metricsContainer) {
          const badges = [];
          if (finalScore.level >= 20) badges.push("🏆 Master Builder");
          if (finalScore.perfectPlacements >= 5)
            badges.push("🎯 Perfect Precision");
          if (parseFloat(finalScore.areaRetentionRate) >= 80)
            badges.push("💎 Area Expert");
          if (finalScore.maxConsecutiveStreak >= 10)
            badges.push("🔥 Streak Master");
          if (finalScore.averageReactionTime <= 800)
            badges.push("⚡ Lightning Fast");

          const badgeDisplay =
            badges.length > 0
              ? `<div class="section-header">Achievements</div>` +
                badges
                  .map((badge) => `<div class="badge">${badge}</div>`)
                  .join("")
              : "";

          metricsContainer.innerHTML =
            badgeDisplay +
            `<div class="section-header">📊 Score Card</div>` +
            `<div class="highlight-metric"><div class="metric-row"><span>🏗️ Final Level</span><span>${finalScore.level}</span></div></div>` +
            `<div class="metric-row"><span>🎯 Precision Score</span><span>${finalScore.totalPrecisionScore}</span></div>` +
            `<div class="metric-row"><span>📈 Average Accuracy</span><span>${finalScore.averagePrecision}%</span></div>` +
            `<div class="metric-row"><span>💯 Perfect Placements</span><span>${finalScore.perfectPlacements}</span></div>` +
            `<div class="metric-row"><span>⚡ Average Reaction Time</span><span>${finalScore.averageReactionTime}ms</span></div>`;
        }

        this.updateState(this.STATES.ENDED);
      }

      calculateAreaConsistency() {
        const areas = this.gameMetrics.blockAreas;
        if (areas.length < 2) return 0;
        const mean =
          areas.reduce((sum: number, area: number) => sum + area, 0) /
          areas.length;
        const squaredDiffs = areas.map((area: number) =>
          Math.pow(area - mean, 2)
        );
        const variance =
          squaredDiffs.reduce((sum: number, diff: number) => sum + diff, 0) /
          areas.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
        return Math.max(0, 1 - coefficientOfVariation) * 100;
      }

      tick = () => {
        if (this.blocks.length > 0) {
          this.blocks[this.blocks.length - 1].tick();
          this.stage.render();
        }
        requestAnimationFrame(this.tick);
      };
    }

    new Game();
  }, []);

  return (
    <>
      <div id="container" className="loading">
        <div id="game" ref={gameContainerRef}></div>
        <div id="score" ref={scoreContainerRef}>
          0
        </div>
        <div id="instructions" ref={instructionsRef}>
          Click (or press the spacebar) to place the block
        </div>
        <div className="game-over">
          <h2>Game Over</h2>
          <p>You did great, you're the best.</p>
          <p>Click or spacebar to start again</p>
          <div id="competition-metrics"></div>
        </div>
        <div className="game-ready">
          <div id="start-button" ref={startButtonRef}>
            Start
          </div>
          <div></div>
        </div>
      </div>
      <audio
        id="audio-start"
        src="/90s-game-ui-2-185095.mp3"
        preload="auto"
        ref={audioStartRef}
      ></audio>
      <audio
        id="audio-stack"
        src="/90s-game-ui-6-185099.mp3"
        preload="auto"
        ref={audioStackRef}
      ></audio>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css?family=Comfortaa");
        html,
        body {
          margin: 0;
          overflow: hidden;
          height: 100%;
          width: 100%;
          position: relative;
          font-family: "Comfortaa", cursive;
        }
        #container {
          width: 100%;
          height: 100%;
        }
        #container #score {
          position: absolute;
          top: 20px;
          width: 100%;
          text-align: center;
          font-size: 10vh;
          transition: transform 0.5s ease;
          color: #334;
          transform: translatey(-200px) scale(1);
        }
        #container #game {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
        #container .game-over {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 85%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        #container .game-over > h2,
        #container .game-over > p {
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 0;
          transform: translatey(-50px);
          color: #334;
        }
        #container .game-over h2 {
          margin: 0;
          padding: 0;
          font-size: 40px;
        }
        #container .game-ready {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-around;
        }
        #container .game-ready #start-button {
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 0;
          transform: translatey(-50px);
          border: 3px solid #334;
          padding: 10px 20px;
          background-color: transparent;
          color: #334;
          font-size: 30px;
        }
        #container #instructions {
          position: absolute;
          width: 100%;
          top: 16vh;
          left: 0;
          text-align: center;
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 0;
        }
        #container #instructions.hide {
          opacity: 0 !important;
        }
        #container.playing #score,
        #container.resetting #score {
          transform: translatey(0px) scale(1);
        }
        #container.playing #instructions {
          opacity: 1;
        }
        #container.ready .game-ready #start-button {
          opacity: 1;
          transform: translatey(0);
        }
        #container.ended #score {
          transform: translatey(6vh) scale(1.5);
        }
        #container.ended .game-over > h2,
        #container.ended .game-over > p {
          opacity: 1;
          transform: translatey(0);
        }
        #container.ended .game-over > p {
          transition-delay: 0.3s;
        }

        #container.ended #competition-metrics {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.5s;
        }

        #competition-metrics {
          margin-top: 25px;
          font-size: 13px;
          text-align: left;
          max-width: 450px;
          width: 90vw;
          line-height: 1.4;
          max-height: 60vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: rgba(255, 255, 255, 0.95);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 25px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.6s ease;
          position: relative;
          z-index: 100;

          scroll-behavior: smooth;
        }

        #competition-metrics .section-header {
          font-weight: 700;
          font-size: 15px;
          color: #223;
          margin: 18px 0 10px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid rgba(51, 51, 68, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        #competition-metrics .section-header:first-child {
          margin-top: 0;
        }

        #competition-metrics .metric-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
          background: rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        #competition-metrics .metric-row:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        #competition-metrics .metric-row span:first-child {
          color: #445;
          font-weight: 600;
          font-size: 13px;
        }

        #competition-metrics .metric-row span:last-child {
          color: #223;
          font-weight: 700;
          font-size: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        #competition-metrics .highlight-metric .metric-row {
          background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.1) 0%,
            rgba(118, 75, 162, 0.1) 100%
          );
          border: 1px solid rgba(102, 126, 234, 0.3);
        }

        #competition-metrics .highlight-metric .metric-row span:last-child {
          font-size: 16px;
          font-weight: 800;
        }

        /* Scrollbar styling for metrics container */
        #competition-metrics::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        #competition-metrics::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          margin: 5px;
        }

        #competition-metrics::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.8);
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        #competition-metrics::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 1);
        }

        #competition-metrics::-webkit-scrollbar-corner {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Mobile responsiveness for metrics */
        @media (max-width: 768px) {
          #competition-metrics {
            max-width: 95vw;
            width: 95vw;
            margin: 15px auto;
            font-size: 12px;
            padding: 20px;
            max-height: 70vh;
          }

          #competition-metrics .metric-row span:first-child {
            font-size: 12px;
          }

          #competition-metrics .metric-row span:last-child {
            font-size: 13px;
          }

          #competition-metrics .section-header {
            font-size: 14px;
          }

          #competition-metrics .highlight-metric .metric-row span:last-child {
            font-size: 15px;
          }
        }

        /* Animation for metrics appearing - only when container is visible */
        #container.ended #competition-metrics .metric-row {
          animation: slideInMetric 0.2s ease-out forwards;
          opacity: 0;
          transform: translateX(-10px);
        }

        #container.ended #competition-metrics .section-header {
          animation: slideInHeader 0.3s ease-out forwards;
          opacity: 0;
          transform: translateY(-5px);
        }

        /* Stagger animation timing - only after container appears */
        #container.ended #competition-metrics .metric-row:nth-of-type(1) {
          animation-delay: 0.8s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(2) {
          animation-delay: 0.85s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(3) {
          animation-delay: 0.9s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(4) {
          animation-delay: 0.95s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(5) {
          animation-delay: 1s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(6) {
          animation-delay: 1.05s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(7) {
          animation-delay: 1.1s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(8) {
          animation-delay: 1.15s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(9) {
          animation-delay: 1.2s;
        }
        #container.ended #competition-metrics .metric-row:nth-of-type(10) {
          animation-delay: 1.25s;
        }

        #container.ended #competition-metrics .section-header:nth-of-type(1) {
          animation-delay: 0.7s;
        }
        #container.ended #competition-metrics .section-header:nth-of-type(2) {
          animation-delay: 1s;
        }
        #container.ended #competition-metrics .section-header:nth-of-type(3) {
          animation-delay: 1.3s;
        }

        @keyframes slideInMetric {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInHeader {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Badge styling */
        #competition-metrics .badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 14px;
          margin: 6px 0;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          opacity: 0;
          transform: scale(0);
          position: relative;
          z-index: 1;
        }

        #container.ended #competition-metrics .badge {
          animation: badgePop 0.2s ease-out forwards;
        }

        #container.ended #competition-metrics .badge:nth-child(2) {
          animation-delay: 0.6s;
        }
        #container.ended #competition-metrics .badge:nth-child(3) {
          animation-delay: 0.65s;
        }
        #container.ended #competition-metrics .badge:nth-child(4) {
          animation-delay: 0.7s;
        }
        #container.ended #competition-metrics .badge:nth-child(5) {
          animation-delay: 0.75s;
        }
        #container.ended #competition-metrics .badge:nth-child(6) {
          animation-delay: 0.8s;
        }

        @keyframes badgePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        footer {
          position: absolute;
          bottom: 10px;
          width: 100%;
          text-align: center;
          color: #334;
          font-size: 12px;
        }
      `}</style>
    </>
  );
}
