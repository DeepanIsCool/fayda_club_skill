"use client";
import { Power1, TweenLite } from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ContinueModal } from "../../components/modals/continue";
import { CurrencyDisplay } from "../../components/modals/currency";
import { GameStartModal } from "../../components/modals/start";
import { RewardModal } from "../../components/modals/reward";
import { useGameCurrency } from "../../contexts/CurrencyContext";
import { gameConfigService } from "../../lib/gameConfig";

interface GameReward {
  amount: number;
  reason: string;
  type: "level" | "perfect" | "streak" | "bonus" | "achievement" | "score";
}

export default function TowerBlockGame() {
  // Fetch game config for Tower Block
  const towerConfig = gameConfigService.getGameBySlug("tower-block");
  const frontendConfig = towerConfig?.frontendConfig;
  const gameTitle = frontendConfig?.title || "";
  const gameDescription = frontendConfig?.description || "";
  const gameObjective = frontendConfig?.objective || "";
  const router = useRouter();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const scoreContainerRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLDivElement>(null);
  const audioStartRef = useRef<HTMLAudioElement>(null);
  const audioPlacementRef = useRef<HTMLAudioElement>(null);

  // Currency and modal states
  const {
    coins,
    points,
    startGame,
    endGame,
    continue: gameContinue,
    continueCost,
    continueAttempt,
    earnPoints,
  } = useGameCurrency();
  const [showStartModal, setShowStartModal] = useState(true);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [gameRewards, setGameRewards] = useState<GameReward[]>([]);
  interface TowerGameStats {
    finalLevel: number;
    totalPrecisionScore: number;
    averageAccuracy: number;
    perfectPlacements: number;
    averageReactionTime: number;
    maxConsecutiveStreak?: number;
    totalGameTime?: number;
  }
  const [gameStats, setGameStats] = useState<TowerGameStats | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Track financial metrics during the game session
  const [sessionFinancials, setSessionFinancials] = useState({
    entryFee: 0,
    coinsSpentOnContinues: 0,
    totalCoinsSpent: 0,
    continueAttempts: 0,
  });



  // Game instance ref

  interface GameMetrics {
    gameStartTime: number;
    gameEndTime: number;
    totalPrecisionScore: number;
    totalOverlapPercentage: number;
    blockPlacementTimes: number[];
    consecutiveSuccessStreak: number;
    maxConsecutiveStreak: number;
    perfectPlacements: number;
    totalTowerArea: number;
    blockAreas: number[];
    totalAreaLost: number;
    areaLossHistory: number[];
    minBlockArea: number;
    maxBlockArea: number;
    initialBlockArea: number;
    lastBlockTime: number;
    averageReactionTime: number;
  }

  interface GameInstance {
    gameMetrics: GameMetrics;
    continueFromLastPosition: () => void;
    restartGame: () => void;
    onAction: () => void;
    stage: {
      onResize: () => void;
      container: HTMLDivElement;
      renderer: THREE.WebGLRenderer;
    };
    gameSession?: { currentContinueIndex?: number };
    // Backwards compatibility alias (some external code may still read .state)
    state?: string;
  }

  const gameInstanceRef = useRef<GameInstance | null>(null);

  const handleStartGame = useCallback(() => {
    // The startGame function now returns a Promise, so we handle it.
    startGame("tower-block")
      .then((success) => {
        if (success) {
          setShowStartModal(false);
          setGameInitialized(true);
          setCurrentLevel(0);
          setGameRewards([]);

          // Initialize session financial tracking from game config
          const gameConfig = gameConfigService.getGameBySlug("tower-block");
          const entryFee = gameConfig?.entryfee || 1; // Default entry fee
          setSessionFinancials({
            entryFee: entryFee,
            coinsSpentOnContinues: 0,
            totalCoinsSpent: entryFee,
            continueAttempts: 0,
          });

          // Play start game sound
          const audioStart = audioStartRef.current;
          if (audioStart) {
            audioStart.currentTime = 0;
            audioStart.play().catch(() => {
              // Audio play failed, likely due to user interaction requirements
            });
          }
          console.log("✅ Tower Block game started successfully");
        } else {
          console.error(
            "❌ Failed to start Tower Block game (likely insufficient coins or config error)"
          );
        }
      })
      .catch((error) => {
        console.error("❌ Error starting Tower Block game:", error);
      });
  }, [startGame]);

  const calculateGameStats = useCallback(() => {
    if (!gameInstanceRef.current?.gameMetrics) return null;

    const metrics = gameInstanceRef.current.gameMetrics;
    const blocksPlaced = metrics.blockPlacementTimes.length;

    // Calculate average accuracy as the average precision score converted to percentage
    const averageAccuracy =
      blocksPlaced > 0 ? metrics.totalPrecisionScore / blocksPlaced / 10 : 0;

    // Calculate average reaction time
    const averageReactionTime =
      blocksPlaced > 0
        ? metrics.blockPlacementTimes.reduce(
          (sum: number, time: number) => sum + time,
          0
        ) /
        blocksPlaced /
        1000
        : 0;

    return {
      finalLevel: currentLevel,
      totalPrecisionScore: metrics.totalPrecisionScore,
      averageAccuracy: averageAccuracy,
      perfectPlacements: metrics.perfectPlacements,
      averageReactionTime: averageReactionTime,
      maxConsecutiveStreak: metrics.maxConsecutiveStreak,
      totalGameTime:
        metrics.gameEndTime > 0
          ? (metrics.gameEndTime - metrics.gameStartTime) / 1000
          : 0,
    };
  }, [currentLevel]);

  // Submit game session data to API
  const submitGameSession = useCallback(
    async (finalStats: TowerGameStats | null) => {
      if (!gameInstanceRef.current || !finalStats) return;

      try {
        // Get game configuration for ID
        await gameConfigService.loadGames();
        const gameConfig = gameConfigService.getGameBySlug("tower-block");

        if (!gameConfig) {
          console.error("Could not find Tower Block game configuration");
          return;
        }

        // Calculate the new game score using the formula
        const avgAcc = finalStats.averageAccuracy || 0;
        const avgRT = Math.max(finalStats.averageReactionTime || 0.5, 0.5);
        const calculatedGameScore = avgAcc / Math.sqrt(avgRT);

        const sessionData = {
          gameId: gameConfig.id,
          userId: "guest",
          level: finalStats.finalLevel,
          score: calculatedGameScore,
          duration:
            (gameInstanceRef.current.gameMetrics.gameEndTime || Date.now()) -
            (gameInstanceRef.current.gameMetrics.gameStartTime || Date.now()),
          sessionData: {
            // Game completion metrics
            finalLevel: finalStats.finalLevel,
            totalScore: calculatedGameScore,
            averageAccuracy: finalStats.averageAccuracy,

            // Performance metrics
            perfectPlacements: finalStats.perfectPlacements,
            maxConsecutiveStreak: finalStats.maxConsecutiveStreak || 0,
            averageReactionTime: finalStats.averageReactionTime,
            totalGameTime: finalStats.totalGameTime || 0,

            // Financial metrics - coins spent only (no earnings)
            entryFee: sessionFinancials.entryFee,
            coinsSpentOnContinues: sessionFinancials.coinsSpentOnContinues,
            totalCoinsSpent: sessionFinancials.totalCoinsSpent,
            continueAttempts: sessionFinancials.continueAttempts,

            // Detailed game metrics
            gameStartTime: gameInstanceRef.current.gameMetrics.gameStartTime,
            gameEndTime: gameInstanceRef.current.gameMetrics.gameEndTime,
            totalPrecisionScore:
              gameInstanceRef.current.gameMetrics.totalPrecisionScore,
            totalOverlapPercentage:
              gameInstanceRef.current.gameMetrics.totalOverlapPercentage,
            consecutiveSuccessStreak:
              gameInstanceRef.current.gameMetrics.consecutiveSuccessStreak,

            // Block placement metrics
            blockPlacementTimes:
              gameInstanceRef.current.gameMetrics.blockPlacementTimes,
            totalTowerArea: gameInstanceRef.current.gameMetrics.totalTowerArea,
            blockAreas: gameInstanceRef.current.gameMetrics.blockAreas,
            totalAreaLost: gameInstanceRef.current.gameMetrics.totalAreaLost,
            areaLossHistory:
              gameInstanceRef.current.gameMetrics.areaLossHistory,
            minBlockArea: gameInstanceRef.current.gameMetrics.minBlockArea,
            maxBlockArea: gameInstanceRef.current.gameMetrics.maxBlockArea,
            initialBlockArea:
              gameInstanceRef.current.gameMetrics.initialBlockArea,

            // Timing analysis
            lastBlockTime: gameInstanceRef.current.gameMetrics.lastBlockTime,

            // Session metadata
            gameType: "Tower Block",
            platform: "web",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
          },
        };

        const response = await fetch("/api/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sessionData),
        });

        const result = await response.json();

        if (result.success) {
          console.log(
            "✅ Game session submitted successfully:",
            result.sessionId
          );
        } else {
          console.error("❌ Failed to submit game session:", result.message);
        }
      } catch (error) {
        console.error("❌ Error submitting game session:", error);
      }
    },
    [sessionFinancials]
  );

  const handleGameOver = useCallback(() => {
    setShowContinueModal(false);
    endGame(); // This resets continue attempts automatically

    // Set the game end time in metrics
    if (gameInstanceRef.current?.gameMetrics) {
      gameInstanceRef.current.gameMetrics.gameEndTime = Date.now();
    }

    // Calculate final game statistics
    const finalStats = calculateGameStats();
    setGameStats(finalStats);

    // Calculate and show final results
    if (currentLevel > 0) {
      // Calculate game score using the new formula
      const avgAcc = finalStats?.averageAccuracy || 0;
      const avgRT = Math.max(finalStats?.averageReactionTime || 0.5, 0.5);
      const finalScore = Math.round(avgAcc / Math.sqrt(avgRT));

      setGameRewards([
        {
          amount: finalScore,
          reason: `Game Complete - Level ${currentLevel}`,
          type: "score",
        },
      ]);
      setShowRewardModal(true);
      // ...removed audioVictoryRef usage...
    } else {
      // Level 0 - just show completion message
      setGameRewards([
        {
          amount: 0,
          reason: "Game Over - Try Again!",
          type: "score",
        },
      ]);
      setShowRewardModal(true);
    }

    // Submit game session with final stats
    submitGameSession(finalStats);
  }, [currentLevel, endGame, calculateGameStats, submitGameSession]);

  const handleContinueGame = useCallback(() => {
    // Use the centralized continue system from CurrencyContext
    if (gameContinue()) {
      setShowContinueModal(false);

      // Update financial tracking
      setSessionFinancials((prev) => ({
        ...prev,
        coinsSpentOnContinues: prev.coinsSpentOnContinues + continueCost,
        totalCoinsSpent: prev.totalCoinsSpent + continueCost,
        continueAttempts: prev.continueAttempts + 1,
      }));

      // Reset the game state but keep the level
      if (gameInstanceRef.current) {
        console.log(
          `Continuing game at level ${currentLevel}, continue attempt #${continueAttempt}, cost: ${continueCost} coins`
        );
        gameInstanceRef.current.continueFromLastPosition();
      }
    } else {
      console.error("Failed to continue game - insufficient coins");
    }
  }, [gameContinue, currentLevel, continueCost, continueAttempt]);

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
      secondLight: THREE.DirectionalLight;
      softLight: THREE.AmbientLight;
      container: HTMLDivElement;

      constructor() {
        this.container = gameContainerRef.current!;
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xd0cbc7, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
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
        this.light = new THREE.DirectionalLight(0xffffff, 1.2);
        this.light.position.set(10, 50, 10);
        this.light.castShadow = true;
        this.scene.add(this.light);
        this.secondLight = new THREE.DirectionalLight(0xffffff, 0.6);
        this.secondLight.position.set(-10, 30, -10);
        this.scene.add(this.secondLight);
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
        const viewSize = 60;
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
      internalState!: string; // definite assignment assertion
      private setInternalState(next: string) {
        this.internalState = next;
      }
      MOVE_AMOUNT: number;
      speed: number;
      direction: number;
      material: THREE.MeshPhongMaterial;
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
          // Base block with a bright, vibrant color
          this.color = new THREE.Color(0.2, 0.8, 1.0); // Bright cyan
        } else {
          const offset = this.index + this.colorOffset;
          // Enhanced color generation for brighter, more vibrant colors
          const r = Math.sin(0.4 * offset) * 0.4 + 0.6; // Range: 0.2 - 1.0
          const g = Math.sin(0.4 * offset + 2.1) * 0.4 + 0.6;
          const b = Math.sin(0.4 * offset + 4.2) * 0.4 + 0.6;

          // Ensure minimum brightness and saturation
          const minBrightness = 0.3;
          const brightness = (r + g + b) / 3;

          let finalR = r;
          let finalG = g;
          let finalB = b;

          if (brightness < minBrightness) {
            const boost = minBrightness / brightness;
            finalR = Math.min(1.0, r * boost);
            finalG = Math.min(1.0, g * boost);
            finalB = Math.min(1.0, b * boost);
          }

          this.color = new THREE.Color(finalR, finalG, finalB);
        }

        this.setInternalState(
          this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED
        );
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
        this.material = new THREE.MeshPhongMaterial({
          color: this.color,
          shininess: 150,
          specular: new THREE.Color(1.0, 1.0, 1.0),
          reflectivity: 0.8,
          transparent: false,
          opacity: 1.0,
          emissive: new THREE.Color(this.color).multiplyScalar(0.05),
        });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(
          this.position.x,
          this.position.y + (this.internalState === this.STATES.ACTIVE ? 0 : 0),
          this.position.z
        );

        if (this.internalState === this.STATES.ACTIVE) {
          this.position[this.workingPlane] =
            Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
      }

      reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
      }

      place() {
        this.setInternalState(this.STATES.STOPPED);

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

        // Add minimum overlap threshold to be more forgiving
        const minOverlapThreshold = 0.1; // Allow very small overlaps to count as valid
        const adjustedOverlap = Math.max(
          overlap,
          overlap > -minOverlapThreshold ? minOverlapThreshold : overlap
        );

        const blocksToReturn: {
          overlapPercentage?: number;
          precisionScore?: number;
          originalArea?: number;
          placedArea?: number;
          areaLost?: number;
          areaEfficiency?: number;
          bonus?: boolean;
          isPerfect?: boolean;
          plane: "x" | "z";
          direction: number;
          placed?: THREE.Mesh;
          chopped?: THREE.Mesh;
        } = {
          plane: this.workingPlane,
          direction: this.direction,
        };

        const maxPossibleOverlap =
          this.targetBlock.dimension[this.workingDimension];
        const overlapPercentage = Math.max(
          0,
          adjustedOverlap / maxPossibleOverlap
        );
        blocksToReturn.overlapPercentage = overlapPercentage;
        blocksToReturn.precisionScore = Math.round(overlapPercentage * 1000);

        // Debug logging for troubleshooting (minimal for production)
        if (overlapPercentage <= 0) {
          console.log(
            `⚠️  Block placement failed - overlap: ${overlap}, adjusted: ${adjustedOverlap}`
          );
        }

        const originalArea = this.dimension.width * this.dimension.depth;
        let placedArea = 0;
        let areaLost = 0;

        if (adjustedOverlap > 0) {
          placedArea =
            this.workingDimension === "width"
              ? adjustedOverlap * this.dimension.depth
              : this.dimension.width * adjustedOverlap;
          areaLost = originalArea - placedArea;
        } else {
          areaLost = originalArea;
        }

        blocksToReturn.originalArea = originalArea;
        blocksToReturn.placedArea = placedArea;
        blocksToReturn.areaLost = areaLost;
        blocksToReturn.areaEfficiency =
          originalArea > 0 ? placedArea / originalArea : 0;

        if (this.dimension[this.workingDimension] - adjustedOverlap < 0.3) {
          blocksToReturn.bonus = true;
          blocksToReturn.isPerfect = true;
          blocksToReturn.precisionScore = 1000;
          this.position.x = this.targetBlock.position.x;
          this.position.z = this.targetBlock.position.z;
          this.dimension.width = this.targetBlock.dimension.width;
          this.dimension.depth = this.targetBlock.dimension.depth;
        }

        if (adjustedOverlap > 0) {
          const choppedDimensions = {
            width: this.dimension.width,
            height: this.dimension.height,
            depth: this.dimension.depth,
          };
          choppedDimensions[this.workingDimension] -= adjustedOverlap;
          this.dimension[this.workingDimension] = adjustedOverlap;

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
            choppedPosition[this.workingPlane] += adjustedOverlap;
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

          // ✅ CRITICAL FIX: Set the block state to STOPPED when successfully placed
          this.setInternalState(this.STATES.STOPPED);
        } else {
          this.setInternalState(this.STATES.MISSED);
        }

        this.mesh.position.set(
          this.position.x,
          this.position.y,
          this.position.z
        );

        return blocksToReturn;
      }

      tick() {
        if (this.internalState === this.STATES.ACTIVE) {
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
      internalState: string; // renamed from state to avoid React lint rule
      stage: Stage;
      mainContainer: HTMLDivElement;
      scoreContainer: HTMLDivElement;
      startButton: HTMLDivElement;
      instructions: HTMLDivElement;
      blocks: Block[];
      placedBlocks: THREE.Group;
      choppedBlocks: THREE.Group;
      newBlocks: THREE.Group;
      gameMetrics: GameMetrics;
      actionLocked: boolean;
      actionDebounce: boolean;

      constructor() {
        this.STATES = {
          LOADING: "loading",
          PLAYING: "playing",
          READY: "ready",
          ENDED: "ended",
          RESETTING: "resetting",
        };
        this.internalState = this.STATES.LOADING;
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
        this.actionLocked = false;
        this.actionDebounce = false;

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
        this.internalState = newState;
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
        if (this.actionLocked) return;
        this.actionLocked = true;

        switch (this.internalState) {
          case this.STATES.READY:
            this.startGame();
            if (this.internalState === this.STATES.PLAYING) {
              this.placeBlock();
            }
            break;
          case this.STATES.PLAYING:
            this.placeBlock();
            break;
          case this.STATES.ENDED:
            this.restartGame();
            break;
        }

        setTimeout(() => {
          this.actionLocked = false;
        }, 200);
      }

      startGame() {
        if (this.internalState !== this.STATES.PLAYING) {
          this.actionDebounce = true;
          this.scoreContainer.innerHTML = "0";
          this.updateState(this.STATES.PLAYING);

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
        if (this.actionDebounce) {
          this.actionDebounce = false;
          return;
        }

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
        const audioPlacement = audioPlacementRef.current;
        if (audioPlacement) {
          audioPlacement.currentTime = 0;
          audioPlacement.play();
        }

        const newBlocks = currentBlock.place();
        console.log(
          "📍 Block placed - overlap:",
          newBlocks.overlapPercentage,
          "state:",
          currentBlock.internalState
        );
        this.newBlocks.remove(currentBlock.mesh);

        if ((newBlocks.overlapPercentage ?? 0) > 0) {
          console.log(
            "Successful block placement with overlap:",
            newBlocks.overlapPercentage
          );
          this.gameMetrics.totalPrecisionScore += newBlocks.precisionScore ?? 0;
          this.gameMetrics.totalOverlapPercentage +=
            newBlocks.overlapPercentage ?? 0;
          this.gameMetrics.blockPlacementTimes.push(reactionTime);
          this.gameMetrics.consecutiveSuccessStreak++;
          this.gameMetrics.maxConsecutiveStreak = Math.max(
            this.gameMetrics.maxConsecutiveStreak,
            this.gameMetrics.consecutiveSuccessStreak
          );
          this.gameMetrics.totalTowerArea += newBlocks.placedArea ?? 0;
          if (typeof newBlocks.placedArea === "number")
            this.gameMetrics.blockAreas.push(newBlocks.placedArea);
          this.gameMetrics.totalAreaLost += newBlocks.areaLost ?? 0;
          if (typeof newBlocks.areaLost === "number")
            this.gameMetrics.areaLossHistory.push(newBlocks.areaLost);
          this.gameMetrics.minBlockArea = Math.min(
            this.gameMetrics.minBlockArea,
            newBlocks.placedArea ?? Infinity
          );
          this.gameMetrics.maxBlockArea = Math.max(
            this.gameMetrics.maxBlockArea,
            newBlocks.placedArea ?? 0
          );

          if (newBlocks.isPerfect) {
            this.gameMetrics.perfectPlacements++;
          }
        } else {
          this.gameMetrics.consecutiveSuccessStreak = 0;
          this.gameMetrics.totalAreaLost += newBlocks.originalArea ?? 0;
          if (typeof newBlocks.originalArea === "number")
            this.gameMetrics.areaLossHistory.push(newBlocks.originalArea);
        }
        console.log(
          "Block placed - overlap percentage:",
          newBlocks.overlapPercentage,
          "block state after place:",
          currentBlock.internalState
        );
        this.gameMetrics.lastBlockTime = placementTime;

        // Handle successful placement
        if (newBlocks.placed) this.placedBlocks.add(newBlocks.placed);

        // Handle chopped piece animation
        if (newBlocks.chopped) {
          this.choppedBlocks.add(newBlocks.chopped);
          const positionParams: Record<string, unknown> = {
            y: "-=30",
            ease: Power1.easeIn,
            onComplete: () => {
              if (newBlocks.chopped)
                this.choppedBlocks.remove(newBlocks.chopped);
            },
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
            (newBlocks.placed?.position[newBlocks.plane] ?? 0)
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

        // Always call addBlock - it will handle both success and failure cases
        this.addBlock();
      }

      addBlock() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        console.log(
          "addBlock called - lastBlock state:",
          lastBlock?.internalState,
          "MISSED:",
          lastBlock?.STATES.MISSED
        );

        // Only trigger continue modal if the last block is actually MISSED and ACTIVE
        // This prevents triggering continue for successfully placed blocks
        if (lastBlock && lastBlock.internalState === lastBlock.STATES.MISSED) {
          console.log("Triggering continue modal - block was missed");
          // Instead of ending immediately, trigger continue modal
          return triggerContinueModal();
        }

        console.log(
          "Adding new block - current blocks count:",
          this.blocks.length
        );

        const level = this.blocks.length - 1;
        setCurrentLevel(level);
        this.scoreContainer.innerHTML = String(level);

        const newKidOnTheBlock = new Block(lastBlock);
        console.log(
          "Created new block with state:",
          newKidOnTheBlock.internalState,
          "index:",
          newKidOnTheBlock.index
        );
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5) this.instructions.classList.add("hide");
      }

      continueFromLastPosition() {
        console.log("continueFromLastPosition called");
        // Remove the last (missed) block and add a new one at the same position
        const lastBlock = this.blocks[this.blocks.length - 1];
        console.log(
          "Last block state:",
          lastBlock?.internalState,
          "is MISSED:",
          lastBlock?.internalState === lastBlock?.STATES.MISSED
        );

        if (lastBlock && lastBlock.internalState === lastBlock.STATES.MISSED) {
          console.log("Removing missed block and creating new one");
          // Remove the missed block from the scene
          this.newBlocks.remove(lastBlock.mesh);
          this.blocks.pop();

          // Ensure we have a valid target block (the last successful block)
          const targetBlock = this.blocks[this.blocks.length - 1];
          console.log(
            "Target block for new block:",
            targetBlock?.internalState
          );

          if (targetBlock) {
            // Create a new block with the correct target
            const newBlock = new Block(targetBlock);
            console.log(
              "New block created with state:",
              newBlock.internalState
            );
            this.newBlocks.add(newBlock.mesh);
            this.blocks.push(newBlock);

            // Update the level display
            const level = this.blocks.length - 1;
            setCurrentLevel(level);
            this.scoreContainer.innerHTML = String(level);

            // Ensure camera is positioned correctly
            this.stage.setCamera(this.blocks.length * 2);

            // Hide instructions if we have enough blocks
            if (this.blocks.length >= 5)
              this.instructions.classList.add("hide");

            console.log(
              "Continue complete - new block ready, total blocks:",
              this.blocks.length
            );
          } else {
            console.error("No target block found for continue");
          }
        } else {
          console.log("No missed block found to replace");
        }
      }

      tick() {
        // Only update block movement and animations when actually playing
        if (this.internalState === this.STATES.PLAYING) {
          this.blocks[this.blocks.length - 1]?.tick();

          // Add subtle shine animation to all blocks
          this.blocks.forEach((block, index) => {
            if (block.material && block.material.specular) {
              const time = Date.now() * 0.001;
              const intensity = 0.8 + 0.2 * Math.sin(time * 2 + index * 0.5);
              block.material.specular.setScalar(intensity);
            }
          });
        }

        // Always render the scene
        this.stage.render();

        // Continue the game loop only when playing
        if (this.internalState === this.STATES.PLAYING) {
          animationFrameId = requestAnimationFrame(() => this.tick());
        }
      }
    }

    // Initialize and start the game
    const game = new Game();
    // expose alias for external reading
    (game as unknown as { state: string }).state = game.internalState;
    gameInstanceRef.current = game as unknown as GameInstance;

    // Start the game loop
    animationFrameId = requestAnimationFrame(() => game.tick());

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
  }, [gameInitialized, triggerContinueModal]);

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
            {/* Empty div for spacing */}
            <div></div>

            <div className="flex items-center gap-4">
              {/* <div className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
                <span className="font-semibold text-gray-800">
                  Level: {currentLevel}
                </span>
              </div> */}
              <CurrencyDisplay />
            </div>
          </div>
        </div>
      )}

      {/* Score Display */}
      {/* <div
        ref={scoreContainerRef}
        className={`absolute top-20 left-1/2 transform -translate-x-1/2 text-4xl font-bold text-gray-800 z-20 ${
          gameInitialized ? "block" : "hidden"
        }`}
      >
        0
      </div> */}
      <div
        ref={scoreContainerRef}
        className={`absolute top-20 left-1/2 transform -translate-x-1/2 text-4xl font-bold text-gray-800 z-20 ${gameInitialized ? "block" : "hidden"}`}
        style={{ visibility: "hidden" }}
      >
        0
      </div>

      {/* Instructions */}
      <div
        ref={instructionsRef}
        className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center text-gray-600 z-20 ${gameInitialized ? "block" : "hidden"
          }`}
      >
      </div>

      {/* Hidden start button for compatibility */}
      <div ref={startButtonRef} className="hidden" />

      {/* Audio Elements */}
      <audio ref={audioStartRef} src="/audios/185099.mp3" />
      <audio ref={audioPlacementRef} src="/audios/185095.mp3" />
      {/* audioVictoryRef removed */}

      {/* Modals */}

      <GameStartModal
        isOpen={showStartModal}
        onStart={handleStartGame}
        onCancel={handleBackToDashboard}
        gameTitle={gameTitle}
        gameKey="tower-block"
        gameObjective={gameObjective}
        gameDescription={gameDescription}
      />

      <ContinueModal
        isOpen={showContinueModal}
        onContinue={handleContinueGame}
        onGameOver={handleGameOver}
        gameKey="tower-block"
        currentLevel={currentLevel}
        continueCost={continueCost}
        continueLabel="Continue The Game"
        exitLabel="Exit The Game"
        showExitAfterMs={3000}
        gameTitle={gameTitle}
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
        gameStats={gameStats || undefined}
      />
    </div>
  );
}