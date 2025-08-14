"use client";

import { motion } from "framer-motion";
import { Power1, TweenLite } from "gsap";
import { ArrowLeft, Pause, Play, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ContinueModal } from "../../components/ContinueModal";
import { CompactCurrencyDisplay } from "../../components/CurrencyDisplay";
import { GameStartModal } from "../../components/GameStartModal";
import { RewardModal } from "../../components/RewardModal";
import { useGameCurrency } from "../../contexts/CurrencyContext";

interface GameReward {
  amount: number;
  reason: string;
  type: "level" | "perfect" | "streak" | "bonus" | "achievement";
}

export default function TowerBlockGame() {
  const router = useRouter();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLDivElement>(null);
  const audioStartRef = useRef<HTMLAudioElement>(null);
  const audioStackRef = useRef<HTMLAudioElement>(null);

  // Currency and modal states
  const {
    coins,
    startGame,
    endGame,
    continue: gameContinue,
    earnReward,
  } = useGameCurrency();
  const [showStartModal, setShowStartModal] = useState(true);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [gameRewards, setGameRewards] = useState<GameReward[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Game instance ref
  const gameInstanceRef = useRef<any>(null);

  const handleStartGame = useCallback(() => {
    if (startGame("tower-block")) {
      setShowStartModal(false);
      setGameInitialized(true);
      setCurrentLevel(0);
      setGameRewards([]);
    }
  }, [startGame]);

  const handleGameOver = useCallback(() => {
    setShowContinueModal(false);
    endGame();

    // Calculate and show rewards
    if (currentLevel > 0) {
      const rewards: GameReward[] = [];

      // Base level reward
      const levelReward = Math.max(1, Math.floor(currentLevel / 2));
      rewards.push({
        amount: levelReward,
        reason: `Reached Level ${currentLevel}`,
        type: "level",
      });

      // Perfect placement bonus
      if (gameInstanceRef.current?.gameMetrics?.perfectPlacements > 0) {
        const perfectBonus =
          gameInstanceRef.current.gameMetrics.perfectPlacements * 2;
        rewards.push({
          amount: perfectBonus,
          reason: `${gameInstanceRef.current.gameMetrics.perfectPlacements} Perfect Blocks`,
          type: "perfect",
        });
      }

      // Streak bonus
      if (gameInstanceRef.current?.gameMetrics?.maxConsecutiveStreak >= 5) {
        const streakBonus = Math.floor(
          gameInstanceRef.current.gameMetrics.maxConsecutiveStreak / 5
        );
        rewards.push({
          amount: streakBonus,
          reason: `${gameInstanceRef.current.gameMetrics.maxConsecutiveStreak} Block Streak`,
          type: "streak",
        });
      }

      // High level achievement
      if (currentLevel >= 20) {
        rewards.push({
          amount: 10,
          reason: "Tower Master Achievement",
          type: "achievement",
        });
      }

      // Award the coins
      rewards.forEach((reward) => {
        earnReward(reward.amount, reward.reason);
      });

      setGameRewards(rewards);
      setShowRewardModal(true);
    } else {
      // No rewards, just go back
      router.push("/");
    }
  }, [currentLevel, endGame, earnReward, router]);

  const handleContinueGame = useCallback(() => {
    if (gameContinue()) {
      setShowContinueModal(false);
      // Reset the game state but keep the level
      if (gameInstanceRef.current) {
        gameInstanceRef.current.continueFromLastPosition();
      }
    }
  }, [gameContinue]);

  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (gameInstanceRef.current) {
      if (isPaused) {
        gameInstanceRef.current.resumeGame();
      } else {
        gameInstanceRef.current.pauseGame();
      }
    }
  }, [isPaused]);

  const handleRestart = useCallback(() => {
    if (gameInstanceRef.current) {
      gameInstanceRef.current.restartGame();
    }
    setCurrentLevel(0);
    setIsPaused(false);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    router.push("/");
  }, [router]);

  // Custom function to trigger continue modal instead of ending game
  const triggerContinueModal = useCallback(() => {
    setShowContinueModal(true);
  }, []);

  useEffect(() => {
    if (!gameInitialized || !gameContainerRef.current) return;

    let animationFrameId: number;

    // Stage class
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

    // Block class
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

        // Foundation block should not be placed
        if (
          !this.targetBlock ||
          this.targetBlock === null ||
          this.targetBlock === undefined
        ) {
          return {
            overlapPercentage: 1,
            precisionScore: 1000,
            originalArea: this.dimension.width * this.dimension.depth,
            placedArea: this.dimension.width * this.dimension.depth,
            areaLost: 0,
            areaEfficiency: 1,
            isPerfect: true,
            plane: this.workingPlane,
            direction: this.direction,
          };
        }

        // Extra safety check
        if (!this.targetBlock.dimension) {
          console.error(
            "Target block has no dimension property",
            this.targetBlock
          );
          return {
            overlapPercentage: 0,
            precisionScore: 0,
            originalArea: this.dimension.width * this.dimension.depth,
            placedArea: 0,
            areaLost: this.dimension.width * this.dimension.depth,
            areaEfficiency: 0,
            isPerfect: false,
            plane: this.workingPlane,
            direction: this.direction,
          };
        }

        const overlap =
          this.targetBlock.dimension[this.workingDimension] -
          Math.abs(
            this.position[this.workingPlane] -
              this.targetBlock.position[this.workingPlane]
          );
        const blocksToReturn: any = {
          plane: this.workingPlane,
          direction: this.direction,
        };

        const maxPossibleOverlap =
          this.targetBlock.dimension[this.workingDimension];
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
          this.position.x = this.targetBlock.position.x;
          this.position.z = this.targetBlock.position.z;
          this.dimension.width = this.targetBlock.dimension.width;
          this.dimension.depth = this.targetBlock.dimension.depth;
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
            this.targetBlock.position[this.workingPlane]
          ) {
            this.position[this.workingPlane] =
              this.targetBlock.position[this.workingPlane];
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
          blocksToReturn.chopped = choppedMesh;
        } else {
          this.state = this.STATES.MISSED;
        }

        this.mesh.position.set(
          this.position.x,
          this.position.y,
          this.position.z
        );

        return blocksToReturn;
      }

      tick() {
        if (this.state === this.STATES.ACTIVE) {
          const value = this.position[this.workingPlane];
          if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
            this.reverseDirection();
          this.position[this.workingPlane] += this.direction;
          this.mesh.position[this.workingPlane] =
            this.position[this.workingPlane];
        }
      }
    }

    // Game class
    class Game {
      STATES: { [key: string]: string };
      state: string;
      stage: Stage;
      mainContainer: HTMLDivElement;
      scoreContainer: HTMLDivElement;
      startButton: HTMLDivElement;
      instructions: HTMLDivElement;
      blocks: Block[];
      placedBlocks: THREE.Group;
      choppedBlocks: THREE.Group;
      newBlocks: THREE.Group;
      gameMetrics: any;

      constructor() {
        this.STATES = {
          LOADING: "loading",
          PLAYING: "playing",
          READY: "ready",
          ENDED: "ended",
          RESETTING: "resetting",
        };
        this.state = this.STATES.LOADING;
        this.stage = new Stage();
        this.mainContainer = gameContainerRef.current!;
        this.scoreContainer = scoreContainerRef.current!;
        this.startButton = startButtonRef.current!;
        this.instructions = instructionsRef.current!;
        this.blocks = [];
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();
        this.newBlocks = new THREE.Group();
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);
        this.stage.add(this.newBlocks);

        this.gameMetrics = {
          gameStartTime: Date.now(),
          gameEndTime: 0,
          totalPrecisionScore: 0,
          totalOverlapPercentage: 0,
          blockPlacementTimes: [],
          consecutiveSuccessStreak: 0,
          maxConsecutiveStreak: 0,
          perfectPlacements: 0,
          totalTowerArea: 0,
          blockAreas: [],
          totalAreaLost: 0,
          areaLossHistory: [],
          minBlockArea: Infinity,
          maxBlockArea: 0,
          initialBlockArea: 100,
          lastBlockTime: Date.now(),
          averageReactionTime: 0,
        };

        this.addEventListeners();
        this.updateState(this.STATES.READY);
      }

      updateState(newState: string) {
        for (const key in this.STATES) {
          this.mainContainer.classList.remove(this.STATES[key]);
        }
        this.mainContainer.classList.add(newState);
        this.state = newState;
      }

      addEventListeners() {
        window.addEventListener("keydown", (e) => {
          if (e.keyCode === 32) {
            e.preventDefault();
            this.onAction();
          }
        });

        window.addEventListener("click", () => {
          this.onAction();
        });

        window.addEventListener("touchstart", () => {
          this.onAction();
        });
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

          // Create the foundation block if no blocks exist
          if (this.blocks.length === 0) {
            const foundationBlock = new Block(null);
            this.blocks.push(foundationBlock);
            this.placedBlocks.add(foundationBlock.mesh);
          }

          this.addBlock();
          this.gameMetrics = {
            ...this.gameMetrics,
            gameStartTime: Date.now(),
            totalPrecisionScore: 0,
            totalOverlapPercentage: 0,
            blockPlacementTimes: [],
            consecutiveSuccessStreak: 0,
            maxConsecutiveStreak: 0,
            perfectPlacements: 0,
            totalTowerArea: 0,
            blockAreas: [],
            totalAreaLost: 0,
            areaLossHistory: [],
            minBlockArea: Infinity,
            maxBlockArea: 0,
            lastBlockTime: Date.now(),
          };
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

        // Don't place foundation block or invalid blocks
        if (
          !currentBlock ||
          !currentBlock.targetBlock ||
          currentBlock.targetBlock === null
        ) {
          console.warn(
            "Attempted to place foundation block or invalid block",
            currentBlock
          );
          return;
        }

        // Additional safety check for dimension property
        if (!currentBlock.targetBlock.dimension) {
          console.error(
            "Target block missing dimension property",
            currentBlock.targetBlock
          );
          return;
        }

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
          // Instead of ending immediately, trigger continue modal
          return triggerContinueModal();
        }

        const level = this.blocks.length - 1;
        setCurrentLevel(level);
        this.scoreContainer.innerHTML = String(level);

        const newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5) this.instructions.classList.add("hide");
      }

      continueFromLastPosition() {
        // Remove the last (missed) block and add a new one at the same position
        const lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state === lastBlock.STATES.MISSED) {
          this.newBlocks.remove(lastBlock.mesh);
          this.blocks.pop();

          // Add a new block
          this.addBlock();
        }
      }

      pauseGame() {
        if (this.state === this.STATES.PLAYING) {
          this.updateState("paused");
        }
      }

      resumeGame() {
        if (this.state === "paused") {
          this.updateState(this.STATES.PLAYING);
        }
      }

      tick() {
        this.blocks[this.blocks.length - 1]?.tick();
        this.stage.render();

        if (!isPaused && this.state === this.STATES.PLAYING) {
          animationFrameId = requestAnimationFrame(() => this.tick());
        }
      }
    }

    // Initialize and start the game
    const game = new Game();
    gameInstanceRef.current = game;

    // Start the game loop
    animationFrameId = requestAnimationFrame(() => game.tick());

    // Audio setup
    const audioStart = audioStartRef.current;
    if (audioStart) {
      audioStart.currentTime = 0;
      audioStart.play().catch(() => {
        // Audio play failed, likely due to user interaction requirements
      });
    }

    return () => {
      // Cleanup
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("resize", game.stage.onResize);
      if (game.stage.container && game.stage.renderer.domElement) {
        game.stage.container.removeChild(game.stage.renderer.domElement);
      }
    };
  }, [gameInitialized, isPaused, triggerContinueModal]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      {/* Game Container */}
      <div
        ref={gameContainerRef}
        className={`absolute inset-0 ${gameInitialized ? "block" : "hidden"}`}
      />

      {/* Game UI Overlay */}
      {gameInitialized && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Top UI Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <motion.button
              onClick={handleBackToDashboard}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:bg-white transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={18} />
              Back
            </motion.button>

            <div className="flex items-center gap-4">
              <CompactCurrencyDisplay />
              <div className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
                <span className="font-semibold text-gray-800">
                  Level: {currentLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-4">
            <motion.button
              onClick={handlePause}
              className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? "Resume" : "Pause"}
            </motion.button>

            <motion.button
              onClick={handleRestart}
              className="pointer-events-auto flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={18} />
              Restart
            </motion.button>
          </div>
        </div>
      )}

      {/* Score Display */}
      <div
        ref={scoreContainerRef}
        className={`absolute top-20 left-1/2 transform -translate-x-1/2 text-4xl font-bold text-gray-800 z-20 ${
          gameInitialized ? "block" : "hidden"
        }`}
      >
        0
      </div>

      {/* Instructions */}
      <div
        ref={instructionsRef}
        className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center text-gray-600 z-20 ${
          gameInitialized ? "block" : "hidden"
        }`}
      >
        <p>Click to drop the block</p>
      </div>

      {/* Hidden start button for compatibility */}
      <div ref={startButtonRef} className="hidden" />

      {/* Audio Elements */}
      <audio ref={audioStartRef} src="/90s-game-ui-2-185095.mp3" />
      <audio ref={audioStackRef} src="/90s-game-ui-6-185099.mp3" />

      {/* Modals */}
      <GameStartModal
        isOpen={showStartModal}
        onStart={handleStartGame}
        onCancel={handleBackToDashboard}
        gameTitle="Tower Block"
        gameDescription="Build the highest tower possible with precision timing!"
      />

      <ContinueModal
        isOpen={showContinueModal}
        onContinue={handleContinueGame}
        onGameOver={handleGameOver}
        currentLevel={currentLevel}
        gameTitle="Tower Block"
      />

      <RewardModal
        isOpen={showRewardModal}
        onClose={() => {
          setShowRewardModal(false);
          handleBackToDashboard();
        }}
        rewards={gameRewards}
        totalCoins={coins}
        gameLevel={currentLevel}
      />
    </div>
  );
}
