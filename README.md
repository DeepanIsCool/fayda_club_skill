# Fayda Club - Skill-Based Gaming Platform

A Next.js-based gaming platform where players can enjoy skill-based games and earn coins based on their performance. Currently features the Tower Block game with precision-based scoring and reward systems.

## 🎮 Features

- **Tower Block Game**: Build the highest tower with precision timing
- **Coin Economy**: Earn and spend coins based on game performance
- **Skill-Based Scoring**: Advanced metrics tracking for fair rewards
- **Continue System**: Pay coins to continue after failing
- **Achievement System**: Unlock rewards for exceptional performance

## 🚀 Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn install
yarn dev
# or
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📊 Game Metrics & Formulas

### Tower Block Game Metrics

#### **1. Precision Score**

```typescript
precisionScore = Math.round(overlapPercentage * 1000);
```

- Where `overlapPercentage = Math.max(0, overlap / maxPossibleOverlap)`
- Perfect alignment = 1000 points
- No overlap = 0 points

#### **2. Total Precision Score**

```typescript
totalPrecisionScore += precisionScore; // (for each successful block)
```

- Sum of all individual precision scores throughout the game

#### **3. Average Accuracy**

```typescript
averageAccuracy = totalPrecisionScore / blocksPlaced;
```

- Where `blocksPlaced = blockPlacementTimes.length`
- Displayed as percentage in UI

#### **4. Overlap Percentage**

```typescript
overlapPercentage = Math.max(0, overlap / maxPossibleOverlap);
```

- Where `overlap = targetBlockDimension - Math.abs(currentPosition - targetPosition)`
- Range: 0 to 1 (0% to 100%)

#### **5. Area Calculations**

```typescript
originalArea = width * depth;
placedArea = workingDimension === "width" ? overlap * depth : width * overlap;
areaLost = originalArea - placedArea;
areaEfficiency = placedArea / originalArea;
```

#### **6. Total Tower Area**

```typescript
totalTowerArea += placedArea; // (for each successful placement)
```

#### **7. Area Loss Tracking**

```typescript
totalAreaLost += areaLost; // (for each block)
// For missed blocks: totalAreaLost += originalArea
```

#### **8. Reaction Time**

```typescript
reactionTime = placementTime - lastBlockTime;
// Stored in milliseconds, converted to seconds for display
averageReactionTime = sum(blockPlacementTimes) / blocksPlaced / 1000;
```

#### **9. Streak Calculations**

```typescript
// For successful placements:
consecutiveSuccessStreak++;
maxConsecutiveStreak = Math.max(maxConsecutiveStreak, consecutiveSuccessStreak);

// For missed blocks:
consecutiveSuccessStreak = 0;
```

#### **10. Perfect Placement Detection**

```typescript
isPerfect = dimension[workingDimension] - overlap < 0.3;
// If perfect: precisionScore = 1000, perfectPlacements++
```

#### **11. Block Area Tracking**

```typescript
minBlockArea = Math.min(minBlockArea, placedArea);
maxBlockArea = Math.max(maxBlockArea, placedArea);
blockAreas.push(placedArea); // Array of all placed block areas
```

#### **12. Game Duration**

```typescript
totalGameTime = (gameEndTime - gameStartTime) / 1000; // in seconds
```

### 🏆 Final Game Score

#### **Game Score Formula**

```typescript
gameScore = averageAccuracy / Math.sqrt(averageReactionTime);
```

- **averageAccuracy**: Average precision percentage across all blocks placed
- **averageReactionTime**: Average time taken to place each block (minimum 0.5 seconds)
- This formula rewards both accuracy and speed, with faster reaction times providing a multiplicative bonus

### 💰 Reward Formulas

#### **Level Reward**

```typescript
levelReward = Math.max(1, Math.floor(currentLevel / 2));
```

#### **Perfect Block Bonus**

```typescript
perfectBonus = perfectPlacements * 2;
```

#### **Streak Bonus**

```typescript
streakBonus = Math.floor(maxConsecutiveStreak / 5);
```

#### **Achievement Bonus**

```typescript
// Tower Master: 10 coins if currentLevel >= 20 .
```

### 🎯 Cost System

#### **Game Entry Cost**

- **Entry Cost**: 1 coin per game

#### **Continue Costs** (after failing)

- **1st continue**: 2x base cost (2 coins)
- **2nd continue**: 3x base cost (3 coins)
- **3rd+ continue**: 5x base cost (5 coins)

## 🏗️ Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **3D Graphics**: Three.js
- **Animations**: Framer Motion & GSAP
- **Icons**: Lucide React

## 📱 Game Mechanics

### Tower Block Game

- **Objective**: Build the highest tower by perfectly aligning falling blocks
- **Controls**: Click/Tap to drop blocks
- **Scoring**: Based on precision, streaks, and level progression
- **Difficulty**: Speed increases with each level
- **Perfect Blocks**: Earn bonus points for near-perfect alignment
- **Continue Option**: Pay coins to continue after missing a block

## 🏆 Achievement System

- **Level Rewards**: Coins for reaching each level
- **Perfect Placement Bonus**: Extra coins for perfect block alignment
- **Streak Rewards**: Bonus for consecutive successful placements
- **Tower Master**: Special achievement for reaching level 20+

## 🎨 Features

- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode Support**: Adapts to system preferences
- **Sound Effects**: Audio feedback for game actions
- **Smooth Animations**: Enhanced user experience with motion design
- **Real-time Currency**: Live coin balance updates

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
