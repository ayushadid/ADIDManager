const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, required: true },
});

const remarkSchema = new mongoose.Schema({
    text: { type: String, required: true },
    madeBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    madeBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // --- START: New Fields for Gantt Chart & Dependencies ---

    // The planned start date of the task.
    startDate: {
        type: Date,
    },
    // The planned end date of the task. Your existing dueDate is perfect for this.
    dueDate: {
        type: Date,
        required: true
    },
    // The estimated effort required for the task, in hours.
    estimatedHours: {
        type: Number,
        default: 0,
    },
    // An array of other Task IDs that must be completed before this one can start.
    dependencies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],

    // --- END: New Fields ---

    attachments: [{ type: String }],
    todoChecklist: [todoSchema],
    progress: { type: Number, default: 0 },
    remarks: [remarkSchema],
    comments: [commentSchema],
}, { timestamps: true });


module.exports = mongoose.model("Task", TaskSchema);