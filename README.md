# Des Chiffres et Des Lettres Game

Welcome to the **Des Chiffres et Des Lettres Game**, a modern web application inspired by the classic French television game show. This project aims to bring the excitement and educational value of the show to the digital world, allowing users to test their numeracy and vocabulary skills.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Gameplay](#gameplay)
  - [Numbers Round](#numbers-round)
  - [Letters Round](#letters-round)
  - [Duels](#duels)
  - [Final Words](#final-words)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

**Des Chiffres et Des Lettres** is a web application based on the popular French television game show of the same name. The game tests players' mathematical skills and vocabulary in a series of engaging rounds. This project replicates the game using modern web technologies to provide an interactive and educational experience.

## Features

- **Numbers Round:** Solve mathematical puzzles using a set of random numbers to reach a target number.
- **Letters Round:** Form the longest possible word from a random selection of letters.
- **Duels:** Compete in quick-fire challenges such as traditional duels, mental arithmetic, and more.
- **Final Words:** Find the longest word from a given set of letters within a time limit.
- **Responsive Design:** Optimized for both desktop and mobile devices.
- **Scoring System:** Keep track of your score and improve your skills over time.

## Gameplay

### Numbers Round

In the Numbers Round, players are given a target number (between 101 and 999) and a selection of six random numbers. The goal is to use basic arithmetic operations (+, −, ×, ÷) to reach the target number.

### Letters Round

In the Letters Round, players are provided with a random selection of ten letters. The objective is to form the longest possible valid word using these letters.

### Duels

Duels are quick challenges where players must solve problems faster than their opponent. Types of duels include:
- **Traditional Duel:** Find words from a given set of letters.
- **Mental Arithmetic:** Solve calculations in your head.
- **Correct Spelling:** Spell a given word correctly.
- **One Within the Other:** Find two related words within a set of letters.

### Final Words

In this round, the winning contestant has two minutes to find the longest word from eight different ten-letter selections. Each correct word earns points and helps the player improve their vocabulary skills.

## Technologies Used

- **Frontend:**
  - React with TypeScript
  - Redux for state management
  - Material-UI for styling
  - Axios for API requests

- **Backend:**
  - Node.js with Express
  - TypeScript
  - RESTful API

## Project Structure

des-chiffres-et-des-lettres/</br>
├── client/                 # React frontend</br>
│   ├── public/</br>
│   ├── src/</br>
│   │   ├── components/</br>
│   │   │   ├── NumberRound.tsx</br>
│   │   │   ├── LetterRound.tsx</br>
│   │   │   ├── Duel.tsx</br>
│   │   │   ├── FinalWords.tsx</br>
│   │   ├── redux/</br>
│   │   │   ├── store.ts</br>
│   │   │   ├── gameSlice.ts</br>
│   │   ├── services/</br>
│   │   │   ├── gameService.ts</br>
│   │   ├── App.tsx</br>
│   │   ├── index.tsx</br>
│   ├── package.json</br>
│   ├── tsconfig.json</br>
│   ├── README.md</br>
├── server/                 # Node.js backend</br>
│   ├── src/</br>
│   │   ├── routes/</br>
│   │   │   ├── gameRoutes.ts</br>
│   │   ├── controllers/</br>
│   │   │   ├── gameController.ts</br>
│   │   ├── app.ts</br>
│   │   ├── server.ts</br>
│   ├── tsconfig.json</br>
│   ├── package.json</br>
├── README.md</br>
└─ README.md</br>

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v14 or higher)
- Yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/des-chiffres-et-des-lettres.git
   cd des-chiffres-et-des-lettres

2. **Clone the repository:**
    cd client
    yarn install

3. **Clone the repository:**
    cd ../server
    yarn install


### Running the Application
1. **Start the backend server:**
    ```bash
    cd server
    yarn start

2. **Start the frontend development server:**
    ```bash
    cd ../client
    yarn start


3. **Open your browser and navigate to:**
    ```bash
    http://localhost:3000

### Contributing
We welcome contributions to enhance the game! Please fork the repository and create a pull request with your changes. Make sure to follow the code style and add appropriate tests.

### License
This project is licensed under the MIT License - see the LICENSE file for details.

### Contact
For questions or feedback, please open an issue on GitHub or contact the project maintainers at marcelopimeireles@gmail.com .