const Task=require("../models/Task");
const TimeLog=require("../models/TimeLog");
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require("../models/User");
// @desc Get active timer for a specific task and user
// @route GET /api/tasks/:taskId/timelogs/active
// @access Private (Assigned User or Admin)
// @desc Get active timer for a specific task and user
// @route GET /api/tasks/:taskId/timelogs/active
// @access Private (Assigned User or Admin)
const getActiveTimer = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        // Authorization: Only assigned users or admins can check active timers for this task
        const isAssigned = task.assignedTo.some(
            (id) => id.toString() === userId.toString()
        );
        const isAdmin = req.user.role === "admin";

        if (!isAssigned && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to view timer for this task." });
        }

        // Find an active time log for this user on this task
        const activeTimeLog = await TimeLog.findOne({
            task: taskId,
            user: userId,
            endTime: null, // Look for logs where endTime is not set
        }).populate('user', 'name profileImageUrl'); // Optionally populate user info for display

        res.status(200).json({ activeTimeLog });

    } catch (error) {
        console.error("Error getting active timer:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getUserBoardData = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Find all active timelogs for the current user to identify tasks with a running timer.
        const activeTimeLogs = await TimeLog.find({ user: userId, endTime: null }).select('task');
        const activeTaskIds = new Set(activeTimeLogs.map(log => log.task.toString()));

        // 2. Find all tasks assigned to the user, populating the project details.
        const userTasks = await Task.find({ assignedTo: userId })
            .populate('project', 'name')
            .sort({ createdAt: 1 });

        // 3. Group the tasks by project.
        const projectsMap = new Map();
        userTasks.forEach(task => {
            if (!task.project) return; // Skip tasks without a project

            const projectId = task.project._id.toString();
            
            // Add the dynamic flag for the timer status
            const taskWithTimerStatus = {
                ...task.toObject(),
                isTimerActiveForCurrentUser: activeTaskIds.has(task._id.toString())
            };
            
            if (!projectsMap.has(projectId)) {
                // If this is the first task for this project, initialize the project in our map
                projectsMap.set(projectId, {
                    _id: projectId,
                    name: task.project.name,
                    tasks: [taskWithTimerStatus]
                });
            } else {
                // Otherwise, just add the task to the existing project's task list
                projectsMap.get(projectId).tasks.push(taskWithTimerStatus);
            }
        });

        // 4. Convert the map to an array for the final response.
        const boardData = Array.from(projectsMap.values());

        res.json(boardData);

    } catch (error) {
        console.error("Error fetching user board data:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// @desc Get all time logs for a specific task
// @route GET /api/tasks/:taskId/timelogs
// @access Private (Assigned User or Admin to view)
const getTaskTimeLogs = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }


        // Find all time logs for this task, sorted by startTime (latest first)
        const timeLogs = await TimeLog.find({ task: taskId })
            .populate('user', 'name profileImageUrl') // Populate user who logged time
            .sort({ startTime: -1 }); // Sort by newest first

        // Calculate total duration
        const totalDurationMs = timeLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

        res.status(200).json({
            timeLogs,
            totalDurationMs,
        });

    } catch (error) {
        console.error("Error getting task time logs:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc Start a timer for a task
// @route POST /api/tasks/:taskId/timelogs/start
// @access Private (Assigned User or Admin)
const startTimer = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id; // User ID from the authenticated token

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        // Authorization: Only assigned users or admins can start a timer for this task
        const isAssigned = task.assignedTo.some(
            (id) => id.toString() === userId.toString()
        );
        const isAdmin = req.user.role === "admin";

        if (!isAssigned && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to start a timer for this task." });
        }

        // Check if there's an existing active timer for this user on this task
        const activeTimeLog = await TimeLog.findOne({
            task: taskId,
            user: userId,
            endTime: null, // Look for logs where endTime is not set
        });

        if (activeTimeLog) {
            return res.status(400).json({ message: "You already have an active timer for this task. Please stop it first." });
        }

        // Create a new TimeLog entry
        const newTimeLog = await TimeLog.create({
            task: taskId,
            user: userId,
            startTime: Date.now(), // Set current time
        });

        res.status(201).json({
            message: "Timer started successfully.",
            timeLog: newTimeLog,
        });

    } catch (error) {
        console.error("Error starting timer:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc Stop a timer for a task
// @route PUT /api/tasks/:taskId/timelogs/:timeLogId/stop
// @access Private (User who started it or Admin)
const stopTimer = async (req, res) => {
    try {
        const { taskId, timeLogId } = req.params;
        const userId = req.user._id;

        // Find the specific time log entry
        const timeLog = await TimeLog.findById(timeLogId);

        if (!timeLog) {
            return res.status(404).json({ message: "Time log entry not found." });
        }

        // Ensure the time log belongs to the correct task
        if (timeLog.task.toString() !== taskId) {
            return res.status(400).json({ message: "Time log does not belong to the specified task." });
        }

        // Authorization: Only the user who started the timer or an admin can stop it
        const isOwner = timeLog.user.toString() === userId.toString();
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to stop this timer." });
        }

        // Check if the timer is already stopped
        if (timeLog.endTime !== null) {
            return res.status(400).json({ message: "Timer is already stopped." });
        }

        // Set endTime and calculate duration
        timeLog.endTime = Date.now();
        timeLog.duration = timeLog.endTime.getTime() - timeLog.startTime.getTime(); // Duration in milliseconds

        await timeLog.save();

        res.status(200).json({
            message: "Timer stopped successfully.",
            timeLog: timeLog,
        });

    } catch (error) {
        console.error("Error stopping timer:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


//@desc Get all tasks (Admin:ALL Users: assigned to them)
//@route GET /api/tasks/
//@access Private
// controllers/taskController.js
// Add this helper function above your getTasks function
const getSummaryCounts = async (filter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a new filter for counts that doesn't include status-specific fields
    const baseFilterForCounts = { ...filter };
    delete baseFilterForCounts.status;
    delete baseFilterForCounts.isOverdue;
    delete baseFilterForCounts.dueDate;

    const allTasks = await Task.countDocuments(baseFilterForCounts);
    const pendingTasks = await Task.countDocuments({ ...baseFilterForCounts, status: "Pending" });
    const inProgressTasks = await Task.countDocuments({ ...baseFilterForCounts, status: "In Progress" });
    const completedTasks = await Task.countDocuments({ ...baseFilterForCounts, status: "Completed" });
    const overdueTasks = await Task.countDocuments({ 
        ...baseFilterForCounts, 
        status: { $ne: 'Completed' }, 
        dueDate: { $lt: today } 
    });

    return { all: allTasks, pendingTasks, inProgressTasks, completedTasks, overdueTasks };
};


const getTasks = async (req, res) => {
    try {
        // --- CHECKPOINT 1: See what the frontend is sending ---
        console.log("---------- New Request Received ----------");
        console.log("1. Received query params from frontend:", req.query);

        const { 
            status, projectId, dueDate, createdDate, isOverdue, assignedUserId, sortBy 
        } = req.query;
        
        const isUserAdmin = req.user.role === "admin";
        
        // Build a single, reusable filter object for all queries
        let baseFilter = {};
        if (isUserAdmin) {
            if (assignedUserId && assignedUserId !== 'all') {
                baseFilter.assignedTo = new mongoose.Types.ObjectId(assignedUserId);
            }
        } else {
            baseFilter.assignedTo = req.user._id;
        }

        if (projectId && projectId !== 'all') {
            baseFilter.project = new mongoose.Types.ObjectId(projectId);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isOverdue === 'true') {
            baseFilter.status = { $ne: 'Completed' };
            baseFilter.dueDate = { $lt: today };
        } else if (status && status !== 'All') {
            baseFilter.status = status;
        }

        if (dueDate && isOverdue !== 'true') {
            const targetDueDate = new Date(dueDate);
            baseFilter.dueDate = { 
                $gte: new Date(targetDueDate.setHours(0, 0, 0, 0)), 
                $lte: new Date(targetDueDate.setHours(23, 59, 59, 999)) 
            };
        }
        if (createdDate) {
            const targetCreatedDate = new Date(createdDate);
            baseFilter.createdAt = { 
                $gte: new Date(targetCreatedDate.setHours(0, 0, 0, 0)), 
                $lte: new Date(targetCreatedDate.setHours(23, 59, 59, 999)) 
            };
        }

        // --- CHECKPOINT 2: See the final filter object before the query ---
        console.log("2. Constructed DB filter object:", JSON.stringify(baseFilter, null, 2));

        let tasks = [];

        if (sortBy === 'hours') {
            // --- CHECKPOINT 3A: Confirming the 'Sort by Hours' path is taken ---
            console.log("3. Sorting Method: By Hours (Aggregation)");

            tasks = await Task.aggregate([
                { $match: baseFilter },
                { $lookup: { from: 'timelogs', localField: '_id', foreignField: 'task', as: 'timeLogs' }},
                { $addFields: { totalDuration: { $sum: "$timeLogs.duration" } }},
                { $sort: { totalDuration: -1, createdAt: -1 } },
                { $lookup: { from: 'projects', localField: 'project', foreignField: 'id', as: 'project' } },
                { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'assignedTo' } },
                { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
            ]);

        } else {
            // --- CHECKPOINT 3B: Confirming the 'Default Sort' path is taken ---
            console.log("3. Sorting Method: Default (by Most Recent)");

            const populateOptions = [
                { path: "assignedTo", select: "name email profileImageUrl" },
                { path: "project", select: "name" },
            ];
            tasks = await Task.find(baseFilter)
                .populate(populateOptions)
                .sort({ createdAt: -1 });
        }
        
        // --- CHECKPOINT 4: See how many tasks were found ---
        console.log(`4. Found ${tasks.length} tasks in the database.`);
        
        // --- The rest of the function processes the results ---
        const processedTasks = await Promise.all(
            tasks.map(async (task) => {
                const taskObject = task.toObject ? task.toObject() : task;
                taskObject.completedTodoCount = (taskObject.todoChecklist || []).filter(item => item.completed).length;
                const isTaskOverdue = 
                    taskObject.status !== 'Completed' &&
                    taskObject.dueDate &&
                    new Date(taskObject.dueDate) < today;
                taskObject.isOverdue = isTaskOverdue;
                if (!isUserAdmin && taskObject.remarks) {
                    delete taskObject.remarks;
                }
                return taskObject;
            })
        );
        
        const statusSummary = await getSummaryCounts(baseFilter);

        res.json({
            tasks: processedTasks,
            statusSummary,
        });

    } catch (error) {
        console.error(">>> FATAL ERROR in getTasks:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
// Add this new function to your module.exports
// @desc Get tasks for a specific user (Admin only)
// @route GET /api/tasks/user/:userId
// @access Private (Admin)
const getTasksForSpecificUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;

        let filter = { assignedTo: userId };
        if (status) {
            filter.status = status;
        }

        const populateOptions = [
            { path: "assignedTo", select: "name email profileImageUrl" },
            { path: "remarks.madeBy", select: "name email profileImageUrl" }
        ];

        const tasks = await Task.find(filter).populate(populateOptions);

        // --- START CORRECTION FOR PROGRESS / POPULATED DATA ---
        const tasksWithCalculatedFields = await Promise.all(
            tasks.map(async (task) => {
                // Convert the Mongoose document to a plain JavaScript object first.
                // This ensures all populated fields and the 'progress' field are accessible.
                const taskObject = task.toObject(); // Use .toObject() or .toJSON()

                const completedCount = taskObject.todoChecklist.filter( // Use taskObject here
                    (item) => item.completed
                ).length;

                // Make sure `completedTodoCount` is consistent (fix typo here if desired)
                taskObject.completedTodoCount = completedCount; // Changed to correct spelling
                delete taskObject.compltedTodoCount; // Remove the old typo if it exists

                return taskObject;
            })
        );
        // --- END CORRECTION ---

        res.json({ tasks: tasksWithCalculatedFields }); // Use the new array name

    } catch (error) {
        console.error("Error in getTasksForSpecificUser:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc Add a remark to a task
// @route POST /api/tasks/:id/remarks
// @access Private (Admin Only)
const addRemarkToTask = async (req, res) => {
    try {
        const { text } = req.body;
        const taskId = req.params.id;

        // Basic validation
        if (!text) {
            return res.status(400).json({ message: "Remark text is required." });
        }

        // Find the task
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        // Authorization: Only admins can add remarks
        // The 'adminOnly' middleware will handle this, but an explicit check here is also good practice
        // if this function might be called without the middleware in other contexts.
        // For now, we'll rely on the middleware for the route.

        // Create the new remark object
        const newRemark = {
            text,
            madeBy: req.user._id, // The ID of the logged-in user (from 'protect' middleware)
            createdAt: new Date(), // Explicitly set creation time for the remark
        };

        task.remarks.push(newRemark); // Add the new remark to the array

        await task.save(); // Save the updated task document

        // Fetch the updated task and populate necessary fields for the response
        const updatedTask = await Task.findById(taskId).populate([
            { path: "assignedTo", select: "name email profileImageUrl" },
            { path: "remarks.madeBy", select: "name email profileImageUrl" } // Populate the user who made the remark
        ]);

        res.status(201).json({ message: "Remark added successfully", task: updatedTask });

    } catch (error) {
        console.error("Error adding remark to task:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


//@desc Get task by Id
//@route GET api/tasks/:id
//@access Private
// In your taskController.js file

const getTaskById = async (req, res) => {
    try {
        // The check for admin role is no longer needed to hide/show remarks
        // const isUserAdmin = req.user.role === "admin"; 

        // Always populate the remarks for any user viewing the task
        const populateOptions = [
            { path: "assignedTo", select: "name email profileImageUrl" },
            { path: "remarks.madeBy", select: "name email profileImageUrl" } ,
            { path: "project", select: "name" },// This is now always included
            { path: "comments.madeBy", select: "name" }
        ];

        /* // REMOVED: Conditional population
        if (isUserAdmin) {
            populateOptions.push({ path: "remarks.madeBy", select: "name email profileImageUrl" });
        }
        */

        const task = await Task.findById(req.params.id).populate(populateOptions);

        if (!task) {
            return res.status(404).json({ message: "Task not Found" });
        }

        const taskObject = task.toObject();

        /*
        // REMOVED: This block deleted remarks for non-admins
        if (!isUserAdmin) {
            delete taskObject.remarks;
        }
        */

        // Now, the full task object with remarks is sent to any user
        res.json(taskObject); 

    } catch (error) {
        console.error("Error in getTaskById:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


//@desc Create a new task (admin only)
//@route POST /api/tasks/
//@access Private(admin)

// Make sure these are at the top of your controller file
// Make sure these models are imported at the top of your controller file


const createTask = async (req, res) => {
    try {
        const {
            project,
            title,
            description,
            priority,
            startDate,       
            estimatedHours,
            dueDate,
            assignedTo,
            attachments,
            todoChecklist,
        } = req.body;

        if (!project) {
            res.status(400);
            throw new Error("Project ID is required");
        }
        if (!Array.isArray(assignedTo)) {
            return res
                .status(400)
                .json({ message: "AssignedTo must be an array of userIds" })
        }

        const task = await Task.create({
            project,
            title,
            description,
            priority,
            startDate,       // 👈 Add the new field to the database object
            estimatedHours,
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments,
        });
        
        const { io, userSocketMap } = req;

        // --- START: Corrected Notification Logic ---
        if (assignedTo && assignedTo.length > 0) {
            for (const userId of assignedTo) {
                // 1. Create and save the notification to the database
                const newNotification = await Notification.create({
                    recipient: userId,
                    sender: req.user._id,
                    message: `${req.user.name} assigned you a new task: "${title}"`,
                    link: `/user/task-details/${task._id}`,
                });

                // 2. Populate the sender details to make it a complete object
                const populatedNotification = await Notification.findById(newNotification._id)
                    .populate('sender', 'name profileImageUrl');

                // 3. Send the FULL, REAL notification object over the socket
                const socketId = userSocketMap[userId];
                if (socketId) {
                    console.log(`Emitting REAL notification to user ${userId} on socket ${socketId}`);
                    io.to(socketId).emit("notification", populatedNotification);
                }
            }
        }
        // --- END: Corrected Notification Logic ---
        
        res.status(201).json({ message: "Task Created Successfully", task })

    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Server Error ", error: error.message });
    }
};
//@desc Update Task Details
//@route PUT /api/tasks/:id
//@access PRIVATE
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // 3. FIXED: Sanitize the incoming checklist to prevent crashes
        if (req.body.todoChecklist) {
            req.body.todoChecklist = req.body.todoChecklist.map(item => {
                if (item._id && !mongoose.Types.ObjectId.isValid(item._id)) {
                    // This is a new item with a temporary ID, remove it
                    return { text: item.text, completed: item.completed };
                }
                return item;
            });
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;
        task.project = req.body.project || task.project;
        task.startDate = req.body.startDate || task.startDate;
        task.estimatedHours = req.body.estimatedHours || task.estimatedHours;

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return res.status(400).json({ message: "assignedTo must be an array" });
            }
            task.assignedTo = req.body.assignedTo;
        }

        const updatedTask = await task.save();
        await updatedTask.populate({ path: "project", select: "name" });
        res.json({ message: "Task updated successfully", updatedTask });
    } catch (error) {
        console.error("Error in updateTask:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


//@desc delete a task (admin only)
//@route DELETE /api/tasks/:id
//@access PRIVATE (admin)

const deleteTask=async(req,res)=>{
try{
    const task=await Task.findById(req.params.id);
    if(!task) return res.status(404).json({message:"Task not found"});

    await task.deleteOne();
    res.json({message:"Task deleted Successfully"});
    }catch(error){
        res.status(500).json({message:"Server Error ",error:error.message});
    }
}

//@desc Update task status 
//@route PUT /api/tasks/:id/status
//@access PRIVATE 
const updateTaskStatus=async(req,res)=>{
try{
    const task=await Task.findById(req.params.id);
    if(!task) return res.status(404).json({message:"Task not found"});

    const isAssigned=task.assignedTo.some(
        (userId)=>userId.toString()===req.user._id.toString()
    );

    if(!isAssigned && req.user.role !=="admin"){
        return res.status(403).json({message:"Not authorized"});
    }

    task.status =req.body.status||task.status;

    if(task.status==="Completed"){
        task.todoChecklist.forEach((item)=>(item.completed=true));
        task.progress=100;
    }
    await task.save();
    res.json({message:"Task status updated",task})

    }catch(error){
        res.status(500).json({message:"Server Error ",error:error.message});
    }
}

//@desc update task checklist
//@route PUT /api/tasks/:id/todo
//@access PRIVATE
const updateTaskChecklist = async (req, res) => {
    try {
        let { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not Found" });

        // Authorization check
        const isAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());
        if (!isAssigned && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorised to update the checklist" });
        }

        // 3. FIXED: Sanitize the incoming checklist to prevent crashes
        if (todoChecklist) {
            todoChecklist = todoChecklist.map(item => {
                if (item._id && !mongoose.Types.ObjectId.isValid(item._id)) {
                    return { text: item.text, completed: item.completed };
                }
                return item;
            });
        }
        
        task.todoChecklist = todoChecklist;

        // Progress calculation
        const completedCount = task.todoChecklist.filter((item) => item.completed).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

        // Status update logic
        if (task.progress === 100) {
            task.status = "Completed";
        } else if (task.progress > 0) {
            task.status = "In Progress";
        } else {
            task.status = "Pending";
        }

        await task.save();

        const updatedTask = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email profileImageUrl')
            .populate('project', 'name')
            .populate('remarks.madeBy', 'name email profileImageUrl');

        res.json({ message: "Task checklist updated", task: updatedTask });

    } catch (error) {
        console.error("Error in updateTaskChecklist:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

//@desc Dashboard data (admin only)
//@route GET /api/tasks/dashbaord-data
//@access PRIVATE

const getDashboardData = async (req, res) => {
    try {
        const { projectId } = req.query;

        // 1. Create a reusable base filter for all queries
        const baseFilter = {};
        if (projectId) {
            baseFilter.project = new mongoose.Types.ObjectId(projectId);
        }
        // Secure the data: Non-admins only see stats for their own tasks
        if (req.user.role !== 'admin') {
            baseFilter.assignedTo = req.user._id;
        }

        // 2. Use a single powerful aggregation to get most stats at once
        const mainStatsPromise = Task.aggregate([
            { $match: baseFilter },
            {
                $facet: {
                    // Facet 1: Calculate task distribution by status
                    taskDistribution: [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ],
                    // Facet 2: Calculate task distribution by priority
                    taskPriorityLevels: [
                        { $group: { _id: "$priority", count: { $sum: 1 } } }
                    ],
                    // Facet 3: Calculate overdue tasks
                    overdueTasks: [
                        { $match: { dueDate: { $lt: new Date() }, status: { $ne: "Completed" } } },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        // 3. Get the 10 most recent tasks using the same filter
        const recentTasksPromise = Task.find(baseFilter)
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('project', 'name')
            .populate('assignedTo', 'name');

        // 4. Calculate total hours worked
        const calculateTotalHours = async () => {
            const relevantTasks = await Task.find(baseFilter).select('_id');
            const taskIds = relevantTasks.map(t => t._id);
            if (taskIds.length === 0) return 0;

            const timeLogStats = await TimeLog.aggregate([
                { $match: { task: { $in: taskIds } } },
                { $group: { _id: null, totalMilliseconds: { $sum: "$duration" } } }
            ]);
            if (timeLogStats.length === 0) return 0;
            return timeLogStats[0].totalMilliseconds / (1000 * 60 * 60);
        };
        const totalHoursPromise = calculateTotalHours();

        // Run all promises in parallel
        const [mainResults, recentTasks, totalHours] = await Promise.all([
            mainStatsPromise,
            recentTasksPromise,
            totalHoursPromise
        ]);
        
        // 5. Format the results into the exact structure your frontend expects
        const formatResults = (dataArray) => {
            const result = {};
            dataArray.forEach(item => {
                const key = item._id.replace(/\s+/g, ''); // "In Progress" -> "InProgress"
                result[key] = item.count;
            });
            return result;
        };

        const taskDistribution = formatResults(mainResults[0].taskDistribution);
        const taskPriorityLevels = formatResults(mainResults[0].taskPriorityLevels);
        
        const totalTasks = mainResults[0].taskDistribution.reduce((sum, item) => sum + item.count, 0);
        taskDistribution["All"] = totalTasks;

        const statistics = {
            totalTasks: totalTasks,
            pendingTasks: taskDistribution.Pending || 0,
            completedTasks: taskDistribution.Completed || 0,
            inProgressTasks: taskDistribution.InProgress || 0, // Added this for consistency
            overdueTasks: mainResults[0].overdueTasks[0]?.count || 0,
        };

        res.status(200).json({
            statistics,
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
            totalHours: totalHours.toFixed(2), // Add the new total hours stat
        });

    } catch (error) {
        console.error("Dashboard data fetching error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

//@desc Dashboard data (UserSpecific)
//@route GET /api/tasks/user-dashbaord-data
//@access PRIVATE
const getUserDashboardData=async(req,res)=>{
try{
    const userId=req.user._id; //only fetch data for logged in user

    //Fetch satistics for user specific tasks
    const totalTasks=await Task.countDocuments({assignedTo:userId});
    const pendingTasks=await Task.countDocuments({assignedTo:userId,status:"Pending"});
    const completedTasks=await Task.countDocuments({assignedTo:userId,status:"Completed"});
    const overdueTasks=await Task.countDocuments({
        assignedTo:userId,
        status:{$ne:"Completed"},
        dueDate:{$lt:new Date()},
    });

    //Task Distribution by Status 
    const taskStatuses=["Pending","In Progress","Completed"];
    const taskDistributionRaw=await Task.aggregate([
        {$match:{assignedTo:userId}},
        {$group:{_id:"$status",count:{$sum:1}}},
    ]);

    const taskDistribution=taskStatuses.reduce((acc,status)=>{
        const formattedKey=status.replace(/\s+/g,"");
        acc[formattedKey]=
            taskDistributionRaw.find((item)=>item._id===status)?.count||0;
        return acc;
    },{});
    taskDistribution["All"]=totalTasks;

    //Task Distribution by Priority
    const taskPriorities=["Low","Medium","High"];
    const taskPriorityLevelsRaw=await Task.aggregate([
        {$match:{assignedTo:userId}},
        {$group:{_id:"$priority",count:{$sum:1}}},
    ]);

    const taskPriorityLevels=taskPriorities.reduce((acc,priority)=>{
        acc[priority]=
            taskPriorityLevelsRaw.find((item)=>item._id===priority)?.count||0;
        return acc;
    },{});

    //Fetch recent 10 tasks
    const recentTasks=await Task.find({assignedTo:userId})
        .sort({createdAt:-1})
        .limit(10)
        .select("title status priority dueDate createdAt");

    res.status(200).json({
        statistics:{
            totalTasks,
            pendingTasks,
            completedTasks,
            overdueTasks,
        },
        charts:{
            taskDistribution,
            taskPriorityLevels,
        },
        recentTasks,
    });
    }catch(error){
        res.status(500).json({message:"Server Error ",error:error.message});
    }
}

/**
 * @desc    Add a comment to a task
 * @route   POST /api/tasks/:id/comments
 * @access  Private (Assigned User or Admin)
 */
const addCommentToTask = async (req, res) => {
    try {
        const { text } = req.body;
        const taskId = req.params.id; // 👈 1. Define taskId here
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: "Comment text cannot be empty." });
        }

        const task = await Task.findById(taskId); // 👈 2. Use taskId
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const isAdmin = req.user.role === 'admin';
        const isAssigned = task.assignedTo.some(id => id.toString() === req.user._id.toString());

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ message: "Not authorized to comment on this task." });
        }

        const newComment = {
            text: text,
            madeBy: req.user._id,
        };

        task.comments.push(newComment);
        await task.save();

        const { io, userSocketMap } = req;
        const populatedComment = task.comments[task.comments.length - 1];
        await Task.populate(populatedComment, { path: 'madeBy', select: 'name profileImageUrl' });

        const assignedUserIds = task.assignedTo.map(id => id.toString());

        assignedUserIds.forEach(userId => {
            if (userId !== req.user._id.toString()) {
                const socketId = userSocketMap[userId];
                if (socketId) {
                    io.to(socketId).emit('new_comment', { 
                        taskId: taskId, // 👈 3. Use taskId
                        comment: populatedComment 
                    });
                }
            }
        });

        const populatedTask = await Task.findById(taskId).populate('comments.madeBy', 'name profileImageUrl'); // 👈 4. Use taskId
        res.status(201).json(populatedTask);

    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports={
    getTasks,
    getTasksForSpecificUser,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData,
    addRemarkToTask,
    startTimer,
    stopTimer,
    getActiveTimer,
    getTaskTimeLogs,
    getUserBoardData,
    addCommentToTask,
};