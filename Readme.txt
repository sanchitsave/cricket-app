TECH STACK:

The app uses React for the frontend, Node.js with Express for the backend, 
MySQL on AWS RDS for the database, and is deployed on AWS EC2 with GitHub Actions for CI/CD.

React - Frontend is built with React, which is a Javascript library. React’s state management and 
component reusability make it ideal for dynamic UI updates, like the ball-by-ball scoring panel.

React Router - Used for client-side routing, enabling seamless navigation between the Admin Dashboard (/) 
and Live Score View (/live-score) without full page reloads

Axios - A promise-based HTTP client for making API requests from the frontend to the backend, 
handling CRUD operations (e.g., fetching teams, posting ball scores)

CSS - Custom CSS is used for styling, with a modular approach via separate .css files



Node.js - The backend runs on Node.js, a JavaScript runtime built on Chrome’s V8 engine

Express - Handles RESTful API with endpoints like /teams, /players, /score-ball

MySQL2 - The database driver for Node.js, connecting to the MySQL RDS instance



Amazon RDS (MySQL) - The app uses AWS Relational Database Service (RDS) with MySQL as the database engine on AWS
It stores structured data in tables like Teams, Players, Matches, Ball_Records, and Player_Stats

AWS EC2 - The app is hosted on EC2. The backend runs on port 5000, while the frontend is served on port 80 using serve

GitHub Actions - Continuous Integration/Continuous Deployment (CI/CD) is implemented with GitHub Actions.
A workflow (deploy.yml) triggers on pushes to the master branch, building the frontend, pulling updates to EC2 via SSH, 
and restarting both services with pm2.

PM2 - A process manager for Node.js, ensuring both the backend (cricket-backend) and frontend (cricket-frontend) 
run persistently on EC2, with automatic restarts on failure or reboot.


