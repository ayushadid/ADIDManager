const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
    getDashboardData,
    getUserDashboardData,
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getTasksForSpecificUser,

    addRemarkToTask,
    startTimer,
    stopTimer,
    getActiveTimer,
    getTaskTimeLogs,
    getUserBoardData,
    addCommentToTask,
} = require("../controllers/taskController");
const router = express.Router();

// --- Static Routes (must be defined before dynamic routes) ---

// Main route for getting all tasks (or filtered tasks)
router.get("/", protect, getTasks);

// Dashboard and Board routes
router.get("/dashboard-data", protect, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/user-board", protect, getUserBoardData);


// --- Dynamic Routes (with parameters like :id, :userId, :taskId) ---

// Routes for a specific user's tasks (admin only)
router.get("/user/:userId", protect, adminOnly, getTasksForSpecificUser);

// Routes for starting/stopping timers
router.post("/:taskId/timelogs/start", protect, startTimer);
router.put("/:taskId/timelogs/:timeLogId/stop", protect, stopTimer);
router.get("/:taskId/timelogs/active", protect, getActiveTimer);
router.get("/:taskId/timelogs", protect, getTaskTimeLogs);

// Routes for adding remarks
router.post("/:id/remarks", protect, adminOnly, addRemarkToTask);
router.post("/:id/comments", protect, addCommentToTask);

// Routes for updating status and checklist
router.put("/:id/status", protect, updateTaskStatus);
router.put("/:id/todo", protect, updateTaskChecklist);

// General CRUD routes for a single task. These should come last.
router.get("/:id", protect, getTaskById);
router.put("/:id", protect, adminOnly, updateTask);
router.delete("/:id", protect, adminOnly, deleteTask);

// Route for creating a new task
router.post("/", protect, adminOnly, createTask);


module.exports = router;